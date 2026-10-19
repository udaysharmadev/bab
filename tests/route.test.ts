import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { BoatSimulation, initPhysics } from '../src/shared/simulation';
import { CHECKPOINTS, FINISH_Z, PYLONS, RAPIDS, ROCKS, ROUTE_SECTIONS, SPIKES, SWEEPERS, WATERWHEEL, channelHalfWidth, sampleSweeper, sampleWater } from '../src/shared/world';
import { DT } from '../src/shared/protocol';

before(initPhysics);

test('Timber Gorge has contiguous authored beats, recovery bays and a finite final objective', () => {
  assert.equal(FINISH_Z, 820);
  assert.equal(ROUTE_SECTIONS[0]!.start, 0);
  assert.equal(ROUTE_SECTIONS.at(-1)!.end, FINISH_Z);
  for (let i = 1; i < ROUTE_SECTIONS.length; i++) assert.equal(ROUTE_SECTIONS[i - 1]!.end, ROUTE_SECTIONS[i]!.start);
  for (const checkpoint of CHECKPOINTS.slice(3)) {
    const section = ROUTE_SECTIONS.find(s => checkpoint >= s.start && checkpoint < s.end)!;
    assert.equal(section.kind, 'calm', `checkpoint ${checkpoint} needs recovery space`);
    assert(channelHalfWidth(checkpoint) >= 11.5);
    for (const hazard of [...ROCKS, ...SPIKES, ...PYLONS, ...SWEEPERS]) assert(Math.abs(hazard.z - checkpoint) > 8);
  }
  for (const kind of ['slalom', 'rapids', 'timber', 'narrows', 'finish']) assert(ROUTE_SECTIONS.some(s => s.kind === kind));
});

test('Shared channel and rapids stay continuous, finite and bounded with flat-water fixtures preserved', () => {
  for (let z = -10; z <= FINISH_Z + 25; z += 0.5) {
    const width = channelHalfWidth(z);
    assert(width >= 6.5 && width <= 12.5);
    assert(Math.abs(channelHalfWidth(z + 0.001) - width) < 0.001);
    if (z <= 138) assert.equal(width, 12.5);
    for (const x of [-width + 1, 0, width - 1]) for (const time of [0, 1.7, 9.3]) {
      const water = sampleWater(x, z, time);
      assert(Number.isFinite(water.height) && Object.values(water.velocity).every(Number.isFinite));
      assert(Math.abs(water.height) <= 0.61 && Math.hypot(water.velocity.x, water.velocity.z) < 2);
      assert.deepEqual(sampleWater(x, z, time, true), { height: 0, velocity: { x: 0, y: 0, z: 0 }, zone: 'headwaters' });
    }
  }
  for (const zone of RAPIDS) {
    assert.equal(sampleWater(0, (zone.start + zone.end) / 2, 0).zone, 'rapids');
    assert(sampleWater(0, (zone.start + zone.end) / 2, 0).velocity.z > 0.6);
    for (const z of [zone.start, zone.start + 10, zone.end - 10, zone.end]) {
      const before = sampleWater(2, z - 0.0001, 2); const after = sampleWater(2, z + 0.0001, 2);
      assert(Math.abs(before.height - after.height) < 0.0001);
      assert(Math.hypot(before.velocity.x - after.velocity.x, before.velocity.z - after.velocity.z) < 0.0001);
    }
  }
});

test('Every canonical checkpoint remains safe with synchronized timber at eight distinct clock phases', () => {
  const sim = new BoatSimulation();
  for (let phase = 0; phase < 8; phase++) for (let checkpoint = 0; checkpoint < CHECKPOINTS.length; checkpoint++) {
    sim.tick = Math.round(phase * 3.7 / DT);
    // Phase changes here are test setup only; live resets preserve the server clock.
    sim.sweepers.forEach((body, i) => body.setTranslation(sampleSweeper(sim.tick * DT, SWEEPERS[i]!), true));
    sim.checkpoint = checkpoint; sim.reset();
    const before = sim.tick;
    assert.deepEqual({ ...sim.hull.translation() }, { x: 0, y: Math.fround(0.08), z: CHECKPOINTS[checkpoint] });
    for (let t = 0; t < 90; t++) sim.step();
    assert.equal(sim.tick, before + 90);
    assert.equal(sim.condition, 'afloat'); assert.equal(sim.obstacleId, null);
    assert(Math.abs(sim.hull.translation().x) < (checkpoint < 3 ? 1 : 0.02), `checkpoint ${checkpoint} drift=${sim.hull.translation().x}`);
    for (let i = 0; i < SWEEPERS.length; i++) {
      const actual = sim.sweepers[i]!.translation(); const expected = sampleSweeper(sim.tick * DT, SWEEPERS[i]!);
      assert(Math.abs(actual.x - expected.x) < 0.00001);
      assert.equal(actual.z, expected.z);
    }
  }
  sim.dispose();
});

test('Gorge rock, spike and both moving timber colliders cause genuine one-shot hull failure', () => {
  const rock = ROCKS.find(r => r.id === 'slalom-left')!;
  const spike = SPIKES.find(r => r.id === 'narrows-tooth-1')!;
  for (const hazard of [rock, spike, ...SWEEPERS.slice(1).map(s => ({ ...s, x: sampleSweeper(DT, s).x }))]) {
    const sim = new BoatSimulation(true);
    sim.hull.setTranslation({ x: hazard.x, y: 0.08, z: hazard.z - 1.8 }, true);
    sim.hull.setLinvel({ x: 0, y: 0, z: 3 }, true);
    for (let t = 0; t < 60 && sim.condition === 'afloat'; t++) sim.step();
    assert.equal(sim.condition, 'breaking', hazard.id); assert.equal(sim.obstacleId, hazard.id);
    for (let t = 0; t < 160; t++) sim.step();
    assert.equal(sim.condition, 'sunk'); assert.equal(sim.crashId, 1);
    sim.dispose();
  }
});

test('Rapids impart bounded flow through immersed drag, while calm controls retain zero propulsion', () => {
  const run = (calm: boolean) => {
    const sim = new BoatSimulation(calm);
    sim.hull.setTranslation({ x: 0, y: 0.08, z: 286 }, true);
    // One second is before the next authored solid; no inputs are supplied.
    for (let t = 0; t < 60; t++) sim.step();
    const moved = sim.hull.translation().z - 286;
    assert.equal(sim.condition, 'afloat'); assert.equal(sim.resetId, 0); assert(sim.maxSpeed < 2);
    sim.dispose(); return moved;
  };
  assert(run(false) > 0.05); assert(Math.abs(run(true)) < 0.001);
});

// Geometric passability is a necessary layout check, not a substitute for a
// human crew navigating the dynamic route. Expand every solid by the hull's
// half extents and prove a connected lateral corridor at half-metre slices.
test('Authored extension has a connected hull-width corridor at sampled timber phases', () => {
  const step = 0.25;
  for (const time of [0, 3, 7, 11, 17]) {
    let previous: number[] = [0];
    for (let z = 138; z <= FINISH_Z; z += 0.5) {
      const width = Math.min(channelHalfWidth(z - 1.9), channelHalfWidth(z), channelHalfWidth(z + 1.9));
      const solids = [
        { x: WATERWHEEL.x, z: WATERWHEEL.z, rx: WATERWHEEL.halfWidth + 0.08, rz: WATERWHEEL.radius + 0.08 },
        ...ROCKS.map(s => ({ x: s.x, z: s.z, rx: s.radius, rz: s.radius })),
        ...SPIKES.map(s => ({ x: s.x, z: s.z, rx: s.radius, rz: s.radius })),
        ...PYLONS.map(s => ({ x: s.x, z: s.z, rx: 0.27, rz: 0.27 })),
        ...SWEEPERS.map(s => ({ ...sampleSweeper(time, s), rx: s.halfLength + s.radius, rz: s.radius })),
      ].filter(s => Math.abs(s.z - z) < s.rz + 1.95);
      const reachable: number[] = [];
      for (let x = -width + 1; x <= width - 1; x += step) {
        if (solids.some(s => Math.abs(s.x - x) < s.rx + 0.95)) continue;
        if (previous.some(p => Math.abs(p - x) < 0.55)) reachable.push(x);
      }
      assert(reachable.length > 0, `No connected corridor z=${z}, timber time=${time}`);
      previous = reachable;
    }
  }
});

test('Only the final river gate completes the run, and checkpoint retry clears completion', () => {
  const sim = new BoatSimulation(true);
  sim.hull.setTranslation({ x: 0, y: 0.08, z: 139 }, true); sim.step();
  assert.equal(sim.complete, false, 'Old test-river endpoint is now the gorge entrance');
  sim.checkpoint = CHECKPOINTS.length - 1;
  sim.hull.setTranslation({ x: 0, y: 0.08, z: FINISH_Z + 1 }, true); sim.step();
  assert.equal(sim.complete, true);
  sim.reset(); assert.equal(sim.complete, false); assert.equal(sim.checkpoint, CHECKPOINTS.length - 1);
  assert.equal(sim.hull.translation().z, CHECKPOINTS.at(-1));
  sim.step(); assert.equal(sim.complete, false);
  sim.hull.setTranslation({ x: 30, y: 0.08, z: FINISH_Z + 1 }, true); sim.step();
  assert.equal(sim.complete, false, 'Leaving the channel cannot award the finish');
  sim.reset(true); assert.equal(sim.checkpoint, 0); assert.equal(sim.hull.translation().z, 0);
  sim.dispose();
});

test('Narrow gorge banks stop the hull and permit paddle bracing without becoming lethal', () => {
  const contact = new BoatSimulation(true);
  contact.hull.setTranslation({ x: 6, y: 0.08, z: 566 }, true);
  for (let t = 0; t < 60; t++) contact.step();
  assert(contact.hull.translation().x < 5.7, 'A 6.5m half-width bank must stop the 0.9m half-width hull');
  assert.equal(contact.condition, 'afloat'); assert.equal(contact.crashId, 0);
  contact.dispose();
  const brace = new BoatSimulation(true); brace.setActive(1, true);
  brace.hull.setTranslation({ x: 4.8, y: 0.08, z: 566 }, true);
  let braces = 0;
  for (let t = 0; t < 200; t++) {
    brace.accept(1, { seq: t + 1, x: t < 120 ? -1 : 1, z: 0, dip: 1 }); brace.step();
    if (brace.blades[1]!.state === 'BRACE') braces++;
  }
  assert(braces > 0); assert(brace.hull.translation().x < 4.8);
  assert.equal(brace.condition, 'afloat'); assert.equal(brace.crashId, 0);
  brace.dispose();
});
