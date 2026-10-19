import {before,test} from 'node:test';
import assert from 'node:assert/strict';
import {BoatSimulation,initPhysics} from '../src/shared/simulation';
import {WATERWHEEL,sampleWaterwheel} from '../src/shared/world';
import {DT} from '../src/shared/protocol';
before(initPhysics);
test('Waterwheel is a real shared-clock kinematic hazard; reset preserves its phase',()=>{
 const sim=new BoatSimulation(true);
 try{
  for(let tick=0;tick<1200;tick++)sim.step();
  const expected=sampleWaterwheel(sim.tick*DT),actual=sim.wheel.rotation();
  assert(Math.abs(actual.x*expected.x+actual.w*expected.w)>.99999);
  const time=sim.tick;sim.checkpoint=5;sim.reset();sim.step();assert.equal(sim.tick,time+1);
  const after=sampleWaterwheel(sim.tick*DT),rotation=sim.wheel.rotation();
  assert(Math.abs(rotation.x*after.x+rotation.w*after.w)>.99999);
  assert.equal(sim.condition,'afloat');
 }finally{sim.dispose();}
});
test('Actual waterwheel paddle/rim contact breaks once; the marked left bypass remains clear through two rotations',()=>{
 const hit=new BoatSimulation(true);
 try{
  hit.hull.setTranslation({x:WATERWHEEL.x,y:.08,z:WATERWHEEL.z-2},true);
  for(let i=0;i<120&&hit.condition==='afloat';i++)hit.step();
  assert.equal(hit.condition,'breaking');assert.equal(hit.obstacleId,WATERWHEEL.id);assert.equal(hit.crashId,1);
  for(let i=0;i<180;i++)hit.step();assert.equal(hit.condition,'sunk');assert.equal(hit.crashId,1);
  assert(hit.blades.every(blade=>blade.state==='DISABLED'));
 }finally{hit.dispose();}
 const bypass=new BoatSimulation(true);
 try{
  bypass.hull.setTranslation({x:-3.8,y:.08,z:WATERWHEEL.z},true);
  for(let i=0;i<WATERWHEEL.period*2/DT;i++)bypass.step();
  assert.equal(bypass.condition,'afloat');assert.equal(bypass.crashId,0);assert(bypass.maxSpeed<2);
 }finally{bypass.dispose();}
});
