export function fanKey(event:{code?:string;key?:string}) {
  if(['KeyA','KeyD','ArrowLeft','ArrowRight','Space'].includes(event.code??''))return event.code;
  return ({a:'KeyA',d:'KeyD',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight',' ':'Space'} as Record<string,string>)[event.key?.length===1?event.key.toLowerCase():event.key??''];
}
export class FanControls {
  readonly keys=new Set<string>();
  readonly touches=new Map<number,string>();
  action() {
    const held=new Set([...this.keys,...this.touches.values()]);
    return {fan:held.has('Space'),scoot:Number(held.has('KeyD')||held.has('ArrowRight'))-Number(held.has('KeyA')||held.has('ArrowLeft'))};
  }
  clear(){this.keys.clear();this.touches.clear();}
}
