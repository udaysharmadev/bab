import { clamp, SEATS, type RowAction, type Vec3 } from '../shared/protocol';
import { PaddleStroke } from '../shared/rowing';

// Visual rehearsal only. No authority clock, snapshot, force or stroke counter
// is changed. The same stroke cycle teaches hold/release at the frozen dock.
export class DockRehearsal {
  private stroke = new PaddleStroke();
  private x = 0;
  private z = 0;
  private dip = 0;
  private lastSample = -Infinity;
  private seat = -1;

  clear() {
    if (this.seat !== -1) this.stroke = new PaddleStroke();
    this.x = this.z = this.dip = 0;
    this.lastSample = -Infinity; this.seat = -1;
  }

  sample(action: RowAction, seat: number, now: number, dt: number): Vec3 | undefined {
    const station = SEATS[seat];
    if (!station || !Number.isFinite(now) || !Number.isFinite(dt)) { this.clear(); return; }
    if (seat !== this.seat || now < this.lastSample || now - this.lastSample > .25) this.clear();
    this.seat = seat; this.lastSample = now;
    const target = this.stroke.sampleAction(action, seat, now), step = clamp(dt, 0, .05);
    this.x += clamp(target.x - this.x, -3 * step, 3 * step);
    this.z += clamp(target.z - this.z, -2.7 * step, 2.7 * step);
    this.dip += clamp(target.dip - this.dip, -5 * step, 5 * step);
    return { x: station.side * (1.45 + this.x * .35), y: .62 - this.dip * 1.05, z: station.z + this.z * 1.1 };
  }
}
