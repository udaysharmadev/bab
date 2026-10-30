import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceFanLesson,fanFeedback,type FanLesson} from '../src/client/fan-feedback';
import {FAN_CYCLE,FAN_PHYSICS,FAN_PROTOCOL,FAN_WORLD,type FanSnapshot} from '../src/shared/fan';
function snapshot():FanSnapshot{return {
  protocol:FAN_PROTOCOL,physics:FAN_PHYSICS,world:FAN_WORLD,tick:0,clock:0,position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0,w:1},velocity:{x:0,y:0,z:0},
  fans:Array.from({length:4},()=>({slide:0,phase:FAN_CYCLE,power:0,strokes:0})),ack:[0,0,0,0],crew:[],mode:'practice',stage:'playing',paused:false,
  condition:'afloat',complete:false,checkpoint:0,resetId:1,crashId:0,obstacle:null,seconds:0,countdown:0,reconnectSeconds:90,resetVotes:0,resetNeeded:1,
};}
test('Owned feedback distinguishes stroke, recovery, glide and rest without treating another fan as your action',()=>{
  const s=snapshot();assert.equal(fanFeedback(s,2).phase,'ready');
  s.fans[0]!.power=1;assert.equal(fanFeedback(s,2).phase,'ready');
  s.fans[2]!.phase=.1;s.fans[2]!.power=.8;assert.equal(fanFeedback(s,2).phase,'push');
  s.fans[2]!.phase=.4;s.fans[2]!.power=0;assert.equal(fanFeedback(s,2).phase,'recovery');
  s.fans[2]!.phase=FAN_CYCLE;s.velocity.x=.5;assert.equal(fanFeedback(s,2).phase,'coast');
  s.paused=true;assert.equal(fanFeedback(s,2).phase,'paused');assert.equal(fanFeedback(s,2).recovery,1);
});
test('Practice lesson requires owned stroke, offset power and released settled rest; blocked states cannot advance it and retry resets it',()=>{
  const s=snapshot(),controls={blocked:false,fanHeld:false};let state:FanLesson={step:0,resetId:1,startStrokes:0};
  s.fans[0]!.strokes=4;assert.equal(advanceFanLesson(state,s,2,controls).step,0);
  s.fans[2]!.strokes=1;state=advanceFanLesson(state,s,2,controls);assert.equal(state.step,1);
  s.fans[2]!.strokes=2;s.fans[2]!.slide=.2;assert.equal(advanceFanLesson(state,s,2,controls).step,1,'Scoot without power does not prove an offset stroke');
  s.fans[2]!.power=.8;
  for(const block of ['paused','complete'] as const){s[block]=true;assert.equal(advanceFanLesson(state,s,2,controls).step,1);s[block]=false;}
  assert.equal(advanceFanLesson(state,s,2,{...controls,blocked:true}).step,1);
  s.condition='wrecked';assert.equal(advanceFanLesson(state,s,2,controls).step,1);s.condition='afloat';
  state=advanceFanLesson(state,s,2,controls);assert.equal(state.step,2);
  s.fans[2]!.power=0;s.velocity.z=.2;assert.equal(advanceFanLesson(state,s,2,controls).step,2);
  s.velocity.z=0;assert.equal(advanceFanLesson(state,s,2,{...controls,fanHeld:true}).step,2);
  state=advanceFanLesson(state,s,2,controls);assert.equal(state.step,3);
  s.resetId++;state=advanceFanLesson(state,s,2,controls);assert.equal(state.step,0);
  assert.equal(advanceFanLesson(state,s,2,controls).step,0,'Old strokes from before retry cannot complete the fresh lesson');
  const waiting:FanLesson={step:0,resetId:-1,startStrokes:0};
  assert.equal(advanceFanLesson(waiting,s,-1,controls).resetId,-1,'Wait for owned seat before capturing retry baseline');
  assert.equal(advanceFanLesson(waiting,s,2,controls).step,0,'Joining a previously used station starts a fresh lesson');
});
