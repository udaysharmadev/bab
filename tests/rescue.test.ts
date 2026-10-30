import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {BoatSimulation,initPhysics} from '../src/shared/simulation';
import {PaddleStroke} from '../src/shared/rowing';
import {DT,PHYSICS_VERSION,rotate,type RowAction} from '../src/shared/protocol';
import {RESCUE_EDDY as eddy,sampleRescueCurrent,sampleWater,sampleWaterHeight,CHECKPOINTS,ROCKS,SPIKES,PYLONS,SWEEPERS,bankEdge} from '../src/shared/world';

before(initPhysics);
const measurements:object[]=[];
after(()=>writeFileSync('evidence/rescue.json',JSON.stringify({result:measurements.length===4?'PASS':'FAIL',physics:PHYSICS_VERSION,generatedUTC:new Date().toISOString(),eddy,measurements,scope:'Deterministic current and real Rapier coasting/rowing traces. Automated steering exists in this test only; no human comprehension/fairness or Internet/device acceptance.'},null,2)+'\n'));

test('Recovery eddy has bounded curl, a smooth zero rim and no height change or suction',()=>{
  let maxSpeed=0,maxDivergence=0,checks=0;
  for(let x=-12;x<=2;x+=.2)for(let z=363;z<=394;z+=.2){
    const flow=sampleRescueCurrent(x,z),water=sampleWater(x,z,3.7),epsilon=.00001;
    const divergence=(sampleRescueCurrent(x+epsilon,z).x-sampleRescueCurrent(x-epsilon,z).x+sampleRescueCurrent(x,z+epsilon).z-sampleRescueCurrent(x,z-epsilon).z)/(2*epsilon);
    maxDivergence=Math.max(maxDivergence,Math.abs(divergence));assert(Math.abs(divergence)<1e-6);
    maxSpeed=Math.max(maxSpeed,Math.hypot(water.velocity.x,water.velocity.z));assert(maxSpeed<1.6);
    assert.equal(water.height,sampleWaterHeight(x,z,3.7));
    const dx=(x-eddy.x)/eddy.radiusX,dz=(z-eddy.z)/eddy.radiusZ;
    assert(Math.abs(dx*flow.x/eddy.radiusX+dz*flow.z/eddy.radiusZ)<1e-12,'Curl must not pull radially into a core');
    if(dx*dx+dz*dz>=1)assert.deepEqual(flow,{x:0,z:0,weight:0});
    checks++;
  }
  for(let angle=0;angle<Math.PI*2;angle+=.05){
    const at=(r:number)=>sampleRescueCurrent(eddy.x+Math.cos(angle)*eddy.radiusX*r,eddy.z+Math.sin(angle)*eddy.radiusZ*r);
    const inner=at(1-.00001),outer=at(1+.00001);
    assert(Math.hypot(inner.x-outer.x,inner.z-outer.z)<3e-9);assert(inner.weight<1e-8);
  }
  assert(maxSpeed>1,'The eddy must exert meaningful bounded flow');
  measurements.push({case:'smooth-bounded-curl',checks,maxSpeed,maxDivergence});
});

test('Recovery pocket leaves canonical hull/blade spawn lanes and lethal obstacles clear',()=>{
  let checks=0;
  for(const z of CHECKPOINTS)for(const x of [-1.45,-.72,0,.72,1.45])for(const dz of [-2.3,0,2.3]){
    assert.deepEqual(sampleRescueCurrent(x,z+dz),{x:0,z:0,weight:0});checks++;
  }
  assert(eddy.x-eddy.radiusX>bankEdge(eddy.z,-1)+1);
  for(const hazard of [...ROCKS,...SPIKES,...PYLONS,...SWEEPERS]){
    assert(hazard.z<eddy.z-eddy.radiusZ-5||hazard.z>eddy.z+eddy.radiusZ+5,'Recovery pool must not hide a lethal obstacle');checks++;
  }
  measurements.push({case:'checkpoint-and-hazard-clearance',checks});
});

function approach(x:number,z:number){
  const sim=new BoatSimulation();sim.checkpoint=4;
  sim.hull.setTranslation({x,y:.08,z},true);sim.hull.setLinvel({x:0,y:0,z:1.2},true);
  return sim;
}

test('An unpowered hull slows and circulates in the recovery bay without wreck, reset or fake propulsion',()=>{
  const traces=[];let upstreamSamples=0;
  for(const x of [-8,-6,-4])for(const z of [371,376,382]){
    const sim=approach(x,z),path=[];let minSpeed=Infinity,minUp=1;
    try{
      for(let tick=0;tick<1800;tick++){
        sim.step();const p=sim.hull.translation(),v=sim.hull.linvel();
        const speed=Math.hypot(v.x,v.z);minSpeed=Math.min(minSpeed,speed);minUp=Math.min(minUp,rotate({x:0,y:1,z:0},sim.hull.rotation()).y);
        if(v.z<-.1)upstreamSamples++;
        assert(p.x>bankEdge(p.z,-1)+.8&&p.x<1&&p.z>365&&p.z<397);
        assert.equal(sim.condition,'afloat');assert.equal(sim.resetId,0);assert.equal(sim.recoveryId,0);assert.equal(sim.crashId,0);
        if(tick%300===299)path.push({...p});
      }
      assert(minSpeed<.4&&sim.maxSpeed<1.7&&minUp>.9);assert(sim.strokes.every(count=>count===0));
      traces.push({entry:{x,z,speed:1.2},path,minSpeed,minUp,maxSpeed:sim.maxSpeed});
    }finally{sim.dispose();}
  }
  assert(upstreamSamples>60,'Recirculation must include observable upstream return flow');
  measurements.push({case:'nine-passive-hull-approaches',traces,upstreamSamples});
});

test('All four real paddles can steer out and rejoin downstream with bounded force and no recovery teleport',()=>{
  const traces=[];
  for(const [x,z] of [[-6,376],[-8,371],[-4,376]]){
    const sim=approach(x!,z!),strokes=Array.from({length:4},()=>new PaddleStroke()),path=[];
    try{
      for(let tick=0;tick<360;tick++)sim.step();
      for(let seat=0;seat<4;seat++)sim.setActive(seat,true);
      let row:RowAction={forward:0,turn:0},ticks=0,maxForce=0;
      for(;ticks<3600;ticks++){
        // Test crew only: choose ordinary digital controls twice a second.
        // The shipped game contains no steering controller or target position.
        if(ticks%30===0){
          const p=sim.hull.translation(),bow=rotate({x:0,y:0,z:1},sim.hull.rotation());
          const heading=Math.atan2(-p.x,394-p.z)-Math.atan2(bow.x,bow.z),error=Math.atan2(Math.sin(heading),Math.cos(heading));
          const steering=error-sim.hull.angvel().y*.8;
          row={forward:Math.abs(error)<.5?1:0,turn:Math.abs(steering)>.22?-Math.sign(steering):0};
        }
        for(let seat=0;seat<4;seat++)sim.accept(seat,{seq:ticks+1,...strokes[seat]!.sampleAction(row,seat,sim.tick*DT)},row);
        sim.step();maxForce=Math.max(maxForce,...sim.blades.map(blade=>blade.force));
        assert(maxForce<=420.001);assert.equal(sim.condition,'afloat');assert.equal(sim.resetId,0);assert.equal(sim.recoveryId,0);
        if(ticks%300===299)path.push({...sim.hull.translation()});
        if(Math.abs(sim.hull.translation().x)<1.5&&sim.hull.translation().z>391)break;
      }
      assert(ticks<3600,'The test crew must rejoin within60 simulated seconds');assert(sim.strokes.every(count=>count>0));assert.equal(sim.checkpoint,5);
      traces.push({entry:{x,z},seconds:ticks*DT,path,exit:{...sim.hull.translation()},strokes:sim.strokes,maxForce});
    }finally{sim.dispose();}
  }
  measurements.push({case:'four-paddle-downstream-rejoin',traces});
});
