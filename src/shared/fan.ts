import type { Quat, Vec3 } from './protocol';

export const FAN_PROTOCOL = 1;
export const FAN_PHYSICS = 'fan-raft-0.2';
export const FAN_WORLD = 'toy-bend-1';
export const FAN_DT = 1 / 60;
export const RAFT_RADIUS = 1.85;
export const FAN_CYCLE = .7;
export const FAN_SLIDE = .28;
export const FAN_FORCE = 1050;
export const COURSE_END = 156;
export const COURSE_HALF_WIDTH = 7.5;
export const FAN_CHECKPOINTS = [0, 76] as const;
const diagonal = Math.SQRT1_2;
export const FAN_SEATS = [
  { name:'Front right', x:-diagonal, z:diagonal, color:'#ffc84c' },
  { name:'Front left', x:diagonal, z:diagonal, color:'#ad83ec' },
  { name:'Back right', x:-diagonal, z:-diagonal, color:'#39c9c4' },
  { name:'Back left', x:diagonal, z:-diagonal, color:'#f27c83' },
] as const;
export type FanInput = { seq:number; fan:boolean; scoot:number };
export type FanPose = { slide:number; phase:number; strokes:number; power:number };
export type FanCrew = { seat:number; name:string; connected:boolean; ready:boolean };
export type FanSnapshot = {
  protocol:number; physics:string; world:string; tick:number; clock:number;
  position:Vec3; rotation:Quat; velocity:Vec3;
  fans:FanPose[]; ack:number[]; crew:FanCrew[];
  mode:'friends'|'practice'; stage:'lobby'|'playing'; paused:boolean;
  condition:'afloat'|'wrecked'; complete:boolean; checkpoint:number;
  resetId:number; crashId:number; obstacle:string|null; seconds:number;
  countdown:number; reconnectSeconds:number; resetVotes:number; resetNeeded:number;
};
export function validFanInput(value:unknown, previous:number):value is FanInput {
  if(!value||typeof value!=='object')return false;
  const v=value as Record<string,unknown>;
  return Object.keys(v).length===3&&Object.keys(v).every(k=>['seq','fan','scoot'].includes(k))
    && typeof v.seq==='number'&&Number.isSafeInteger(v.seq)&&v.seq>previous&&v.seq<=previous+10000
    && typeof v.fan==='boolean'&&typeof v.scoot==='number'&&[-1,0,1].includes(v.scoot);
}
export function fanStation(seat:number, slide:number) {
  const s=FAN_SEATS[seat]!;
  // Avatars face local +Z, so their right follows local -X around the station.
  return { x:s.x*1.16-s.z*slide, y:.28, z:s.z*1.16+s.x*slide };
}
export function fanPower(phase:number) {
  return phase>=.05&&phase<.29?Math.sin((phase-.05)/.24*Math.PI):0;
}

const bends = [[-16,0],[26,0],[58,5],[86,1],[118,-5],[148,0],[180,0]] as const;
function centreCurve(z:number) {
  for(let i=1;i<bends.length;i++) {
    const a=bends[i-1]!,b=bends[i]!;
    if(z<=b[0]) { const t=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0]))); return a[1]+(b[1]-a[1])*t*t*(3-2*t); }
  }
  return 0;
}
// The exact same two-metre chord is used by banks, water, colliders and current.
export function fanCentre(z:number) {
  const start=Math.floor(z/2)*2,t=(z-start)/2;
  return centreCurve(start)*(1-t)+centreCurve(start+2)*t;
}
export function fanCurrent(x:number,z:number,scale=1) {
  const slope=(fanCentre(z+1)-fanCentre(z-1))/2;
  const norm=Math.hypot(slope,1);
  return {x:(slope/norm*.95-(x-fanCentre(z))*.006)*scale,z:.95/norm*scale};
}
export function fanWater(x:number,z:number,time:number) {
  return .025*Math.sin(z*.45-time*1.6)+.018*Math.sin(x*.7+z*.21-time*1.1);
}
export function fanBankVertices(z:number,side:number) {
  const a=fanCentre(z)+side*COURSE_HALF_WIDTH,b=fanCentre(z+2)+side*COURSE_HALF_WIDTH;
  return new Float32Array([-1,3.2].flatMap(y=>[a,y,z,a+side*18,y,z,b+side*18,y,z+2,b,y,z+2]));
}
export const FAN_ROCKS = [
  {id:'soft-rock-1',z:26,offset:-3.8,radius:1.05},
  {id:'soft-rock-2',z:35,offset:3.7,radius:.95},
  {id:'soft-rock-3',z:125,offset:2.8,radius:1.1},
] as const;
export const FAN_RAILS = [
  {id:'teeth-left-1',z:46,side:-1,length:7,inset:.1},
  {id:'teeth-right-1',z:55,side:1,length:7,inset:.1},
  {id:'teeth-left-2',z:65,side:-1,length:6,inset:1.3},
  {id:'teeth-right-2',z:113,side:1,length:7,inset:.5},
  {id:'teeth-left-3',z:136,side:-1,length:7,inset:.8},
] as const;
export function railPosition(rail:typeof FAN_RAILS[number]) {
  return {x:fanCentre(rail.z)+rail.side*(COURSE_HALF_WIDTH-.3-rail.inset),z:rail.z};
}
export const FAN_SWEEPER = { x:fanCentre(97)-6.8,z:97,length:7.2,radius:.26 } as const;
export function fanSweepAngle(time:number) { return Math.sin(time*.62)*.9; }
