import { SEATS } from '../shared/protocol';

export type PaddleTarget = { x: number; z: number; dip: number };

const bindings: Record<string, string> = {
  ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
  KeyW: 'KeyW', KeyA: 'KeyA', KeyS: 'KeyS', KeyD: 'KeyD',
  w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD',
};

// Keep aliases distinct: releasing W must not cancel a still-held Up arrow.
export function paddleKey(event: { code?: string; key?: string }): string | undefined {
  for (const value of [event.code, event.key]) {
    if (value && Object.hasOwn(bindings, value)) return bindings[value];
    if (value && Object.hasOwn(bindings, value.toLowerCase())) return bindings[value.toLowerCase()];
  }
  return undefined;
}

// A complete 1.7s stroke: dry recovery, catch, submerged power, dry lift.
// The server still derives all force from actual bounded blade displacement.
export class PaddleStroke {
  private direction = 0;
  private started = 0;
  private lastSample = -Infinity;
  private target: PaddleTarget = { x: 0, z: 0, dip: 0 };

  reset(): PaddleTarget {
    this.direction = 0;
    this.target = { ...this.target, dip: 0 };
    return this.target;
  }

  sample(keys: ReadonlySet<string>, seat: number, now: number): PaddleTarget {
    const station = SEATS[seat];
    const held = (arrow: string, letter: string) => keys.has(arrow) || keys.has(letter);
    const forward = Number(held('ArrowUp', 'KeyW')) - Number(held('ArrowDown', 'KeyS'));
    const turn = Number(held('ArrowRight', 'KeyD')) - Number(held('ArrowLeft', 'KeyA'));
    // Right turn: port pulls forward, starboard reverses. Bow/stern agree.
    // Forward + turn: inner blade rests, outer blade rows forward.
    const direction = station ? Math.sign(forward - turn * station.side) : 0;
    if (!Number.isFinite(now)) return this.reset();
    if (now - this.lastSample > 0.25 || now < this.lastSample) this.reset();
    this.lastSample = now;
    if (!direction) return this.reset();
    if (direction !== this.direction) {
      this.direction = direction;
      this.started = now - 0.3; // Start dry at the middle of recovery, near neutral.
    }
    const phase = (now - this.started) % 1.7;
    let z: number;
    let dip = 0;
    if (phase < 0.6) z = -0.72 + 1.44 * phase / 0.6;
    else if (phase < 0.82) { z = 0.72; dip = 1; }
    else if (phase < 1.47) { z = 0.72 - 1.44 * (phase - 0.82) / 0.65; dip = 1; }
    else z = -0.72;
    this.target = { x: turn && !forward ? 0.55 : -0.25, z: z * direction, dip };
    return this.target;
  }
}
