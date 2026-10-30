import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {dangerRock,dangerVariant} from '../src/client/danger';
import {BoatSimulation,initPhysics} from '../src/shared/simulation';
import {CHECKPOINTS,FINISH_Z,SWEEPERS,sampleSweeper,sampleWaterwheel,sampleWaterwheel2} from '../src/shared/world';
import {DT} from '../src/shared/protocol';
import {PaddleStroke} from '../src/shared/rowing';
before(initPhysics);

test('Danger crowns stay inside physical rock volumes and use bounded shared variants',()=>{
  for(let variant=0;variant<3;variant++){
    const g=dangerRock(variant),p=g.getAttribute('position');
    for(let i=0;i<p.count;i++)assert(Math.hypot(p.getX(i),p.getY(i),p.getZ(i))<=1.000001,'No cosmetic tooth outside lethal volume');
    assert(p.count/3<500);assert(g.getAttribute('color').count===p.count);
    assert([...g.getAttribute('normal').array].every(Number.isFinite));g.dispose();
  }
  assert.equal(dangerVariant('split-rock'),dangerVariant('split-rock'));
  assert.equal(new Set(Array.from({length:30},(_,i)=>dangerVariant(`rock-${i}`))).size,3);
});

test('Crew mover phases match physical poses and retain safe checkpoints through retries',()=>{
  for(const phase of [0,3.725,27.5,89.125,119.999]){
    const sim=new BoatSimulation(false,20,phase);
    try{
      for(let checkpoint=0;checkpoint<CHECKPOINTS.length;checkpoint++){
        sim.checkpoint=checkpoint;sim.reset();
        for(let t=0;t<30;t++)sim.step();
        assert.equal(sim.condition,'afloat');assert.equal(sim.hazardPhase,phase);
        sim.sweepers.forEach((body,i)=>{
          const expected=sampleSweeper(sim.tick*DT+phase,SWEEPERS[i]!),p=body.translation();
          assert(Math.hypot(p.x-expected.x,p.y-expected.y,p.z-expected.z)<.0001);
        });
        for(const [body,sample] of [[sim.wheel,sampleWaterwheel],[sim.wheel2,sampleWaterwheel2]] as const){
          const q=body.rotation(),e=sample(sim.tick*DT+phase);assert(Math.abs(1-Math.abs(q.x*e.x+q.w*e.w))<.00001);
        }
      }
    }finally{sim.dispose();}
  }
});

test('270-second continuous four-paddle pacing diagnostic records actual propulsion',()=>{
  const sim=new BoatSimulation(true),strokes=Array.from({length:4},()=>new PaddleStroke());
  // Deliberately isolated straight flat water: no hazards or banks can turn,
  // stop or reset the hull. This is propulsion timing, not a human route run.
  const remove:number[]=[];sim.world.forEachCollider(c=>{if(c.handle!==sim.hullCollider.handle)remove.push(c.handle);});
  for(const handle of remove){const collider=sim.world.getCollider(handle);if(collider)sim.world.removeCollider(collider,true);}
  for(let seat=0;seat<4;seat++)sim.setActive(seat,true);
  try{
    for(let tick=0;tick<270/DT;tick++){
      for(let seat=0;seat<4;seat++)sim.accept(seat,{seq:tick+1,...strokes[seat]!.sampleAction({forward:1,turn:0},seat,tick*DT)},{forward:1,turn:0});
      sim.step();assert.equal(sim.condition,'afloat');
    }
    const distance=sim.hull.translation().z;
    assert(distance>100&&distance<FINISH_Z);
    const result={result:'PASS',seconds:270,distanceMetres:distance,averageMetresPerSecond:distance/270,routeMetres:FINISH_Z,flatWaterExtrapolatedSeconds:FINISH_Z/(distance/270),strokes:sim.strokes,scope:'Actual four-paddle flat-water diagnostic with obstacle/bank colliders removed. Not a full-route traversal, fastest-run lower bound or human completion certification. Rapids, steering, pauses and retries alter route duration.'};
    writeFileSync('evidence/route-pacing.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
  }finally{sim.dispose();}
});
