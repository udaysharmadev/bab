import {before,test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Quaternion,Euler} from 'three';
import {BoatSimulation,initPhysics} from '../src/shared/simulation';
import {DT,PHYSICS_VERSION,rotate} from '../src/shared/protocol';
before(initPhysics);
function flipped(roll=Math.PI,yaw=0,pitch=0,active=4){
 const sim=new BoatSimulation(true);sim.checkpoint=4;sim.hull.setTranslation({x:0,y:.08,z:264},true);
 sim.hull.setRotation(new Quaternion().setFromEuler(new Euler(pitch,yaw,roll,'YXZ')),true);
 for(let seat=0;seat<active;seat++)sim.setActive(seat,true);
 for(let i=0;i<120&&!sim.capsize;i++)sim.step();assert(sim.capsize,'Sustained inversion must expose a rescue window');return sim;
}
function help(sim:BoatSimulation,seats:number[]){for(const seat of seats)sim.accept(seat,{seq:sim.tick+1,x:0,z:0,dip:0},{forward:-1,turn:0});}

test('Cooperative righting uses bounded real torque across headings and both roll/pitch directions without teleport',()=>{
 const results=[];
 for(const [roll,pitch] of [[Math.PI,0],[2,0],[-2,0],[0,Math.PI],[0,2],[0,-2]])for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const sim=flipped(roll,yaw,pitch),start={...sim.hull.translation()},reset=sim.resetId,revision=sim.revision,strokes=[...sim.strokes];
  const addTorque=sim.hull.addTorque.bind(sim.hull);let maxTorque=0;
  sim.hull.addTorque=(torque,wake)=>{maxTorque=Math.max(maxTorque,Math.hypot(torque.x,torque.y,torque.z));assert.equal(torque.y,0);addTorque(torque,wake);};
  try{
   let ticks=0,maxStep=0,maxAngularSpeed=0;
   for(;ticks<700&&!sim.rightedId;ticks++){
    const before={...sim.hull.translation()};help(sim,[0,1,2]);sim.step();const p=sim.hull.translation(),w=sim.hull.angvel();
    maxStep=Math.max(maxStep,Math.hypot(p.x-before.x,p.y-before.y,p.z-before.z));maxAngularSpeed=Math.max(maxAngularSpeed,Math.hypot(w.x,w.y,w.z));
    assert.equal(sim.recoveryId,0);assert.equal(sim.resetId,reset);assert.equal(sim.crashId,0);assert.equal(sim.condition,'afloat');assert.equal(sim.revision,revision);
   }
   assert.equal(sim.rightedId,1);assert(!sim.capsize);assert.equal(sim.checkpoint,4);assert(maxTorque>0&&maxTorque<=2400.00001);assert(maxStep<.15);assert(maxAngularSpeed<9);
   assert(rotate({x:0,y:1,z:0},sim.hull.rotation()).y>.85);assert(Math.abs(sim.hull.translation().z-start.z)<4);
   assert.deepEqual(sim.strokes,strokes);assert(sim.paddles.every(p=>p.age>=999&&!p.row));
   for(let t=0;t<120;t++)sim.step();assert.equal(sim.rightedId,1);assert.equal(sim.recoveryId,0);assert(rotate({x:0,y:1,z:0},sim.hull.rotation()).y>.98);
   results.push({roll,pitch,yaw,seconds:ticks*DT,maxTorque,maxStep,maxAngularSpeed});
  }finally{sim.dispose();}
 }
 writeFileSync('evidence/capsize-physics.json',JSON.stringify({result:'PASS',physics:PHYSICS_VERSION,cases:results,scope:'Actual Rapier torque,24 heading/roll/pitch cases,3/4 crew;no pose setters during rescue. Gameplay righting assist,not human-force realism.'},null,2)+'\n');
});

test('Minority,wrong action,stale input and release cannot power righting; no-input timeout returns the saved checkpoint',()=>{
 const sim=flipped(),addTorque=sim.hull.addTorque.bind(sim.hull);let calls=0;sim.hull.addTorque=(v,w)=>{calls++;addTorque(v,w);};
 try{
  for(let i=0;i<120;i++){help(sim,[0,1]);sim.step();}assert.equal(calls,0);assert.equal(sim.capsize!.helpers,2);assert.equal(sim.capsize!.needed,3);
  sim.releaseInputs();for(let i=0;i<30;i++)sim.step();assert.equal(calls,0);
  for(let seat=0;seat<4;seat++)sim.accept(seat,{seq:sim.tick+1,x:0,z:0,dip:0},{forward:1,turn:0});sim.step();assert.equal(calls,0);
  help(sim,[0,1,2]);for(const p of sim.paddles)p.age=1;sim.step();assert.equal(calls,0);
  const reset=sim.resetId;for(let t=0;t<1000&&!sim.recoveryId;t++)sim.step();assert.equal(sim.recoveryId,1);assert.equal(sim.recoveryReason,'capsized');assert.equal(sim.resetId,reset+1);assert.equal(sim.hull.translation().z,260);assert.equal(sim.rightedId,0);
 }finally{sim.dispose();}
});

test('Practice rescue needs one active seat; release/reset/wreck clear rescue and damage retains priority',()=>{
 const sim=flipped(Math.PI,0,0,1);
 try{assert.equal(sim.capsize!.needed,1);for(let t=0;t<700&&!sim.rightedId;t++){help(sim,[0]);sim.step();}assert.equal(sim.rightedId,1);assert.equal(sim.recoveryId,0);
  sim.reset();assert(!sim.capsize);assert.equal(sim.inversionTicks,0);
 }finally{sim.dispose();}
 const crash=flipped();try{crash.hull.setTranslation({x:0,y:.08,z:27},true);help(crash,[0,1,2,3]);crash.step();assert.equal(crash.condition,'breaking');assert.equal(crash.crashId,1);assert(!crash.capsize);assert.equal(crash.rightedId,0);assert.equal(crash.recoveryId,0);}finally{crash.dispose();}
});
