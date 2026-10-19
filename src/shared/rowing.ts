import { SEATS, type RowAction } from './protocol';

export type PaddleTarget = { x: number; z: number; dip: number };

export function rowingAction(keys: ReadonlySet<string>): RowAction {
  const held = (arrow: string, letter: string) => keys.has(arrow) || keys.has(letter);
  return {
    forward: Number(held('ArrowUp', 'KeyW')) - Number(held('ArrowDown', 'KeyS')),
    turn: Number(held('ArrowRight', 'KeyD')) - Number(held('ArrowLeft', 'KeyA')),
  };
}

// The authority samples complete strokes at 60Hz, independent of client FPS
// and packet arrival cadence. Forces still come from bounded blade travel.
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
    return this.sampleAction(rowingAction(keys), seat, now);
  }

  sampleAction({ forward, turn }: RowAction, seat: number, now: number): PaddleTarget {
    const station = SEATS[seat];
    // +Z is forward; the chase camera sees +X on its left. A right turn
    // needs negative yaw: +X blades pull, -X blades reverse.
    const direction = station ? Math.sign(forward + turn * station.side) : 0;
    if (!Number.isFinite(now)) return this.reset();
    if (now - this.lastSample > 0.25 || now < this.lastSample) this.reset();
    this.lastSample = now;
    if (!direction) return this.reset();
    if (direction !== this.direction) {
      this.direction = direction;
      this.started = now - 0.3;
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
