import {FAN_CYCLE,type FanSnapshot} from '../shared/fan';

export type FanLesson={step:0|1|2|3;resetId:number;startStrokes:number};
export const lessonCopy=[
  'Hold Space to wave your fan. The raft moves the other way.',
  'Scoot with A / D, then fan again to turn the raft.',
  'Now release Space. Let the raft glide to a stop.',
  'You’ve got it. Head through the first arch!',
] as const;

export function fanFeedback(s:FanSnapshot,seat:number) {
  const f=s.fans[seat];
  if(s.paused)return {label:'Paused',phase:'paused',recovery:1};
  if(!f||s.stage!=='playing'||s.condition!=='afloat'||s.complete)return {label:'Ready',phase:'ready',recovery:1};
  const recovery=Math.max(0,Math.min(1,f.phase/FAN_CYCLE));
  if(f.power>.1)return {label:'Whoosh!',phase:'push',recovery};
  if(f.phase<FAN_CYCLE)return {label:f.phase<.05?'Winding up':'Recovering',phase:'recovery',recovery};
  if(Math.hypot(s.velocity.x,s.velocity.z)>.04)return {label:'Gliding',phase:'coast',recovery};
  return {label:'Ready',phase:'ready',recovery};
}

export function advanceFanLesson(previous:FanLesson,s:FanSnapshot,seat:number,controls:{blocked:boolean;fanHeld:boolean}):FanLesson {
  const f=s.fans[seat];
  if(!f)return previous;
  const state:FanLesson=previous.resetId===s.resetId?{...previous}:{step:0,resetId:s.resetId,startStrokes:f.strokes};
  if(s.mode!=='practice'||s.stage!=='playing'||s.paused||s.complete||s.condition!=='afloat'||controls.blocked)return state;
  const strokes=f.strokes-state.startStrokes;
  if(state.step===0&&strokes>0)state.step=1;
  else if(state.step===1&&strokes>=2&&Math.abs(f.slide)>.12&&f.power>.1)state.step=2;
  else if(state.step===2&&!controls.fanHeld&&f.phase>=FAN_CYCLE&&Math.hypot(s.velocity.x,s.velocity.z)<.04)state.step=3;
  return state;
}
