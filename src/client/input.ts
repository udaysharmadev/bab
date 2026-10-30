import { rowingAction } from '../shared/rowing';
import type { RowAction } from '../shared/protocol';
export { PaddleStroke, rowingAction, type PaddleTarget } from '../shared/rowing';

export const DEFAULT_KEYS = { forward: 'KeyW', reverse: 'KeyS', left: 'KeyA', right: 'KeyD' } as const;
export type ControlAction = keyof typeof DEFAULT_KEYS;
export type KeyBindings = Record<ControlAction, string>;
export function validBindings(value: unknown): value is KeyBindings {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const codes = Object.keys(DEFAULT_KEYS).map(action => record[action]);
  return Object.keys(record).length === 4 && codes.every(code => typeof code === 'string' && /^(Key[A-Z]|Digit[0-9])$/.test(code)) && new Set(codes).size === 4;
}

const bindings: Record<string, string> = {
  ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
  KeyW: 'KeyW', KeyA: 'KeyA', KeyS: 'KeyS', KeyD: 'KeyD',
  w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD',
};

// Keep aliases distinct: releasing W must not cancel a still-held Up arrow.
export function paddleKey(event: { code?: string; key?: string }, custom?: KeyBindings): string | undefined {
  for (const value of [event.code, event.key]) {
    const key = value && (Object.hasOwn(bindings, value) ? bindings[value] : Object.hasOwn(bindings, value.toLowerCase()) ? bindings[value.toLowerCase()] : undefined);
    if (key?.startsWith('Arrow')) return key;
    const code = value?.match(/^(Key[A-Z]|Digit[0-9])$/)?.[0]
      ?? (value?.match(/^[a-z]$/i) ? `Key${value.toUpperCase()}` : value?.match(/^[0-9]$/) ? `Digit${value}` : undefined);
    if (custom) {
      const action = (Object.keys(DEFAULT_KEYS) as ControlAction[]).find(action => custom[action] === code);
      if (action) return DEFAULT_KEYS[action];
    } else if (key) return key;
  }
  return undefined;
}

type Controller = Pick<Gamepad, 'connected' | 'mapping' | 'axes' | 'buttons'>;
export function controllerAction(pad?: Controller | null): RowAction {
  if (!pad?.connected || pad.mapping !== 'standard') return { forward: 0, turn: 0 };
  const axis = (index: number) => {
    const value = pad.axes[index];
    return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) > 0.35 ? Math.sign(value) : 0;
  };
  const pressed = (index: number) => Number(pad.buttons[index]?.pressed === true);
  return {
    forward: Math.sign(-axis(1) + pressed(12) - pressed(13)),
    turn: Math.sign(axis(0) + pressed(15) - pressed(14)),
  };
}

// Keep physical keys and each pointer independent: lifting a finger cannot
// release a key (or a second finger) that is still held.
export class PaddleInput {
  readonly keyboard = new Set<string>();
  readonly touches = new Map<number, string>();
  private controller: RowAction = { forward: 0, turn: 0 };
  private controllerArmed = false;
  updateController(pad: Controller | null | undefined, enabled: boolean): boolean {
    const previous = this.action();
    const next = enabled ? controllerAction(pad) : { forward: 0, turn: 0 };
    if (!enabled || !pad?.connected) this.controllerArmed = false;
    else if (!next.forward && !next.turn) this.controllerArmed = true;
    this.controller = this.controllerArmed && enabled ? next : { forward: 0, turn: 0 };
    const current = this.action();
    return previous.forward !== current.forward || previous.turn !== current.turn;
  }
  action(): RowAction {
    const keys = rowingAction(new Set([...this.keyboard, ...this.touches.values()]));
    return { forward: Math.sign(keys.forward + this.controller.forward), turn: Math.sign(keys.turn + this.controller.turn) };
  }
  clear() {
    this.keyboard.clear(); this.touches.clear();
    this.controller = { forward: 0, turn: 0 }; this.controllerArmed = false;
  }
}
