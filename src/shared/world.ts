import { clamp, type Vec3 } from './protocol';

export const CHECKPOINTS = [0, 48, 100, 156, 260, 380, 500, 630, 760] as const;
export const FINISH_Z = 820;
export const WATERWHEEL = {id:'sawyer-waterwheel',x:5,y:2.3,z:465,radius:3,halfWidth:1.5,period:18,blades:8} as const;
export function sampleWaterwheel(time:number) {
  const angle=time*Math.PI*2/WATERWHEEL.period;
  return {x:Math.sin(angle/2),y:0,z:0,w:Math.cos(angle/2)};
}
export type RouteSection = {
  id: string; name: string; start: number; end: number;
  kind: 'calm' | 'slalom' | 'rapids' | 'timber' | 'narrows' | 'finish'; hint: string;
};
// Deliberate alternation of reading space, an encounter and a recovery bay.
// These distances define content, not a claim about human completion time.
export const ROUTE_SECTIONS: readonly RouteSection[] = [
  { id: 'headwaters', name: 'Willow Headwaters', start: 0, end: 138, kind: 'slalom', hint: 'Read the red markers. Find your rhythm.' },
  { id: 'gorge-arrival', name: 'Gorge Landing', start: 138, end: 176, kind: 'calm', hint: 'Catch your breath before the channel closes.' },
  { id: 'split-stone', name: 'Split Stone Slalom', start: 176, end: 244, kind: 'slalom', hint: 'Pass the rocks on alternating sides.' },
  { id: 'fern-dock', name: 'Fern Dock', start: 244, end: 278, kind: 'calm', hint: 'Regroup at the green pennants.' },
  { id: 'whitewater', name: 'Whitewater Steps', start: 278, end: 364, kind: 'rapids', hint: 'The current accelerates. Set your line early.' },
  { id: 'stillwater', name: 'Stillwater Pool', start: 364, end: 398, kind: 'calm', hint: 'A quiet pool before the timber works.' },
  { id: 'timber-works', name: 'Timber Works', start: 398, end: 482, kind: 'timber', hint: 'Watch the floating trunks. Wait for an opening.' },
  { id: 'sawyer-dock', name: 'Sawyer Dock', start: 482, end: 520, kind: 'calm', hint: 'Make room for the next tight passage.' },
  { id: 'iron-narrows', name: 'Iron Narrows', start: 520, end: 612, kind: 'narrows', hint: 'Teeth on the banks. Keep the hull clear.' },
  { id: 'cedar-pool', name: 'Cedar Pool', start: 612, end: 650, kind: 'calm', hint: 'Reset your rhythm for the last descent.' },
  { id: 'last-descent', name: 'The Last Descent', start: 650, end: 742, kind: 'rapids', hint: 'Commit to a gap before the fast water.' },
  { id: 'home-reach', name: 'Home Reach', start: 742, end: 782, kind: 'calm', hint: 'One final stretch. Still together?' },
  { id: 'grand-waterworks', name: 'The Grand Waterworks', start: 782, end: FINISH_Z, kind: 'finish', hint: 'Bring everybody under the bridge.' },
];

const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const WIDTHS = [
  [138, 12.5], [156, 12.5], [176, 8.5], [234, 8.5], [250, 12], [270, 12],
  [288, 8.5], [304, 8.5], [322, 6.5], [340, 6.5], [358, 8.5], [374, 12], [390, 12],
  [410, 8.5], [458, 8.5], [480, 12], [510, 12], [532, 8], [550, 6.5], [580, 6.5],
  [602, 9], [622, 12], [640, 12], [660, 8.5], [690, 8.5], [714, 7],
  [740, 12], [770, 12], [792, 11], [840, 12.5],
] as const;

export function channelHalfWidth(z: number): number {
  if (z <= WIDTHS[0][0]) return WIDTHS[0][1];
  for (let i = 1; i < WIDTHS.length; i++) {
    const a = WIDTHS[i - 1]!; const b = WIDTHS[i]!;
    if (z <= b[0]) return a[1] + (b[1] - a[1]) * smooth(a[0], b[0], z);
  }
  return WIDTHS[WIDTHS.length - 1]![1];
}

export const ROCKS = [
  { id: 'split-rock', x: 0, z: 27, radius: 1.15 },
  { id: 'gorge-rock', x: -3, z: 73, radius: 1.3 },
  { id: 'last-rock', x: 4.5, z: 109, radius: 1.1 },
  { id: 'vortex-heart', x: -5, z: 112, radius: 0.72 },
  { id: 'slalom-left', x: -2.5, z: 192, radius: 1.25 },
  { id: 'slalom-right', x: 3.8, z: 214, radius: 1.35 },
  { id: 'slalom-exit', x: -3.8, z: 234, radius: 1.2 },
  { id: 'steps-left', x: -5, z: 294, radius: 1.05 },
  { id: 'steps-right', x: 3.6, z: 314, radius: 1.15 },
  { id: 'steps-center', x: -1.8, z: 340, radius: 1 },
  { id: 'timber-entry', x: -4.7, z: 410, radius: 1.2 },
  { id: 'timber-exit', x: 4.6, z: 478, radius: 1.15 },
  { id: 'narrows-entry', x: -3.7, z: 536, radius: 1.1 },
  { id: 'narrows-center', x: 2.8, z: 574, radius: 1.05 },
  { id: 'descent-left', x: -4.3, z: 666, radius: 1.25 },
  { id: 'descent-right', x: 3.8, z: 688, radius: 1.2 },
  { id: 'descent-fork', x: -1.5, z: 716, radius: 1.1 },
];
// Upright iron teeth: render and collision share a submerged base at -0.35m.
export const SPIKES = [
  { id: 'iron-tooth-1', x: -6, z: 55, radius: 0.42, height: 1.6 },
  { id: 'iron-tooth-2', x: -4.95, z: 55.8, radius: 0.38, height: 1.3 },
  { id: 'iron-tooth-3', x: -7, z: 56.3, radius: 0.44, height: 1.8 },
  { id: 'iron-tooth-4', x: 6.4, z: 89, radius: 0.45, height: 1.75 },
  { id: 'iron-tooth-5', x: 7.35, z: 90, radius: 0.38, height: 1.4 },
  { id: 'iron-tooth-6', x: 5.4, z: 90.7, radius: 0.4, height: 1.55 },
  { id: 'gorge-tooth-1', x: 6, z: 204, radius: 0.45, height: 1.65 },
  { id: 'gorge-tooth-2', x: 6.9, z: 205.2, radius: 0.4, height: 1.4 },
  { id: 'steps-tooth-1', x: -5.4, z: 326, radius: 0.44, height: 1.8 },
  { id: 'steps-tooth-2', x: -4.5, z: 327.3, radius: 0.42, height: 1.5 },
  { id: 'narrows-tooth-1', x: -5.3, z: 553, radius: 0.45, height: 1.75 },
  { id: 'narrows-tooth-2', x: -4.4, z: 554.2, radius: 0.4, height: 1.5 },
  { id: 'narrows-tooth-3', x: 5.2, z: 594, radius: 0.46, height: 1.8 },
  { id: 'narrows-tooth-4', x: 4.3, z: 595.2, radius: 0.4, height: 1.45 },
  { id: 'descent-tooth-1', x: -5.8, z: 698, radius: 0.43, height: 1.7 },
  { id: 'descent-tooth-2', x: -4.9, z: 699.2, radius: 0.4, height: 1.45 },
];
export const WHIRLPOOL = { x: -5, z: 112, radius: 5, depth: 0.55, swirl: 6, inward: 2 } as const;
export type Sweeper = {
  id: string; z: number; halfLength: number; radius: number;
  amplitude: number; period: number; baseY: number;
};
export const SWEEPER: Sweeper = {
  id: 'timber-sweeper', z: 93, halfLength: 2.1, radius: 0.32,
  amplitude: 5, period: 14, baseY: 0.15,
};
export const SWEEPERS: readonly Sweeper[] = [
  SWEEPER,
  { id: 'timber-gate-1', z: 427, halfLength: 2, radius: 0.35, amplitude: 4.6, period: 17, baseY: 0.16 },
  { id: 'timber-gate-2', z: 452, halfLength: 2.15, radius: 0.37, amplitude: 4.4, period: 21, baseY: 0.16 },
];

// Shared authoritative clock: clients display this pose; only the server collider
// can cause contact. Capsule halfLength is the half-distance between its endcaps.
export function sampleSweeper(time: number, sweeper: Sweeper = SWEEPER): Vec3 {
  return { x: sweeper.amplitude * Math.sin(time * Math.PI * 2 / sweeper.period), y: sweeper.baseY, z: sweeper.z };
}

export const PYLONS = [
  { x: -4.5, z: 19 }, { x: 4.5, z: 19 },
  { x: -7, z: 36 }, { x: 1, z: 36 },
  { x: -1, z: 62 }, { x: 7, z: 62 },
  { x: -5.5, z: 84 }, { x: 2.5, z: 84 },
  { x: -3.4, z: 119 }, { x: 3.4, z: 119 },
  { x: -5.6, z: 182 }, { x: 5.6, z: 182 },
  { x: -4.5, z: 304 }, { x: 4.5, z: 304 },
  { x: -5, z: 402 }, { x: 5, z: 402 },
  { x: -3.9, z: 560 }, { x: 3.9, z: 560 },
  { x: -4.2, z: 724 }, { x: 4.2, z: 724 },
];
export const RAPIDS = [
  { start: 278, end: 358, strength: 1.3 },
  { start: 538, end: 602, strength: 0.6 },
  { start: 650, end: 734, strength: 1.65 },
] as const;

// Same sampler drives authoritative forces and client geometry. Same-runtime
// repeatability only: cross-platform sine determinism is a later experiment.
export function sampleWater(x: number, z: number, time: number, calm = false) {
  if (calm) return { height: 0, velocity: { x: 0, y: 0, z: 0 }, zone: 'headwaters' };
  const a = x * 0.32 + z * 0.18 + time * 1.3;
  const b = z * 0.52 - time * 1.7;
  const seam = smooth(40, 48, z) * (1 - smooth(70, 78, z));
  const dx = (x - WHIRLPOOL.x) / WHIRLPOOL.radius;
  const dz = (z - WHIRLPOOL.z) / WHIRLPOOL.radius;
  // Compact C1 envelope: no singular core, discontinuous rim or whole-river pull.
  const envelope = Math.max(0, 1 - dx * dx - dz * dz) ** 2;
  let rapids = 0;
  for (const zone of RAPIDS) rapids += zone.strength * smooth(zone.start, zone.start + 10, z) * (1 - smooth(zone.end - 10, zone.end, z));
  return {
    height: 0.035 * Math.sin(a) + 0.018 * Math.sin(b) - WHIRLPOOL.depth * envelope
      + rapids * (0.055 * Math.sin(z * 1.1 - time * 3.2 + x * 0.45) + 0.025 * Math.sin(x * 1.8 + z * 0.7 + time * 2.6)),
    velocity: {
      x: 0.65 * seam + (-dz * WHIRLPOOL.swirl - dx * WHIRLPOOL.inward) * envelope
        + rapids * 0.32 * Math.sin(z * 0.045 + time * 0.2),
      y: 0,
      z: 0.12 + 0.16 * seam + (dx * WHIRLPOOL.swirl - dz * WHIRLPOOL.inward) * envelope
        + rapids * (0.9 + 0.1 * Math.sin(x * 0.6 + z * 0.035)),
    },
    zone: envelope > 0.01 ? 'whirlpool' : seam > 0.1 ? 'cross-current' : rapids > 0.01 ? 'rapids' : z > 138 ? 'gorge' : 'headwaters',
  };
}

export function bladeReaction(relative: Vec3, immersion: number): Vec3 {
  const force = {
    x: -30 * relative.x * Math.abs(relative.x) * immersion,
    y: 0,
    z: -52 * relative.z * Math.abs(relative.z) * immersion,
  };
  const scale = Math.min(1, 420 / Math.max(0.001, Math.hypot(force.x, force.z)));
  return { x: force.x * scale, y: 0, z: force.z * scale };
}
