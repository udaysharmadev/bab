import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { BoatSimulation, initPhysics } from '../src/shared/simulation';
import { CHECKPOINTS, SPIKES, SWEEPER, WHIRLPOOL, sampleSweeper, sampleWater } from '../src/shared/world';
import { DT } from '../src/shared/protocol';

before(initPhysics);

test('Whirlpool flow is finite, bounded, smoothly local, and absent in calm fixtures', () => {
  let maxFlow = 0;
  for (let x = -11; x <= 1; x += 0.15) for (let z = 106; z <= 118; z += 0.15) {
    const water = sampleWater(x, z, 3.2);
    assert(Object.values(water.velocity).every(Number.isFinite));
    assert(Number.isFinite(water.height));
    maxFlow = Math.max(maxFlow, Math.hypot(water.velocity.x, water.velocity.z));
    // Analytic waves contribute at most .035 + .018m around the basin depth.
    assert(water.height >= -WHIRLPOOL.depth - 0.053 && water.height <= 0.053);
    assert.deepEqual(sampleWater(x, z, 3.2, true), {
      height: 0, velocity: { x: 0, y: 0, z: 0 }, zone: 'headwaters',
    });
  }
  assert(maxFlow > 1.5 && maxFlow < 2, `bounded current speed=${maxFlow}`);
  for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
    const at = (r: number) => sampleWater(WHIRLPOOL.x + Math.cos(angle) * r, WHIRLPOOL.z + Math.sin(angle) * r, 2);
    const inside = at(WHIRLPOOL.radius - 0.001);
    const outside = at(WHIRLPOOL.radius + 0.001);
    assert(Math.abs(inside.velocity.x - outside.velocity.x) < 0.00001);
    assert(Math.abs(inside.velocity.z - outside.velocity.z) < 0.00001);
    assert(Math.abs(inside.height - outside.height) < 0.0001);
  }
  const left = sampleWater(WHIRLPOOL.x - 2.5, WHIRLPOOL.z, 0);
  const right = sampleWater(WHIRLPOOL.x + 2.5, WHIRLPOOL.z, 0);
  assert(left.velocity.x > 0 && right.velocity.x < 0, 'Flow draws toward the center');
  assert(left.velocity.z < 0 && right.velocity.z > 0, 'Flow rotates around the center');
});

test('Physical iron tooth contact breaks the hull once while a neighboring clear route stays intact', () => {
  const spike = SPIKES[0]!;
  const hit = new BoatSimulation(true);
  hit.hull.setTranslation({ x: spike.x, y: 0.08, z: spike.z - 2.6 }, true);
  hit.hull.setLinvel({ x: 0, y: 0, z: 3 }, true);
  for (let t = 0; t < 60 && hit.condition === 'afloat'; t++) hit.step();
  assert.equal(hit.condition, 'breaking'); assert.equal(hit.obstacleId, spike.id);
  for (let t = 0; t < 180; t++) hit.step();
  assert.equal(hit.condition, 'sunk'); assert.equal(hit.crashId, 1);
  hit.dispose();

  const clear = new BoatSimulation();
  clear.hull.setTranslation({ x: -3.3, y: 0.08, z: 55.8 }, true);
  for (let t = 0; t < 120; t++) clear.step();
  assert.equal(clear.condition, 'afloat'); assert.equal(clear.crashId, 0);
  clear.dispose();
});

test('An iron tooth touched only by the paddle permits bracing without hull destruction', () => {
  const sim = new BoatSimulation(true);
  sim.setActive(0, true);
  sim.hull.setTranslation({ x: -3.3, y: 0.08, z: 54.85 }, true);
  let braces = 0;
  for (let t = 0; t < 240; t++) {
    sim.accept(0, { seq: t + 1, x: t < 120 ? -1 : 1, z: 0, dip: 1 });
    sim.step();
    if (sim.blades[0]!.state === 'BRACE') braces++;
  }
  assert(braces > 0, 'Blade must physically contact the cone');
  assert.equal(sim.condition, 'afloat'); assert.equal(sim.crashId, 0);
  sim.dispose();
});

test('Tapered spike tips have actual cone clearance rather than an invisible full-width box', () => {
  const high = new BoatSimulation(true);
  high.hull.setTranslation({ x: 5.15, y: 1.1, z: 87.15 }, true);
  for (let t = 0; t < 3; t++) high.step();
  assert.equal(high.condition, 'afloat', 'The high hull clears the narrow tip');
  high.dispose();
  const low = new BoatSimulation(true);
  low.hull.setTranslation({ x: 5.15, y: 0.08, z: 87.15 }, true);
  for (let t = 0; t < 3; t++) low.step();
  assert.equal(low.condition, 'breaking', 'The same horizontal footprint contacts the broad lower cone');
  assert.equal(low.obstacleId, 'iron-tooth-4');
  low.dispose();
});

test('Whirlpool acts through water drag, remains stable, and repeats from the same state', () => {
  const run = () => {
    const sim = new BoatSimulation();
    sim.hull.setTranslation({ x: WHIRLPOOL.x - 3.5, y: 0.08, z: WHIRLPOOL.z }, true);
    for (let t = 0; t < 180; t++) sim.step();
    const result = {
      position: { ...sim.hull.translation() }, velocity: { ...sim.hull.linvel() },
      rotation: { ...sim.hull.rotation() }, condition: sim.condition, resets: sim.resetId,
    };
    assert(result.position.x > WHIRLPOOL.x - 3.4, 'Current must move the hull inward');
    assert(result.position.z < WHIRLPOOL.z - 0.1, 'Current must move the hull around the vortex');
    assert.equal(result.condition, 'afloat'); assert.equal(result.resets, 0);
    for (let t = 0; t < 7200; t++) sim.step();
    assert(Object.values(sim.hull.translation()).every(Number.isFinite));
    assert(Object.values(sim.hull.linvel()).every(Number.isFinite));
    assert(sim.maxSpeed < 4, `unbounded vortex hull speed=${sim.maxSpeed}`);
    assert.equal(sim.resetId, 0, 'No instability reset during the soak');
    sim.dispose(); return result;
  };
  assert.deepEqual(run(), run());
});

test('Every checkpoint resets outside spike collision and whirlpool influence', () => {
  const sim = new BoatSimulation();
  for (let checkpoint = 0; checkpoint < CHECKPOINTS.length; checkpoint++) {
    sim.checkpoint = checkpoint; sim.reset();
    const position = sim.hull.translation();
    assert(Math.hypot(position.x - WHIRLPOOL.x, position.z - WHIRLPOOL.z) > WHIRLPOOL.radius + 2);
    for (let t = 0; t < 30; t++) sim.step();
    assert.equal(sim.condition, 'afloat'); assert.equal(sim.obstacleId, null);
  }
  sim.dispose();
});

test('Moving timber collider follows the shared fixed-step clock through a full cycle and a wreck', () => {
  const sim = new BoatSimulation(true);
  const checkPose = () => {
    const actual = sim.sweeper.translation(); const expected = sampleSweeper(sim.tick * DT);
    for (const axis of ['x', 'y', 'z'] as const) assert(Math.abs(actual[axis] - expected[axis]) < 0.00001);
  };
  checkPose();
  for (let t = 0; t < SWEEPER.period / DT; t++) { sim.step(); checkPose(); }
  // An unrelated real collision must not freeze the moving hazard clock.
  sim.hull.setTranslation({ x: 0, y: 0.08, z: 25 }, true);
  sim.step(); assert.equal(sim.condition, 'breaking');
  for (let t = 0; t < 180; t++) { sim.step(); checkPose(); }
  assert.equal(sim.condition, 'sunk');
  sim.dispose();
});

test('Moving timber causes one physical hull break while the bank-side bypass remains clear', () => {
  const hit = new BoatSimulation(true);
  hit.hull.setTranslation({ x: 0, y: 0.08, z: SWEEPER.z - 2.3 }, true);
  hit.hull.setLinvel({ x: 0, y: 0, z: 2 }, true);
  for (let t = 0; t < 60 && hit.condition === 'afloat'; t++) hit.step();
  assert.equal(hit.condition, 'breaking'); assert.equal(hit.obstacleId, SWEEPER.id);
  for (let t = 0; t < 180; t++) hit.step();
  assert.equal(hit.condition, 'sunk'); assert.equal(hit.crashId, 1);
  hit.dispose();
  const clear = new BoatSimulation(true);
  clear.hull.setTranslation({ x: -10, y: 0.08, z: SWEEPER.z }, true);
  for (let t = 0; t < SWEEPER.period / DT; t++) clear.step();
  assert.equal(clear.condition, 'afloat'); assert.equal(clear.crashId, 0);
  clear.dispose();
});

test('Checkpoint reset preserves sweeper phase and stays clear at multiple phases', () => {
  const sim = new BoatSimulation(true);
  for (let phase = 0; phase < 8; phase++) {
    for (let t = 0; t < SWEEPER.period / DT / 8; t++) sim.step();
    for (let checkpoint = 0; checkpoint < CHECKPOINTS.length; checkpoint++) {
      sim.checkpoint = checkpoint;
      const beforeTick = sim.tick;
      sim.reset(); assert.equal(sim.tick, beforeTick);
      sim.step();
      assert.equal(sim.condition, 'afloat'); assert.equal(sim.obstacleId, null);
      assert(Math.abs(sim.sweeper.translation().x - sampleSweeper(sim.tick * DT).x) < 0.00001);
    }
  }
  sim.dispose();
});
