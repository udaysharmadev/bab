import {before,test} from 'node:test';
import assert from 'node:assert/strict';
import {BoatSimulation,initPhysics} from '../src/shared/simulation';
import {WATERWHEEL,WATERWHEEL2,sampleWaterwheel,sampleWaterwheel2} from '../src/shared/world';
import {DT} from '../src/shared/protocol';
before(initPhysics);
test('Waterwheel is a real shared-clock kinematic hazard; reset preserves its phase',()=>{
 const sim=new BoatSimulation(true);
 try{
  for(let tick=0;tick<1200;tick++)sim.step();
  const second=sampleWaterwheel2(sim.tick*DT),secondActual=sim.wheel2.rotation();
  assert(Math.abs(secondActual.x*second.x+secondActual.w*second.w)>.99999);
  const expected=sampleWaterwheel(sim.tick*DT),actual=sim.wheel.rotation();
  assert(Math.abs(actual.x*expected.x+actual.w*expected.w)>.99999);
  const time=sim.tick;sim.checkpoint=5;sim.reset();sim.step();assert.equal(sim.tick,time+1);
  const after=sampleWaterwheel(sim.tick*DT),rotation=sim.wheel.rotation();
  assert(Math.abs(rotation.x*after.x+rotation.w*after.w)>.99999);
  assert.equal(sim.condition,'afloat');
 }finally{sim.dispose();}
});
for (const wheel of [WATERWHEEL,WATERWHEEL2]) test(`${wheel.id}: real contact breaks once; marked bypass survives two rotations`,()=>{
 const hit=new BoatSimulation(true);
 try{
  hit.hull.setTranslation({x:wheel.x,y:.08,z:wheel.z-2},true);
  for(let i=0;i<120&&hit.condition==='afloat';i++)hit.step();
  assert.equal(hit.condition,'breaking');assert.equal(hit.obstacleId,wheel.id);assert.equal(hit.crashId,1);
  for(let i=0;i<180;i++)hit.step();assert.equal(hit.condition,'sunk');assert.equal(hit.crashId,1);
  assert(hit.blades.every(blade=>blade.state==='DISABLED'));
 }finally{hit.dispose();}
 const bypass=new BoatSimulation(true);
 try{
  bypass.hull.setTranslation({x:-Math.sign(wheel.x)*3.8,y:.08,z:wheel.z},true);
  for(let i=0;i<wheel.period*2/DT;i++)bypass.step();
  assert.equal(bypass.condition,'afloat');assert.equal(bypass.crashId,0);assert(bypass.maxSpeed<2);
 }finally{bypass.dispose();}
});
