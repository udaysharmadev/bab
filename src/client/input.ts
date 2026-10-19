import { rowingAction } from '../shared/rowing';
export { PaddleStroke, rowingAction, type PaddleTarget } from '../shared/rowing';

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

// Keep physical keys and each pointer independent: lifting a finger cannot
// release a key (or a second finger) that is still held.
export class PaddleInput {
  readonly keyboard = new Set<string>();
  readonly touches = new Map<number, string>();
  action() { return rowingAction(new Set([...this.keyboard, ...this.touches.values()])); }
  clear() { this.keyboard.clear(); this.touches.clear(); }
}
