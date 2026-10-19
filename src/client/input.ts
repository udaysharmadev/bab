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
