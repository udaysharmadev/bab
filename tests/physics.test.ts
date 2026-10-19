import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { BoatSimulation, initPhysics } from '../src/shared/simulation';
import { rotate, localToWorld, validateIntent, DT } from '../src/shared/protocol';
import { sampleWater, bladeReaction } from '../src/shared/world';

before(initPhysics);

function command(sim: BoatSimulation, seats: number[], z: number, dip: number, ticks: number, x = 0) {
  for (let t = 0; t < ticks; t++) {
    for (const seat of seats) sim.accept(seat, { seq: sim.tick + 1, x, z, dip });
    sim.step();
  }
}

function stroke(seats: number[], wet: boolean, yaw = 0) {
  const sim = new BoatSimulation(true);
  sim.hull.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true);
  for (const seat of seats) sim.setActive(seat, true);
  command(sim, seats, 1, 0, 180);
  command(sim, seats, 1, wet ? 1 : 0, 20);
  command(sim, seats, -1, wet ? 1 : 0, 50);
  const result = { position: { ...sim.hull.translation() }, linear: { ...sim.hull.linvel() }, angular: { ...sim.hull.angvel() }, maxSpeed: sim.maxSpeed };
  sim.dispose(); return result;
}

test('Input contract rejects NaN, stale/future sequence, teleport, spoofed seat and extra thrust', () => {
  assert(validateIntent({ seq: 1, x: 0, z: 0.5, dip: 1 }, 0));
  for (const value of [
    { seq: 1, x: NaN, z: 0, dip: 1 }, { seq: 1, x: 0, z: Infinity, dip: 1 },
    { seq: 1, x: 0, z: 3, dip: 1 }, { seq: 1, x: 0, z: 0, dip: -1 },
    { seq: 0, x: 0, z: 0, dip: 1 }, { seq: 10001, x: 0, z: 0, dip: 1 },
    { seq: 1, x: 0, z: 0, dip: 1, seat: 3 }, { seq: 1, x: 0, z: 0, dip: 1, thrust: 1000 },
  ]) assert.equal(validateIntent(value, 0), false);
});

test('Y-up transforms preserve lengths and +Z forward turns to +X at 90° yaw', () => {
  const q = { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 };
  const v = rotate({ x: 0, y: 0, z: 1 }, q);
  assert(Math.abs(v.x - 1) < 1e-12); assert(Math.abs(v.z) < 1e-12);
  assert.deepEqual(localToWorld({ x: 0, y: 0, z: 0 }, { x: 2, y: 3, z: 4 }, q), { x: 2, y: 3, z: 4 });
});

test('PHY-01/12: two simulated minutes at rest retain equilibrium and zero horizontal thrust', () => {
  const sim = new BoatSimulation(true);
  const costs: number[] = [];
  for (let i = 0; i < 7200; i++) {
    const start = performance.now(); sim.step(); costs.push(performance.now() - start);
  }
  const p = sim.hull.translation();
  assert(Math.abs(p.y) < 0.2, `equilibrium y=${p.y}`);
  assert(Math.hypot(p.x, p.z) < 0.001, `horizontal drift=${Math.hypot(p.x, p.z)}`);
  assert(sim.maxSpeed < 2, `unbounded idle speed=${sim.maxSpeed}`);
  costs.sort((a, b) => a - b);
  console.log(JSON.stringify({ case: 'idle-120s', y: p.y, speed: sim.maxSpeed, tickP95ms: costs[Math.floor(costs.length * 0.95)] }));
  sim.dispose();
});

test('PHY-02/03/04/06: immersed stroke moves hull, air has no thrust, four balanced strokes advance without yaw', () => {
  const air = stroke([0, 1, 2, 3], false);
  const wet = stroke([0, 1, 2, 3], true);
  assert(wet.position.z > 0.15, `wet distance=${wet.position.z}`);
  assert(Math.abs(air.position.z) <= wet.position.z * 0.05);
  assert(Math.abs(wet.angular.y) < 0.01, `balanced yaw=${wet.angular.y}`);
  const seats = [0, 1, 2, 3].map(seat => stroke([seat], true));
  assert(seats.every(s => s.position.z > 0.01), 'Every seat must produce forward motion');
  assert(seats[0]!.angular.y > 0 && seats[1]!.angular.y < 0);
  assert(seats[2]!.angular.y > 0 && seats[3]!.angular.y < 0);
  console.log(JSON.stringify({ case: 'air-vs-water', airZ: air.position.z, wetZ: wet.position.z, seatYaw: seats.map(s => s.angular.y) }));
});

test('PHY-05/07: reverse relative velocity reverses force; immersion and current affect drag; force capped', () => {
  const forward = bladeReaction({ x: 0, y: 0, z: -1 }, 1);
  const reverse = bladeReaction({ x: 0, y: 0, z: 1 }, 1);
  assert(forward.z > 0 && reverse.z < 0);
  assert.equal(bladeReaction({ x: 0, y: 0, z: -1 }, 0.5).z, forward.z / 2);
  assert(Math.hypot(...Object.values(bladeReaction({ x: 100, y: 0, z: 100 }, 1))) <= 420.0001);
  const upstream = sampleWater(0, 30, 1); const cross = sampleWater(0, 55, 1);
  assert(cross.velocity.x > upstream.velocity.x);
  const driftForce = bladeReaction({ x: -cross.velocity.x, y: 0, z: 0 }, 1);
  assert(driftForce.x > 0);
  for (let z = 39; z < 80; z += 0.1) {
    const a = sampleWater(1, z, 1); const b = sampleWater(1, z + 0.001, 1);
    assert(Math.abs(a.velocity.x - b.velocity.x) < 0.001, 'flow seam must be continuous');
  }
});

test('Blade reaction rotates with hull heading rather than fixed world axes', () => {
  const forward = stroke([0, 1, 2, 3], true);
  const turned = stroke([0, 1, 2, 3], true, Math.PI / 2);
  assert(Math.abs(turned.position.x - forward.position.z) < 0.001);
  assert(Math.abs(turned.position.z) < 0.001);
});

test('PROTO: bow/stern lateral sweep creates opposite yaw, same-side straight pulls need not', () => {
  const yaw: number[] = [];
  for (const seat of [0, 2]) {
    const sim = new BoatSimulation(true); sim.setActive(seat, true);
    command(sim, [seat], 0, 0, 180, -1);
    command(sim, [seat], 0, 1, 20, -1);
    command(sim, [seat], 0, 1, 30, 1);
    yaw.push(sim.hull.angvel().y); sim.dispose();
  }
  assert(yaw[0]! * yaw[1]! < 0, `bow/stern lateral yaw=${yaw}`);
});

test('NET stale input and disconnect release blade; target teleport remains speed bounded', () => {
  const sim = new BoatSimulation(true); sim.setActive(0, true);
  command(sim, [0], 1, 0, 180);
  sim.accept(0, { seq: 999, x: -1, z: -1, dip: 1 });
  const beforeZ = sim.paddles[0]!.z; sim.step();
  assert(Math.abs(sim.paddles[0]!.z - beforeZ) <= 2.7 * DT);
  command(sim, [0], -1, 1, 30);
  for (let i = 0; i < 60; i++) sim.step();
  assert.equal(sim.paddles[0]!.dip, 0);
  sim.setActive(0, false); sim.step();
  assert.equal(sim.blades[0]!.state, 'DISABLED'); assert.equal(sim.blades[0]!.force, 0);
  sim.dispose();
});

test('PHY-08: swept blade can brace against bank with bounded contact force and no wall climb', () => {
  const sim = new BoatSimulation(true); sim.setActive(1, true);
  sim.hull.setTranslation({ x: 10.8, y: 0.08, z: 0 }, true);
  let braces = 0;
  for (let t = 0; t < 200; t++) {
    sim.accept(1, { seq: t + 1, x: t < 120 ? -1 : 1, z: 0, dip: 1 }); sim.step();
    if (sim.blades[1]!.state === 'BRACE') { braces++; assert(sim.blades[1]!.force <= 260.001); }
  }
  assert(braces > 0); assert(sim.hull.translation().x < 10.8, 'Contact must push away from the bank');
  assert(sim.hull.translation().y < 0.2); assert(sim.maxSpeed < 2);
  sim.dispose();
});

test('PHY-10 partial: sampled buoyancy settles a 25-degree heel in waves without orientation lock', () => {
  const sim = new BoatSimulation();
  const angle = 25 * Math.PI / 180;
  sim.hull.setRotation({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }, true);
  for (let i = 0; i < 1200; i++) sim.step();
  const up = rotate({ x: 0, y: 1, z: 0 }, sim.hull.rotation());
  assert(up.y > 0.98, `up.y=${up.y}`); assert.equal(sim.resetId, 0); assert(sim.maxSpeed < 3);
  sim.dispose();
});

test('PHY-11: 100 checkpoint resets clear momentum and return to a collision-free canonical pose', () => {
  const sim = new BoatSimulation(true);
  for (let i = 0; i < 100; i++) {
    sim.hull.setLinvel({ x: 20, y: 20, z: -20 }, true); sim.checkpoint = i % 3;
    sim.reset();
    assert.deepEqual({ ...sim.hull.linvel() }, { x: 0, y: 0, z: 0 });
    assert.equal(sim.hull.translation().z, [0, 48, 100][i % 3]);
    sim.step(); assert(Math.hypot(sim.hull.linvel().x, sim.hull.linvel().z) < 0.01);
  }
  assert.equal(sim.resetId, 100); sim.dispose();
});

test('PHY-23: a sustained capsize returns every crew member to the canonical checkpoint without masking a crash', () => {
  const sim = new BoatSimulation(true);
  sim.checkpoint = 2;
  sim.hull.setRotation({ x: 0, y: 0, z: 1, w: 0 }, true);
  for (let i = 0; i < 302 && sim.recoveryId === 0; i++) sim.step();
  assert.equal(sim.condition, 'afloat');
  assert.equal(sim.recoveryId, 1); assert.equal(sim.recoveryReason, 'capsized');
  assert.equal(sim.resetId, 1); assert.equal(sim.hull.translation().z, 100);
  assert.deepEqual({ ...sim.hull.rotation() }, { x: 0, y: 0, z: 0, w: 1 });
  sim.dispose();
});

test('PHY-23: live rowing pinned at a bank recovers, while a stationary crew never auto-resets', () => {
  const grounded = new BoatSimulation(true);
  grounded.setActive(0, true);
  grounded.hull.setTranslation({ x: 11.7, y: 0.08, z: 0 }, true);
  for (let i = 0; i < 260 && grounded.recoveryId === 0; i++) {
    grounded.hull.setLinvel({ x: 0, y: 0, z: 0 }, true);
    grounded.accept(0, { seq: i + 1, x: 0, z: 1, dip: 1 });
    grounded.step();
  }
  assert.equal(grounded.condition, 'afloat');
  assert.equal(grounded.recoveryId, 1); assert.equal(grounded.recoveryReason, 'grounded');
  assert.equal(grounded.hull.translation().z, 0); grounded.dispose();

  const idle = new BoatSimulation(true);
  idle.hull.setTranslation({ x: 11.7, y: 0.08, z: 0 }, true);
  for (let i = 0; i < 360; i++) idle.step();
  assert.equal(idle.recoveryId, 0); assert.equal(idle.condition, 'afloat'); idle.dispose();
});

test('Repeated recorded inputs are reproducible in this runtime', () => {
  const a = stroke([0, 2], true); const b = stroke([0, 2], true);
  assert.deepEqual(a, b);
});

test('Checkpoint capture belongs to the simulation and advances its revision only once per dock', () => {
  const sim = new BoatSimulation(true);
  sim.hull.setTranslation({ x: 0, y: 0.08, z: 49 }, true); sim.step();
  assert.equal(sim.checkpoint, 1); assert.equal(sim.revision, 1);
  for (let i = 0; i < 120; i++) sim.step();
  assert.equal(sim.revision, 1);
  sim.hull.setTranslation({ x: 0, y: 0.08, z: 101 }, true); sim.step();
  assert.equal(sim.checkpoint, 2); assert.equal(sim.revision, 2);
  sim.reset(); assert.equal(sim.hull.translation().z, 100);
  sim.dispose();
});

test('Lethal obstacle contact breaks once, disables every paddle, sinks, and restores the checkpoint cleanly', () => {
  const sim = new BoatSimulation(true);
  for (let seat = 0; seat < 4; seat++) sim.setActive(seat, true);
  sim.checkpoint = 1;
  // A real overlap/contact with the authored rock, not a client damage command.
  sim.hull.setTranslation({ x: 0, y: 0.08, z: 25 }, true);
  sim.hull.setLinvel({ x: 0, y: 0, z: 2 }, true);
  for (let i = 0; i < 60 && sim.condition === 'afloat'; i++) sim.step();
  assert.equal(sim.condition, 'breaking'); assert.equal(sim.crashId, 1); assert.equal(sim.obstacleId, 'split-rock');
  const ack = sim.paddles[0]!.intent.seq;
  sim.accept(0, { seq: 999, x: 1, z: -1, dip: 1 });
  assert.equal(sim.paddles[0]!.intent.seq, ack);
  for (let i = 0; i < 180; i++) sim.step();
  assert.equal(sim.condition, 'sunk'); assert.equal(sim.crashId, 1);
  assert(sim.hull.translation().y < -0.5, 'Flooded body must physically sink');
  assert(sim.blades.every(blade => blade.state === 'DISABLED' && blade.force === 0));
  assert.equal(sim.checkpoint, 1, 'Sinking must not capture a different checkpoint');
  sim.reset();
  assert.equal(sim.condition, 'afloat'); assert.equal(sim.wreckTicks, 0); assert.equal(sim.obstacleId, null);
  assert.equal(sim.hull.translation().z, 48); assert.equal(sim.hull.linvel().y, 0);
  sim.step(); assert.equal(sim.condition, 'afloat'); sim.dispose();
});

test('Nearby obstacles and ordinary river-bank contact do not cause a false break', () => {
  const sim = new BoatSimulation(true);
  sim.hull.setTranslation({ x: 3, y: 0.08, z: 27 }, true);
  for (let i = 0; i < 60; i++) sim.step();
  assert.equal(sim.condition, 'afloat');
  sim.hull.setTranslation({ x: 11.7, y: 0.08, z: 0 }, true);
  for (let i = 0; i < 60; i++) sim.step();
  assert.equal(sim.condition, 'afloat'); assert.equal(sim.crashId, 0); sim.dispose();
});

test('A blade-only rock brace does not destroy a clear hull', () => {
  const sim = new BoatSimulation(true); sim.setActive(0, true);
  sim.hull.setTranslation({ x: 2.5, y: 0.08, z: 26.05 }, true);
  let braces = 0;
  for (let t = 0; t < 240; t++) {
    sim.accept(0, { seq: t + 1, x: t < 120 ? -1 : 1, z: 0, dip: 1 }); sim.step();
    if (sim.blades[0]!.state === 'BRACE') braces++;
  }
  assert(braces > 0); assert.equal(sim.condition, 'afloat'); assert.equal(sim.crashId, 0); sim.dispose();
});

test('Hull CCD still triggers lethal contact at a fast approach', () => {
  const sim = new BoatSimulation(true);
  sim.hull.setTranslation({ x: 0, y: 0.08, z: 20 }, true);
  sim.hull.setLinvel({ x: 0, y: 0, z: 30 }, true);
  for (let i = 0; i < 20 && sim.condition === 'afloat'; i++) sim.step();
  assert.equal(sim.condition, 'breaking'); assert.equal(sim.obstacleId, 'split-rock'); sim.dispose();
});
