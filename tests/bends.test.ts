import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {BoatSimulation,initPhysics} from '../src/shared/simulation';
import {PHYSICS_VERSION} from '../src/shared/protocol';
import {RIVER_BENDS,CHECKPOINTS,channelCenter,channelSlope,riverX,bankEdge,bankVertices,sampleWater} from '../src/shared/world';
import {bankGeometry,riverbedGeometry} from '../src/client/riverbed';

before(initPhysics);
const measurements:{case:string;checks:number;maxError?:number}[]=[];
after(()=>writeFileSync('evidence/river-bends.json',JSON.stringify({result:measurements.length===5?'PASS':'FAIL',physics:PHYSICS_VERSION,date:new Date().toISOString(),bends:RIVER_BENDS,measurements,scope:'Deterministic geometry/field and real authority queries. Sampled passability/camera fixtures are necessary checks; human traversal remains open.'},null,2)+'\n'));

test('Five C2 bend seams preserve straight launch, checkpoints and bounded analytic slopes',()=>{
  let checks=0,maxError=0;
  for(const z of [0,138,...CHECKPOINTS]){assert.equal(channelCenter(z),0);assert.equal(channelSlope(z),0);checks++;}
  for(const bend of RIVER_BENDS){
    assert.equal(channelCenter((bend.start+bend.end)/2),bend.offset);
    for(const z of [bend.start,bend.end]){
      assert.equal(channelCenter(z),0);assert.equal(channelSlope(z),0);
      assert(Math.abs(channelSlope(z+.001)-channelSlope(z-.001))/.002<.00001);checks++;
    }
    for(let z=bend.start;z<=bend.end;z+=.1){
      const error=Math.abs((channelCenter(z+.00001)-channelCenter(z-.00001))/.00002-channelSlope(z));
      maxError=Math.max(maxError,error);assert(error<1e-7);assert(Math.abs(channelSlope(z))<.41);checks++;
    }
  }
  measurements.push({case:'curve-and-checkpoint-contract',checks,maxError});
});

test('Recorded water fields move with the river and rotate horizontal flow without adding speed',()=>{
  const baseline:{x:number;z:number;time:number;water:ReturnType<typeof sampleWater>}[]=JSON.parse(readFileSync('evidence/water-field-before-height-sampling.json','utf8'));
  let maxError=0;
  for(const point of baseline){
    const current=sampleWater(riverX(point.x,point.z),point.z,point.time),slope=channelSlope(point.z),inverse=1/Math.hypot(1,slope);
    const expected={height:point.water.height,x:(point.water.velocity.x+slope*point.water.velocity.z)*inverse,y:point.water.velocity.y,z:(point.water.velocity.z-slope*point.water.velocity.x)*inverse};
    for(const error of [current.height-expected.height,current.velocity.x-expected.x,current.velocity.y-expected.y,current.velocity.z-expected.z]){maxError=Math.max(maxError,Math.abs(error));assert(Math.abs(error)<1e-12);}
    assert.equal(current.zone,point.water.zone);
    assert(Math.abs(Math.hypot(current.velocity.x,current.velocity.z)-Math.hypot(point.water.velocity.x,point.water.velocity.z))<1e-12);
  }
  measurements.push({case:'independent-recorded-field-parity',checks:baseline.length,maxError});
});

test('Visible bank faces and actual convex prisms meet at shared seams throughout every bend',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0});let checks=0,maxError=0;
  try{
    for(const bend of RIVER_BENDS)for(let start=Math.floor(bend.start/5)*5;start<bend.end;start+=5)for(const side of [-1,1]){
      const descriptor=RAPIER.ColliderDesc.convexHull(bankVertices(start,side));assert(descriptor);
      const collider=world.createCollider(descriptor),geometry=bankGeometry(start,side),p=geometry.getAttribute('position');
      for(let i=0;i<p.count;i++){
        const z=start+2.5+p.getZ(i);
        if(Math.abs(p.getX(i)-bankEdge(z,side))>.00001)continue;
        const point={x:p.getX(i),y:.25,z},projection=collider.projectPoint(point,false);assert(projection);
        const error=Math.hypot(projection.point.x-point.x,projection.point.y-point.y,projection.point.z-point.z);
        maxError=Math.max(maxError,error);assert(error<.00025);checks++;
      }
      const current=bankVertices(start,side),next=bankVertices(start+5,side);
      for(let i=0;i<12;i++)assert.equal(current[12+i],next[i],'Adjacent bank end faces must be identical');
      geometry.dispose();world.removeCollider(collider,false);
    }
    assert(checks>500);measurements.push({case:'visible-bank-to-collider',checks,maxError});
  }finally{world.free();}
});

test('Authority ray queries find the visible bent bank and its normal without phantom straight walls',()=>{
  const sim=new BoatSimulation(true);let checks=0,maxError=0;
  try{
    sim.world.step();
    for(const bend of RIVER_BENDS)for(const fraction of [.2,.5,.8])for(const side of [-1,1]){
      const z=bend.start+(bend.end-bend.start)*fraction,x=channelCenter(z);
      const hit=sim.world.castRayAndGetNormal(new RAPIER.Ray({x,y:.25,z},{x:side,y:0,z:0}),30,true,undefined,undefined,undefined,sim.hull,c=>!sim.hazards.has(c.handle));
      assert(hit);const expected=Math.abs(bankEdge(z,side)-x),error=Math.abs(hit.timeOfImpact-expected);
      maxError=Math.max(maxError,error);assert(error<.00025);assert(hit.normal.x*side<-.7);checks++;
    }
    measurements.push({case:'real-world-bank-rays',checks,maxError});
  }finally{sim.dispose();}
});

test('Riverbed rows and deep lane remain under the bent navigable corridor',()=>{
  let checks=0;
  for(let start=150;start<780;start+=60){
    const geometry=riverbedGeometry(start),p=geometry.getAttribute('position');
    for(let i=0;i<p.count;i+=7){
      const z=p.getZ(i);assert(Math.abs(p.getX(i)-(bankEdge(z,-1)-.8))<.00002);assert(Math.abs(p.getX(i+6)-(bankEdge(z,1)+.8))<.00002);
      assert(p.getY(i+3)<=-1.79);checks++;
    }
    geometry.dispose();
  }
  measurements.push({case:'bed-and-lane-alignment',checks});
});
