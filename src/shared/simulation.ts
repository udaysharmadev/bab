import RAPIER from '@dimforge/rapier3d-compat';
import { hullVertices } from './hull';
import {paddleShaftContact,paddleBladeContact} from './paddle-contact';
import {paddleBladeRotation} from './paddle-blade';
import {bedMesh,bedHeight,bedDragScale} from './bathymetry';
import { DT, SEATS, paddleHandle, clamp, rotate, localToWorld, type Intent, type Blade, type Vec3, type RowAction } from './protocol';
import { CHECKPOINTS, PYLONS, ROCKS, SPIKES, SWEEPERS, WATERWHEEL, WATERWHEEL2, sampleWaterwheel, sampleWaterwheel2, FINISH_Z, channelHalfWidth, bladeReaction, sampleSweeper, sampleWater, bankVertices, channelCenter, channelSlope } from './world';

let physicsReady: Promise<void> | undefined;
export const initPhysics = () => physicsReady ??= RAPIER.init();

type Paddle = {
  intent: Intent; age: number; x: number; z: number; dip: number;
  vx: number; vz: number; active: boolean; caught: boolean;
  row?: RowAction;
};

export type BuoyancySamples = 16 | 20 | 24;
const BUOYANCY_ROWS: Record<BuoyancySamples, readonly number[]> = {
  16: [-1.55, -0.52, 0.52, 1.55],
  20: [-1.55, -0.8, 0, 0.8, 1.55],
  24: [-1.55, -0.93, -0.31, 0.31, 0.93, 1.55],
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
  capsizeTicks = 0;
  capsizeUprightTicks = 0;
  rightedId = 0;
  groundedTicks = 0;
  maxSpeed = 0;

  get capsize(){
    if(!this.capsizeTicks||this.condition!=='afloat')return undefined;
    const active=this.paddles.filter(p=>p.active),helpers=active.filter(p=>p.age<.25&&p.row?.forward===-1&&p.row.turn===0).length;
    return {helpers,needed:Math.floor(active.length/2)+1,seconds:Math.max(0,Math.ceil(15-this.capsizeTicks*DT))};
  }

  constructor(readonly calm = false, readonly buoyancySamples: BuoyancySamples = 20, readonly hazardPhase = 0) {
    this.world.timestep = DT;
    this.hull = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0.08, 0).setLinearDamping(0.04).setAngularDamping(0.25).setCcdEnabled(true));
    const shell = RAPIER.ColliderDesc.convexHull(hullVertices());
    if (!shell) throw new Error('Invalid structural hull outline');
    // Loaded boat + crew, rather than a uniform solid wooden volume. Preserve
    // the established centre/inertia so the collision upgrade does not retune rowing.
    const mass=260;
    this.hullCollider = this.world.createCollider(shell
      .setMassProperties(mass,{x:0,y:0,z:0},{x:mass*(.5**2+3.8**2)/12,y:mass*(1.8**2+3.8**2)/12,z:mass*(1.8**2+.5**2)/12},{x:0,y:0,z:0,w:1})
      .setFriction(0.25).setRestitution(0.05).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), this.hull);
    // The same continuous five-metre bank faces are used by the visible cliffs.
    for (let z = -20; z < FINISH_Z + 25; z += 5) {
      for (const side of [-1, 1]) {
        const bank=RAPIER.ColliderDesc.convexHull(bankVertices(z,side));
        if(!bank)throw new Error('Invalid river bank segment');
        this.world.createCollider(bank);
      }
    }
    for (const z of [-19, FINISH_Z + 21]) this.world.createCollider(RAPIER.ColliderDesc.cuboid(15, 3, 1).setTranslation(0, 0, z));
    for(let start=-30;start<FINISH_Z+30;start+=60){
      const bed=bedMesh(start);
      this.world.createCollider(RAPIER.ColliderDesc.trimesh(bed.vertices,bed.indices,RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES)
        .setFriction(.65).setRestitution(0));
    }
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
      const log = sampleSweeper(hazardPhase, spec);
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(log.x, log.y, log.z));
      const collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(spec.halfLength, spec.radius)
        .setRotation({ x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 }).setFriction(0.6), body);
      this.hazards.set(collider.handle, spec.id);
      this.sweepers.push(body);
    }
    this.sweeper = this.sweepers[0]!;
    const wheel=WATERWHEEL;
    this.wheel=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(wheel.x,wheel.y,wheel.z).setRotation(sampleWaterwheel(hazardPhase)));
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
    this.wheel2=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(wheel2.x,wheel2.y,wheel2.z).setRotation(sampleWaterwheel2(hazardPhase)));
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
    const moverTime=(this.tick+1)*DT+this.hazardPhase;
    this.sweepers.forEach((body, i) => body.setNextKinematicTranslation(sampleSweeper(moverTime, SWEEPERS[i]!)));
    this.wheel.setNextKinematicRotation(sampleWaterwheel(moverTime));
    this.wheel2.setNextKinematicRotation(sampleWaterwheel2(moverTime));
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
    // Normalize total lift/drag so a sample-count experiment changes spatial
    // resolution, not the boat's displacement. Twenty remains the live default.
    const sampleWeight = 20 / this.buoyancySamples;
    for (const x of [-0.72, -0.24, 0.24, 0.72]) for (const z of BUOYANCY_ROWS[this.buoyancySamples]) {
      const point = localToWorld({ x, y: -0.25, z }, position, rotation);
      const water = sampleWater(point.x, point.z, this.tick * DT, this.calm);
      const depth = clamp(water.height - point.y, 0, 0.65);
      if (depth <= 0) continue;
      const velocity = body.velocityAtPoint(point);
      const wet = clamp(depth / 0.18, 0, 1);
      const localVelocity = rotate({ x: velocity.x - water.velocity.x, y: 0, z: velocity.z - water.velocity.z },
        { x: -rotation.x, y: -rotation.y, z: -rotation.z, w: rotation.w });
      const shallow=bedDragScale(point.y-bedHeight(point.x,point.z));
      const drag = rotate({ x: -localVelocity.x * 22 * wet * shallow, y: 0, z: -localVelocity.z * 3 * wet * shallow }, rotation);
      body.addForceAtPoint({
        x: drag.x * sampleWeight,
        y: clamp(650 * depth - 38 * (velocity.y - water.velocity.y), 0, 700) * sampleWeight,
        z: drag.z * sampleWeight,
      }, point, true);
    }

    const rescue=this.capsize;
    if(rescue&&rescue.helpers>=rescue.needed){
      const up=rotate({x:0,y:1,z:0},rotation),forward=rotate({x:0,y:0,z:1},rotation),angular=body.angvel();
      let x=-up.z,z=up.x,length=Math.hypot(x,z);
      if(length<.001){x=forward.x;z=forward.z;length=Math.hypot(x,z);if(length<.001){x=0;z=1;length=1;}}
      // Explicit cooperative gameplay assist, not an uncapped angular impulse.
      const effort=Math.min(2400,Math.acos(clamp(up.y,-1,1))*1600);
      let tx=x/length*effort-angular.x*400,tz=z/length*effort-angular.z*400;
      const scale=Math.min(1,2400/(Math.hypot(tx,tz)||1));tx*=scale;tz*=scale;
      body.addTorque({x:tx,y:0,z:tz},true);
    }

    this.paddles.forEach((p, i) => {
      p.age += DT;
      const old = this.bladeLocal(i);
      const live = !rescue && p.active && p.age < 0.25;
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
      const immersion = p.active&&!rescue ? clamp((water.height - point.y) / 0.23, 0, 1) : 0;
      const relativeBlade = rotate({ x: (local.x - old.x) / DT, y: 0, z: (local.z - old.z) / DT }, rotation);
      const velocity = body.velocityAtPoint(point);
      const relative = { x: velocity.x + relativeBlade.x - water.velocity.x, y: 0, z: velocity.z + relativeBlade.z - water.velocity.z };
      const inverseRotation = { x: -rotation.x, y: -rotation.y, z: -rotation.z, w: rotation.w };
      const force = rotate(bladeReaction(rotate(relative, inverseRotation), immersion), rotation);
      let state: Blade['state'] = !p.active ? 'DISABLED' : immersion > 0 ? 'WATER' : 'AIR';

      // Actual rounded blade and shaft volume can brace even at rest.
      // A moving solid contributes its own point velocity.
      let applicationPoint=point;
      if(p.active&&!rescue&&p.dip>.25){
        const handle=localToWorld(paddleHandle(i),position,rotation);
        const shaft=paddleShaftContact(this.world,body,handle,point);
        const blade=!shaft?paddleBladeContact(this.world,body,point,paddleBladeRotation(i,local,rotation),oldPoint):undefined;
        const normal=shaft?.contact.normal1??blade?.normal;
        const collider=shaft?.collider??blade?.collider;
        if(normal&&collider){
          applicationPoint=shaft?.contact.point2??blade!.point;
          const shaftLength2=(point.x-handle.x)**2+(point.y-handle.y)**2+(point.z-handle.z)**2;
          const fraction=shaft?clamp(((applicationPoint.x-handle.x)*(point.x-handle.x)
            +(applicationPoint.y-handle.y)*(point.y-handle.y)+(applicationPoint.z-handle.z)*(point.z-handle.z))/shaftLength2,0,1):1;
          const solidVelocity=collider.parent()?.velocityAtPoint(applicationPoint)??{x:0,y:0,z:0};
          const hullVelocity=body.velocityAtPoint(applicationPoint);
          const relativeX=hullVelocity.x+relativeBlade.x*fraction-solidVelocity.x;
          const relativeZ=hullVelocity.z+relativeBlade.z*fraction-solidVelocity.z;
          const inward=Math.max(0,-(relativeX*normal.x+relativeZ*normal.z));
          const magnitude=Math.min(260,inward*120);
          force.x=normal.x*magnitude;force.y=0;force.z=normal.z*magnitude;
          // A blade can push off the actual riverbed. Bounded tangential drag
          // opposes slip; a stationary paddle never supplies free propulsion.
          if(collider.shape.type===RAPIER.ShapeType.TriMesh){
            force.x-=relativeX*120*normal.y**2;force.z-=relativeZ*120*normal.y**2;
            const scale=Math.min(1,260/(Math.hypot(force.x,force.z)||1));force.x*=scale;force.z*=scale;
          }
          state='BRACE';
        }
      }
      const magnitude = Math.hypot(force.x, force.z);
      if (p.active) {
        // Straight-rowing assist: W/S from any seat drives through the centre
        // of mass, without accidental single-sided yaw. Deliberate turns and
        // solid bracing retain the real blade lever and all force caps.
        if (p.row && p.row.turn === 0 && state !== 'BRACE') body.addForce(force, true);
        else body.addForceAtPoint(force, applicationPoint, true);
      }
      const caught = immersion > 0.2 && Math.hypot(relativeBlade.x, relativeBlade.z) > 0.4 && magnitude > 25;
      if (caught && !p.caught) this.strokes[i] = (this.strokes[i] ?? 0) + 1;
      p.caught = caught;
      this.blades[i] = { ...local, immersion, force: magnitude, state };
    });

    this.world.step(this.events);
    this.tick++;
    this.events.drainCollisionEvents(() => {});
    // Rapier starts contact pairs inside its prediction distance, before the
    // surfaces touch. Inspect manifolds each tick: a started-event-only check
    // both kills near misses and misses later actual contact if filtered once.
    this.world.contactPairsWith(this.hullCollider, collider => {
      const hazard=this.hazards.get(collider.handle);
      if (!hazard || this.condition !== 'afloat') return;
      this.world.contactPair(this.hullCollider,collider,manifold=>{
        for(let i=0;i<manifold.numContacts();i++)if(manifold.contactDist(i)<=.001){this.breakBoat(hazard);break;}
      });
    });
    if (this.condition !== 'afloat') return;
    const pos = body.translation();
    const up = rotate({ x: 0, y: 1, z: 0 }, body.rotation());
    this.inversionTicks = up.y < 0.15 ? this.inversionTicks + 1 : Math.max(0, this.inversionTicks - 2);
    if(!this.capsizeTicks&&this.inversionTicks>30){this.capsizeTicks=1;this.capsizeUprightTicks=0;this.releaseInputs();}
    else if(this.capsizeTicks){
      this.capsizeTicks++;
      this.capsizeUprightTicks=up.y>.85?this.capsizeUprightTicks+1:0;
      if(this.capsizeUprightTicks>=30){
        this.capsizeTicks=0;this.capsizeUprightTicks=0;this.inversionTicks=0;this.rightedId++;this.releaseInputs();
      }else if(this.capsizeTicks>=900){this.recover('capsized');return;}
    }
    const speed = Math.hypot(body.linvel().x, body.linvel().y, body.linvel().z);
    // A sideways hull can be pinned with its centre far from the channel edge.
    // Require actual nonlethal contact, sustained input and no headway; mere
    // proximity to a bank, ordinary bracing and coasting are not groundings.
    const horizontalSpeed = Math.hypot(body.linvel().x, body.linvel().z);
    const rowing = this.paddles.some(p => p.active && p.age < 0.25 && (p.row ? p.row.forward !== 0 || p.row.turn !== 0 : Math.abs(p.intent.x) > 0.35 || Math.abs(p.intent.z) > 0.4));
    let groundedContact = false;
    if (rowing && horizontalSpeed < 0.08) this.world.contactPairsWith(this.hullCollider, collider => {
      if (this.hazards.has(collider.handle)) return;
      this.world.contactPair(this.hullCollider, collider, manifold => {
        for (let i = 0; i < manifold.numContacts(); i++) {
          if (manifold.contactDist(i) <= 0.025) groundedContact = true;
        }
      });
    });
    this.groundedTicks = groundedContact&&!this.capsizeTicks
      ? this.groundedTicks + 1
      : Math.max(0, this.groundedTicks - 3);
    this.maxSpeed = Math.max(this.maxSpeed, speed);
    if (![pos.x, pos.y, pos.z, speed].every(Number.isFinite) || pos.y < -3) { this.recover('unstable'); return; }
    if (this.groundedTicks > 240) { this.recover('grounded'); return; }
    if(this.capsizeTicks)return;
    const next = CHECKPOINTS[this.checkpoint + 1];
    if (next !== undefined && pos.z >= next && Math.abs(pos.x-channelCenter(pos.z)) < channelHalfWidth(pos.z) - 1.5) { this.checkpoint++; this.revision++; }
    this.complete = pos.z >= FINISH_Z && Math.abs(pos.x-channelCenter(pos.z)) < channelHalfWidth(FINISH_Z) - 1.5;
  }

  reset(start = false) {
    this.condition = 'afloat'; this.wreckTicks = 0; this.obstacleId = null; this.complete = false;
    if (start) { this.checkpoint = 0; this.complete = false; this.revision = 0; }
    const station=CHECKPOINTS[this.checkpoint] ?? 0,yaw=Math.atan(channelSlope(station));
    this.hull.setTranslation({ x: channelCenter(station), y: 0.08, z: station }, true);
    this.hull.setRotation({ x: 0, y: Math.sin(yaw/2), z: 0, w: Math.cos(yaw/2) }, true);
    this.hull.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.hull.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.hull.resetForces(true);
    this.hull.resetTorques(true);
    this.inversionTicks = 0;
    this.capsizeTicks = 0;this.capsizeUprightTicks=0;
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
