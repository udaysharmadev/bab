export const PROTOCOL_VERSION = 5;
export const PHYSICS_VERSION = 'basin-0.5';
export const DT = 1 / 60;
export const SEATS = [
  { name: 'Bow · Port', side: -1, z: 0.95, color: '#f1ad59' },
  { name: 'Bow · Starboard', side: 1, z: 0.95, color: '#79c6bb' },
  { name: 'Stern · Port', side: -1, z: -0.95, color: '#df8679' },
  { name: 'Stern · Starboard', side: 1, z: -0.95, color: '#a8b5e0' },
] as const;

export type Vec3 = { x: number; y: number; z: number };
export type Quat = Vec3 & { w: number };
export type Intent = { seq: number; x: number; z: number; dip: number };
export type RowAction = { forward: number; turn: number };
export type RowIntent = RowAction & { seq: number };
export type Blade = {
  x: number; y: number; z: number; immersion: number;
  force: number; state: 'AIR' | 'WATER' | 'BRACE' | 'DISABLED';
};
export type Crew = { seat: number; connected: boolean; ready: boolean };
export type Snapshot = {
  protocol: number; physics: string; tick: number;
  position: Vec3; rotation: Quat; velocity: Vec3;
  blades: Blade[]; ack: number[]; crew: Crew[];
  checkpoint: number; revision: number; resetId: number;
  recoveryId?: number; recoveryReason?: 'none' | 'grounded' | 'capsized' | 'unstable';
  mode: 'practice' | 'expedition'; paused: boolean; complete: boolean;
  reconnectSeconds?: number;
  stage: 'lobby' | 'playing';
  condition: 'afloat' | 'breaking' | 'sunk'; wreckAge: number; crashId: number; obstacleId: string | null;
  strokes: number[]; droppedSteps: number;
  /** Seconds until expedition launches (lobby countdown). 0 or absent = no countdown active. */
  countdownSeconds?: number;
  /** Elapsed play time in milliseconds at finish. Absent until complete. */
  finishTimeMs?: number;
  /** How many crew members have voted for a mid-run reset (Return to Checkpoint). */
  resetVotes?: number;
  /** How many votes are needed for a mid-run reset. */
  resetVotesNeeded?: number;
  resetVoters?: number[];
  resetVoteSeconds?: number;
};

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function validateRowIntent(value: unknown, previousSeq: number): value is RowIntent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).every(key => ['seq', 'forward', 'turn'].includes(key))
    && typeof v.seq === 'number' && Number.isSafeInteger(v.seq)
    && v.seq > previousSeq && v.seq <= previousSeq + 10000
    && typeof v.forward === 'number' && [-1, 0, 1].includes(v.forward)
    && typeof v.turn === 'number' && [-1, 0, 1].includes(v.turn);
}

export function validateIntent(value: unknown, previousSeq: number): value is Intent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !['seq', 'x', 'z', 'dip'].includes(key))) return false;
  return typeof v.seq === 'number' && Number.isSafeInteger(v.seq)
    && v.seq > previousSeq && v.seq <= previousSeq + 10000
    && typeof v.x === 'number' && Number.isFinite(v.x) && Math.abs(v.x) <= 1
    && typeof v.z === 'number' && Number.isFinite(v.z) && Math.abs(v.z) <= 1
    && typeof v.dip === 'number' && Number.isFinite(v.dip) && v.dip >= 0 && v.dip <= 1;
}

export function rotate(v: Vec3, q: Quat): Vec3 {
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + q.y * tz - q.z * ty,
    y: v.y + q.w * ty + q.z * tx - q.x * tz,
    z: v.z + q.w * tz + q.x * ty - q.y * tx,
  };
}

export function localToWorld(v: Vec3, position: Vec3, rotation: Quat): Vec3 {
  const r = rotate(v, rotation);
  return { x: r.x + position.x, y: r.y + position.y, z: r.z + position.z };
}
