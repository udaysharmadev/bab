import RAPIER from '@dimforge/rapier3d-compat';
import { DT, SEATS, clamp, rotate, localToWorld, type Intent, type Blade, type Vec3, type RowAction } from './protocol';
import { CHECKPOINTS, PYLONS, ROCKS, SPIKES, SWEEPERS, WATERWHEEL, WATERWHEEL2, sampleWaterwheel, sampleWaterwheel2, FINISH_Z, channelHalfWidth, bladeReaction, sampleSweeper, sampleWater } from './world';

let physicsReady: Promise<void> | undefined;
export const initPhysics = () => physicsReady ??= RAPIER.init();

type Paddle = {
  intent: Intent; age: number; x: number; z: number; dip: number;
  vx: number; vz: number; active: boolean; caught: boolean;
  row?: RowAction;
};

export class BoatSimulation {
  readonly world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  readonly hull: RAPIER.RigidBody;
  readonly hullCollider: RAPIER.Collider;
  readonly sweeper: RAPIER.RigidBody;
  readonly sweepers: RAPIER.RigidBody[] = [];
  readonly wheel: RAPIER.RigidBody;
  readonly wheel2: RAPIER.RigidBody;
  readonly events = new RAPIER.EventQueue(true);
  readonly hazards = new Map<number, string>();
  condition: 'afloat' | 'breaking' | 'sunk' = 'afloat';
  wreckTicks = 0;
  crashId = 0;
  obstacleId: string | null = null;
  readonly paddles: Paddle[] = SEATS.map(() => ({
    intent: { seq: 0, x: 0, z: 0, dip: 0 }, age: 999,
    x: 0, z: 0, dip: 0, vx: 0, vz: 0, active: false, caught: false,
  }));
  blades: Blade[] = [];
  strokes = [0, 0, 0, 0];
  tick = 0;
  checkpoint = 0;
  revision = 0;
  resetId = 0;
  recoveryId = 0;
  recoveryReason: 'none' | 'grounded' | 'capsized' | 'unstable' = 'none';
  complete = false;
  inversionTicks = 0;
  groundedTicks = 0;
  maxSpeed = 0;

  constructor(readonly calm = false) {
    this.world.timestep = DT;
    this.hull = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0.08, 0).setLinearDamping(0.04).setAngularDamping(0.25).setCcdEnabled(true));
    this.hullCollider = this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.9, 0.25, 1.9)
      .setMass(260).setFriction(0.25).setRestitution(0.05).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), this.hull);
    // Five-metre conservative bank pieces use the same width sampler as rendering.
    // Adjacent pieces share their end faces; banks remain braceable/nonlethal.
    for (let z = -20; z < FINISH_Z + 25; z += 5) {
      const width = Math.min(channelHalfWidth(z), channelHalfWidth(z + 2.5), channelHalfWidth(z + 5));
      for (const side of [-1, 1]) this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.5, 3, 2.5)
        .setTranslation(side * (width + 1.5), 0, z + 2.5));
    }
    for (const z of [-19, FINISH_Z + 21]) this.world.createCollider(RAPIER.ColliderDesc.cuboid(15, 3, 1).setTranslation(0, 0, z));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(15, 0.2, (FINISH_Z + 50) / 2)
      .setTranslation(0, -2, (FINISH_Z + 10) / 2));
    PYLONS.forEach((p, i) => {
      const collider = this.world.createCollider(RAPIER.ColliderDesc.cylinder(1.4, 0.27)
        .setTranslation(p.x, 0, p.z).setFriction(0.3));
      this.hazards.set(collider.handle, `piling-${i + 1}`);
    });
    for (const rock of ROCKS) {
      const collider = this.world.createCollider(RAPIER.ColliderDesc.ball(rock.radius).setTranslation(rock.x, -0.05, rock.z));
      this.hazards.set(collider.handle, rock.id);
    }
    for (const spike of SPIKES) {
      const collider = this.world.createCollider(RAPIER.ColliderDesc.cone(spike.height / 2, spike.radius)
        .setTranslation(spike.x, spike.height / 2 - 0.35, spike.z).setFriction(0.45));
      this.hazards.set(collider.handle, spike.id);
    }
    for (const spec of SWEEPERS) {
      const log = sampleSweeper(0, spec);
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(log.x, log.y, log.z));
      const collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(spec.halfLength, spec.radius)
        .setRotation({ x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 }).setFriction(0.6), body);
      this.hazards.set(collider.handle, spec.id);
      this.sweepers.push(body);
    }
    this.sweeper = this.sweepers[0]!;
    const wheel=WATERWHEEL;
    this.wheel=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(wheel.x,wheel.y,wheel.z).setRotation(sampleWaterwheel(0)));
    const wheelCollider=(shape:RAPIER.ColliderDesc)=>{const collider=this.world.createCollider(shape.setFriction(.45),this.wheel);this.hazards.set(collider.handle,wheel.id);};
    for(let i=0;i<wheel.blades;i++){
      const angle=i*Math.PI*2/wheel.blades,q={x:Math.sin(angle/2),y:0,z:0,w:Math.cos(angle/2)};
      wheelCollider(RAPIER.ColliderDesc.cuboid(wheel.halfWidth,.15,.35).setTranslation(0,Math.cos(angle)*wheel.radius,Math.sin(angle)*wheel.radius).setRotation(q));
      for(const side of [-1,1])wheelCollider(RAPIER.ColliderDesc.capsule((wheel.radius-.25)/2,.065).setTranslation(side*wheel.halfWidth,Math.cos(angle)*(wheel.radius+.25)/2,Math.sin(angle)*(wheel.radius+.25)/2).setRotation(q));
    }
    for(const side of [-1,1])for(let i=0;i<24;i++){
      const mid=(i+.5)*Math.PI*2/24,half=wheel.radius*Math.sin(Math.PI/24),angle=mid+Math.PI/2;
      wheelCollider(RAPIER.ColliderDesc.capsule(half,.08).setTranslation(side*wheel.halfWidth,Math.cos(mid)*wheel.radius*Math.cos(Math.PI/24),Math.sin(mid)*wheel.radius*Math.cos(Math.PI/24)).setRotation({x:Math.sin(angle/2),y:0,z:0,w:Math.cos(angle/2)}));
    }
    // WATERWHEEL2: Devil's Staircase waterwheel — identical structure at new position.
    const wheel2=WATERWHEEL2;
    this.wheel2=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(wheel2.x,wheel2.y,wheel2.z).setRotation(sampleWaterwheel2(0)));
    const wheel2Collider=(shape:RAPIER.ColliderDesc)=>{const collider=this.world.createCollider(shape.setFriction(.45),this.wheel2);this.hazards.set(collider.handle,wheel2.id);};
    for(let i=0;i<wheel2.blades;i++){
      const angle=i*Math.PI*2/wheel2.blades,q={x:Math.sin(angle/2),y:0,z:0,w:Math.cos(angle/2)};
      wheel2Collider(RAPIER.ColliderDesc.cuboid(wheel2.halfWidth,.15,.35).setTranslation(0,Math.cos(angle)*wheel2.radius,Math.sin(angle)*wheel2.radius).setRotation(q));
      for(const side of [-1,1])wheel2Collider(RAPIER.ColliderDesc.capsule((wheel2.radius-.25)/2,.065).setTranslation(side*wheel2.halfWidth,Math.cos(angle)*(wheel2.radius+.25)/2,Math.sin(angle)*(wheel2.radius+.25)/2).setRotation(q));
    }
    for(const side of [-1,1])for(let i=0;i<24;i++){
      const mid=(i+.5)*Math.PI*2/24,half=wheel2.radius*Math.sin(Math.PI/24),angle=mid+Math.PI/2;
      wheel2Collider(RAPIER.ColliderDesc.capsule(half,.08).setTranslation(side*wheel2.halfWidth,Math.cos(mid)*wheel2.radius*Math.cos(Math.PI/24),Math.sin(mid)*wheel2.radius*Math.cos(Math.PI/24)).setRotation({x:Math.sin(angle/2),y:0,z:0,w:Math.cos(angle/2)}));
    }
    this.updateBlades();
  }

  setActive(seat: number, active: boolean) {
    const p = this.paddles[seat];
    if (!p) return;
    p.active = active;
    if (!active) { p.intent.dip = 0; p.dip = 0; p.vx = 0; p.vz = 0; p.age = 999; }
    this.updateBlades();
  }

  accept(seat: number, intent: Intent, row?: RowAction) {
    const p = this.paddles[seat];
    if (p?.active && this.condition === 'afloat') { p.intent = { ...intent }; p.row = row; p.age = 0; }
  }

  releaseInputs() {
    for (const p of this.paddles) { p.intent.dip = 0; p.dip = 0; p.age = 999; p.vx = 0; p.vz = 0; p.caught = false; p.row = undefined; }
    this.updateBlades();
  }

  bladeLocal(seat: number): Vec3 {
    const p = this.paddles[seat]!;
    const s = SEATS[seat]!;
    return { x: s.side * (1.45 + p.x * 0.35), y: 0.62 - p.dip * 1.05, z: s.z + p.z * 1.1 };
  }

  updateBlades() {
    this.blades = this.paddles.map((p, i) => {
      const local = this.bladeLocal(i);
      const point = localToWorld(local, this.hull.translation(), this.hull.rotation());
      const water = sampleWater(point.x, point.z, this.tick * DT, this.calm);
      const enabled = p.active && this.condition === 'afloat';
      const immersion = enabled ? clamp((water.height - point.y) / 0.23, 0, 1) : 0;
      return { ...local, immersion, force: 0, state: !enabled ? 'DISABLED' : immersion > 0 ? 'WATER' : 'AIR' };
    });
  }

  step() {
    const body = this.hull;
    // Kinematic motion feeds Rapier's contact solver, including while a wreck
    // sinks. No wall-clock drift, client commands or synthetic hull force.
    this.sweepers.forEach((body, i) => body.setNextKinematicTranslation(sampleSweeper((this.tick + 1) * DT, SWEEPERS[i]!)));
    this.wheel.setNextKinematicRotation(sampleWaterwheel((this.tick+1)*DT));
    this.wheel2.setNextKinematicRotation(sampleWaterwheel2((this.tick+1)*DT));
    if (this.condition !== 'afloat') {
      body.resetForces(true); body.resetTorques(true);
      // Flooded hull loses buoyancy. Gravity sinks the authoritative body.
      this.world.step(this.events);
      this.events.drainCollisionEvents(() => {});
      this.wreckTicks++; this.tick++;
      if (this.wreckTicks >= 150) this.condition = 'sunk';
      this.updateBlades();
      return;
    }
    const position = body.translation();
    const rotation = body.rotation();
    body.resetForces(true);
    body.resetTorques(true);
    // Twenty spring/drag samples produce pitch/roll restoration through lever
    // arms. No orientation lock, steering torque or always-upright correction.
    for (const x of [-0.72, -0.24, 0.24, 0.72]) for (const z of [-1.55, -0.8, 0, 0.8, 1.55]) {
      const point = localToWorld({ x, y: -0.25, z }, position, rotation);
      const water = sampleWater(point.x, point.z, this.tick * DT, this.calm);
      const depth = clamp(water.height - point.y, 0, 0.65);
      if (depth <= 0) continue;
      const velocity = body.velocityAtPoint(point);
      const wet = clamp(depth / 0.18, 0, 1);
      const localVelocity = rotate({ x: velocity.x - water.velocity.x, y: 0, z: velocity.z - water.velocity.z },
        { x: -rotation.x, y: -rotation.y, z: -rotation.z, w: rotation.w });
      const drag = rotate({ x: -localVelocity.x * 22 * wet, y: 0, z: -localVelocity.z * 3 * wet }, rotation);
      body.addForceAtPoint({ x: drag.x, y: clamp(650 * depth - 38 * velocity.y, 0, 700), z: drag.z }, point, true);
    }

    this.paddles.forEach((p, i) => {
      p.age += DT;
      const old = this.bladeLocal(i);
      const live = p.active && p.age < 0.25;
      // Server bounds speed AND acceleration; packet frequency cannot add force.
      const targetVX = clamp(((live ? p.intent.x : p.x) - p.x) * 12, -3, 3);
      const targetVZ = clamp(((live ? p.intent.z : p.z) - p.z) * 12, -2.7, 2.7);
      p.vx += clamp(targetVX - p.vx, -16 * DT, 16 * DT);
      p.vz += clamp(targetVZ - p.vz, -16 * DT, 16 * DT);
      p.x = clamp(p.x + p.vx * DT, -1, 1);
      p.z = clamp(p.z + p.vz * DT, -1, 1);
      const dipTarget = live ? p.intent.dip : 0;
      p.dip += clamp(dipTarget - p.dip, -5 * DT, 5 * DT);
      const local = this.bladeLocal(i);
      const point = localToWorld(local, position, rotation);
      const oldPoint = localToWorld(old, position, rotation);
      const water = sampleWater(point.x, point.z, this.tick * DT, this.calm);
      const immersion = p.active ? clamp((water.height - point.y) / 0.23, 0, 1) : 0;
      const relativeBlade = rotate({ x: (local.x - old.x) / DT, y: 0, z: (local.z - old.z) / DT }, rotation);
      const velocity = body.velocityAtPoint(point);
      const relative = { x: velocity.x + relativeBlade.x - water.velocity.x, y: 0, z: velocity.z + relativeBlade.z - water.velocity.z };
      const inverseRotation = { x: -rotation.x, y: -rotation.y, z: -rotation.z, w: rotation.w };
      const force = rotate(bladeReaction(rotate(relative, inverseRotation), immersion), rotation);
      let state: Blade['state'] = !p.active ? 'DISABLED' : immersion > 0 ? 'WATER' : 'AIR';

      // Sweep the actual blade displacement against solids, excluding the hull.
      // Bounded contact reaction permits sideways pry; no vertical wall climbing.
      const travel = { x: point.x - oldPoint.x, y: point.y - oldPoint.y, z: point.z - oldPoint.z };
      const distance = Math.hypot(travel.x, travel.y, travel.z);
      if (p.active && p.dip > 0.25 && distance > 0.0001) {
        const ray = new RAPIER.Ray(oldPoint, { x: travel.x / distance, y: travel.y / distance, z: travel.z / distance });
        const hit = this.world.castRayAndGetNormal(ray, distance + 0.08, true, undefined, undefined, undefined, body);
        if (hit) {
          const inward = Math.max(0, -(relativeBlade.x * hit.normal.x + relativeBlade.z * hit.normal.z));
          const magnitude = Math.min(260, inward * 120);
          force.x = hit.normal.x * magnitude;
          force.y = 0;
          force.z = hit.normal.z * magnitude;
          state = 'BRACE';
        }
      }
      const magnitude = Math.hypot(force.x, force.z);
      if (p.active) {
        // Straight-rowing assist: W/S from any seat drives through the centre
        // of mass, without accidental single-sided yaw. Deliberate turns and
        // solid bracing retain the real blade lever and all force caps.
        if (p.row && p.row.turn === 0 && state !== 'BRACE') body.addForce(force, true);
        else body.addForceAtPoint(force, point, true);
      }
      const caught = immersion > 0.2 && Math.hypot(relativeBlade.x, relativeBlade.z) > 0.4 && magnitude > 25;
      if (caught && !p.caught) this.strokes[i] = (this.strokes[i] ?? 0) + 1;
      p.caught = caught;
      this.blades[i] = { ...local, immersion, force: magnitude, state };
    });

    this.world.step(this.events);
    this.tick++;
    this.events.drainCollisionEvents((a, b, started) => {
      if (!started || this.condition !== 'afloat') return;
      const other = a === this.hullCollider.handle ? b : b === this.hullCollider.handle ? a : undefined;
      const hazard = other === undefined ? undefined : this.hazards.get(other);
      if (hazard) this.breakBoat(hazard);
    });
    if (this.condition !== 'afloat') return;
    const pos = body.translation();
    const up = rotate({ x: 0, y: 1, z: 0 }, body.rotation());
    this.inversionTicks = up.y < 0.15 ? this.inversionTicks + 1 : Math.max(0, this.inversionTicks - 2);
    const speed = Math.hypot(body.linvel().x, body.linvel().y, body.linvel().z);
    // A player may brush or slide along a bank. A recovery is only armed when
    // a live rowing command has made no headway while the hull is actually at
    // the channel edge. This leaves ordinary bracing and coasting alone.
    const horizontalSpeed = Math.hypot(body.linvel().x, body.linvel().z);
    const rowing = this.paddles.some(p => p.active && p.age < 0.25 && (p.row ? p.row.forward !== 0 || p.row.turn !== 0 : Math.abs(p.intent.x) > 0.35 || Math.abs(p.intent.z) > 0.4));
    const atBank = Math.abs(pos.x) > channelHalfWidth(pos.z) - 1.2;
    this.groundedTicks = rowing && atBank && horizontalSpeed < 0.08
      ? this.groundedTicks + 1
      : Math.max(0, this.groundedTicks - 3);
    this.maxSpeed = Math.max(this.maxSpeed, speed);
    if (![pos.x, pos.y, pos.z, speed].every(Number.isFinite) || pos.y < -3) { this.recover('unstable'); return; }
    if (this.inversionTicks > 300) { this.recover('capsized'); return; }
    if (this.groundedTicks > 240) { this.recover('grounded'); return; }
    const next = CHECKPOINTS[this.checkpoint + 1];
    if (next !== undefined && pos.z >= next && Math.abs(pos.x) < channelHalfWidth(next) - 1.5) { this.checkpoint++; this.revision++; }
    this.complete = pos.z >= FINISH_Z && Math.abs(pos.x) < channelHalfWidth(FINISH_Z) - 1.5;
  }

  reset(start = false) {
    this.condition = 'afloat'; this.wreckTicks = 0; this.obstacleId = null; this.complete = false;
    if (start) { this.checkpoint = 0; this.complete = false; this.revision = 0; }
    this.hull.setTranslation({ x: 0, y: 0.08, z: CHECKPOINTS[this.checkpoint] ?? 0 }, true);
    this.hull.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.hull.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.hull.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.hull.resetForces(true);
    this.hull.resetTorques(true);
    this.inversionTicks = 0;
    this.groundedTicks = 0;
    this.resetId++;
    for (const p of this.paddles) {
      p.x = 0; p.z = 0; p.dip = 0; p.vx = 0; p.vz = 0; p.age = 999; p.caught = false;
      p.intent = { ...p.intent, x: 0, z: 0, dip: 0 };
      p.row = undefined;
    }
    this.updateBlades();
  }

  private recover(reason: Exclude<typeof this.recoveryReason, 'none'>) {
    // Recovery is deliberately server-owned and separate from a lethal crash.
    // It always returns the shared hull to the latest canonical checkpoint.
    this.recoveryId++;
    this.recoveryReason = reason;
    this.reset();
  }

  private breakBoat(obstacleId: string) {
    this.condition = 'breaking'; this.wreckTicks = 0; this.obstacleId = obstacleId; this.crashId++;
    this.hull.resetForces(true); this.hull.resetTorques(true);
    this.hull.setLinvel({ x: this.hull.linvel().x * 0.2, y: -0.45, z: this.hull.linvel().z * 0.2 }, true);
    this.hull.setAngvel({ x: 0.12, y: 0, z: 0.25 }, true);
    for (const paddle of this.paddles) { paddle.dip = 0; paddle.intent.dip = 0; paddle.age = 999; paddle.vx = 0; paddle.vz = 0; }
    this.updateBlades();
  }

  dispose() { this.events.free(); this.world.free(); }
}
