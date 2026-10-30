import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { BoatSimulation, initPhysics, type BuoyancySamples } from '../src/shared/simulation';
import { rotate } from '../src/shared/protocol';
import { sampleWater, sampleWaterHeight, rapidStrength } from '../src/shared/world';

before(initPhysics);

test('Height-only mesh sampling and cached rapid rows agree across wave/vortex/rapid seams',()=>{
  for(const z of [0,44,70,107,112,278,283,304,353,358,538,662,1018,1144,1345]) {
    const strength=rapidStrength(z);
    for(const x of [-6,-2,0,4,7])for(const time of [0,1.7,8.4]) {
      assert.equal(sampleWaterHeight(x,z,time,strength),sampleWater(x,z,time).height);
      assert.equal(sampleWaterHeight(x,z,time),sampleWater(x,z,time).height);
    }
  }
});

test('Wave vertical velocity matches the analytic surface motion including rapid seams', () => {
  const epsilon = 0.00001;
  let largestMotion = 0;
  for (const z of [0, 44, 70, 112, 278, 283, 304, 353, 358, 662, 1018, 1345]) {
    for (const x of [-5, 0, 4]) for (const time of [0, 1.7, 8.4]) {
      const water = sampleWater(x, z, time);
      const derivative = (sampleWater(x, z, time + epsilon).height - sampleWater(x, z, time - epsilon).height) / (2 * epsilon);
      assert(Math.abs(water.velocity.y - derivative) < 0.000001, `vertical motion at ${x}, ${z}, ${time}`);
      largestMotion = Math.max(largestMotion, Math.abs(water.velocity.y));
      assert.equal(sampleWater(x, z, time, true).velocity.y, 0);
    }
  }
  assert(largestMotion > 0.2, 'Rapids must retain meaningful wave motion');
});

test('T021: 16/20/24 buoyancy samples preserve displacement, restore heel and dissipate free motion', () => {
  const measurements = [];
  for (const count of [16, 20, 24] as const) {
    const costs: number[] = [];
    const payloads = [];
    const heels = [];
    const advance = (sim: BoatSimulation, ticks: number) => {
      for (let i = 0; i < ticks; i++) {
        const started = performance.now();
        sim.step();
        costs.push(performance.now() - started);
      }
    };
    for (const mass of [220, 260, 360]) {
      const sim = new BoatSimulation(true, count);
      try {
        sim.hullCollider.setMass(mass);
        advance(sim, 720);
        const expected = 0.25 - mass * 9.81 / 13000;
        const height = sim.hull.translation().y;
        assert(Math.abs(height - expected) < 0.002, `${count} points, ${mass} kg: height ${height}, expected ${expected}`);
        assert(Math.hypot(sim.hull.translation().x, sim.hull.translation().z) < 0.001);
        assert.equal(sim.resetId, 0);
        payloads.push({ massKg: mass, equilibriumY: height, expectedY: expected });
      } finally { sim.dispose(); }
    }
    for (const degrees of [10, 25, 45]) {
      const sim = new BoatSimulation(false, count);
      try {
        const angle = degrees * Math.PI / 180;
        sim.hull.setRotation({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }, true);
        advance(sim, 1200);
        const up = rotate({ x: 0, y: 1, z: 0 }, sim.hull.rotation());
        assert(up.y > 0.98, `${count} points, ${degrees} degrees: up ${up.y}`);
        assert(sim.maxSpeed < 3);
        assert.equal(sim.resetId, 0); assert.equal(sim.condition, 'afloat');
        heels.push({ initialDegrees: degrees, finalUpY: up.y, maxSpeed: sim.maxSpeed });
      } finally { sim.dispose(); }
    }
    const sim = new BoatSimulation(true, count);
    let residualSpeed = 0;
    try {
      advance(sim, 240);
      sim.hull.setLinvel({ x: 3, y: 0, z: 1 }, true);
      sim.hull.setAngvel({ x: 0, y: 0.7, z: 0 }, true);
      advance(sim, 240);
      residualSpeed = Math.hypot(sim.hull.linvel().x, sim.hull.linvel().z);
      assert(residualSpeed < 0.6, `free motion did not decay: ${residualSpeed}`);
      assert(Math.abs(sim.hull.angvel().y) < 0.05);
      assert.equal(sim.condition, 'afloat'); assert.equal(sim.resetId, 0);
    } finally { sim.dispose(); }
    costs.sort((a, b) => a - b);
    measurements.push({ samples: count, payloads, heels, residualSpeed, measuredTicks: costs.length,
      tickP50ms: costs[Math.floor(costs.length * 0.5)], tickP95ms: costs[Math.floor(costs.length * 0.95)] });
  }
  mkdirSync('evidence', { recursive: true });
  writeFileSync('evidence/physics-sweep.json', JSON.stringify({
    measuredAt: new Date().toISOString(), runtime: process.version, platform: process.platform,
    defaultSamples: 20, scope: 'Local accelerated authority simulation; no browser or Internet timing guarantee.',
    measurements,
  }, null, 2) + '\n');
  console.log(JSON.stringify({ case: 'buoyancy-sweep', measurements }));
});

function pinAtBank(x: number, yaw: number, active: boolean, count: BuoyancySamples = 20) {
  const sim = new BoatSimulation(true, count);
  sim.setActive(0, active);
  sim.hull.setTranslation({ x, y: 0.08, z: 0 }, true);
  sim.hull.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true);
  for (let i = 0; i < 360 && sim.recoveryId === 0; i++) {
    // Reproduce a pinned boat: the existing recovery test also removes motion
    // each tick. Rapier still resolves real contact; there are no fake manifolds.
    sim.hull.setLinvel({ x: 0, y: 0, z: 0 }, true);
    sim.hull.setAngvel({ x: 0, y: 0, z: 0 }, true);
    if (active) sim.accept(0, { seq: i + 1, x: 0, z: 1, dip: 1 });
    sim.step();
  }
  return sim;
}

test('Grounded recovery detects a sideways hull through contact and excludes idle/open-water boats', () => {
  for (const [x, yaw] of [[11.7, 0], [10.7, Math.PI / 2]]) {
    const sim = pinAtBank(x!, yaw!, true);
    try {
      assert.equal(sim.recoveryId, 1, `grounded x=${x}, yaw=${yaw}`);
      assert.equal(sim.recoveryReason, 'grounded');
      assert.equal(sim.crashId, 0); assert.equal(sim.condition, 'afloat');
      assert.equal(sim.hull.translation().x, 0);
    } finally { sim.dispose(); }
  }
  for (const [x, yaw, active] of [[10.7, Math.PI / 2, false], [10, 0, true]] as const) {
    const sim = pinAtBank(x, yaw, active);
    try { assert.equal(sim.recoveryId, 0); assert.equal(sim.crashId, 0); }
    finally { sim.dispose(); }
  }
});
