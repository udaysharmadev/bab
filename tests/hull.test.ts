import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { BoatSimulation, initPhysics } from '../src/shared/simulation';
import { HULL_RING, HULL_PLANES, hullVertices } from '../src/shared/hull';
import { hullPanel } from '../src/client/hull';
import { localToWorld, PHYSICS_VERSION } from '../src/shared/protocol';

before(initPhysics);
const measurements:{case:string;checks:number;maxSurfaceErrorMetres?:number}[]=[];
after(()=>writeFileSync('evidence/hull-collision.json',JSON.stringify({result:measurements.length===4?'PASS':'FAIL',physics:PHYSICS_VERSION,date:new Date().toISOString(),scope:'Structural panels, water half-spaces and real authority contact; thin gunwale trim is cosmetic. Human fairness remains open.',measurements},null,2)+'\n'));
const poses=[new T.Quaternion(),...[-Math.PI/2,.7,2.4].map(yaw=>new T.Quaternion().setFromEuler(new T.Euler(.16,yaw,-.22)))];
const position={x:0,y:.08,z:0};
function pose(sim:BoatSimulation,q:T.Quaternion) {
  sim.hull.setTranslation(position,true);sim.hull.setRotation(q,true);
  sim.world.propagateModifiedBodyPositionsToColliders();
}

test('Convex collider follows every structural panel triangle through yaw, pitch and roll',()=>{
  const sim=new BoatSimulation(true);let maxError=0,checks=0;
  try {
    assert.equal(sim.hull.mass(),260);
    assert.deepEqual({...sim.hull.localCom()},{x:0,y:0,z:0});
    const inertia=sim.hull.principalInertia();
    assert(Math.abs(inertia.x-318.283333333)<.0001&&Math.abs(inertia.y-383.066666667)<.0001&&Math.abs(inertia.z-75.616666667)<.0001);
    for(const q of poses){
      pose(sim,q);
      for(let i=0;i<HULL_RING.length;i++){
        const geometry=hullPanel(i),points=geometry.getAttribute('position');
        for(let j=0;j<points.count;j+=3){
          const a=new T.Vector3().fromBufferAttribute(points,j),b=new T.Vector3().fromBufferAttribute(points,j+1),c=new T.Vector3().fromBufferAttribute(points,j+2);
          for(const point of [a,b,c,a.clone().add(b).add(c).divideScalar(3)]){
            const world=localToWorld(point,position,q),surface=sim.hullCollider.projectPoint(world,false);
            assert(surface);const error=Math.hypot(surface.point.x-world.x,surface.point.y-world.y,surface.point.z-world.z);
            maxError=Math.max(maxError,error);checks++;
            assert(error<.00001,`panel ${i}: surface error ${error}`);
          }
        }
        geometry.dispose();
      }
    }
    const vertices=hullVertices();
    for(let i=0;i<vertices.length;i+=3)assert(HULL_PLANES.every(([x,y,z,w])=>x!*vertices[i]!+y!*vertices[i+1]!+z!*vertices[i+2]!<=w!+1e-6));
    measurements.push({case:'transformed-panel-surface',checks,maxSurfaceErrorMetres:maxError});
  } finally {sim.dispose();}
});

test('Water exclusion planes agree with Rapier inside/outside queries throughout the hull volume',()=>{
  const sim=new BoatSimulation(true);let checks=0;
  try {
    for(const q of poses){
      pose(sim,q);
      for(let ix=-11;ix<=11;ix++)for(let iy=-4;iy<=6;iy++)for(let iz=-24;iz<=24;iz++){
        const point={x:ix*.1,y:iy*.1,z:iz*.1};
        const distances=HULL_PLANES.map(([x,y,z,w])=>x!*point.x+y!*point.y+z!*point.z-w!);
        if(Math.abs(Math.max(...distances))<.00001)continue; // Float boundary classification is not a near-miss.
        const inside=Math.max(...distances)<0;
        assert.equal(sim.hullCollider.containsPoint(localToWorld(point,position,q)),inside,`classification ${ix},${iy},${iz}`);checks++;
      }
    }
    measurements.push({case:'water-mask-volume-agreement',checks});
  } finally {sim.dispose();}
});

test('Visible bow, stern and shoulder contacts break once; empty tapered corners remain clear',()=>{
  let checks=0;
  for(const q of poses)for(const [name,local,hit] of [
    ['bow',{x:0,y:.25,z:2.12},true],['stern',{x:0,y:.25,z:-2.05},true],['shoulder',{x:.88,y:.25,z:0},true],
    ['bow-corner',{x:.78,y:.1,z:1.8},false],['stern-corner',{x:-.78,y:.1,z:-1.8},false],['outside-side',{x:1.12,y:.1,z:0},false],
    ['separated-side',{x:1.026,y:.46,z:0},false],
  ] as const){
    const sim=new BoatSimulation(true);
    try {
      pose(sim,q);
      const point=localToWorld(local,position,q);
      const solid=sim.world.createCollider(RAPIER.ColliderDesc.ball(.055).setTranslation(point.x,point.y,point.z));
      sim.hazards.set(solid.handle,`fixture-${name}`);
      sim.step();
      assert.equal(sim.condition,hit?'breaking':'afloat',`${name}, yaw ${q.y}`);
      assert.equal(sim.crashId,hit?1:0);checks++;
      if(hit){for(let t=0;t<155;t++)sim.step();assert.equal(sim.crashId,1);assert.equal(sim.condition,'sunk');}
    } finally {sim.dispose();}
  }
  measurements.push({case:'real-contact-and-near-miss-matrix',checks});
});

test('A predicted contact stays safe until the same pair actually touches on a later tick',()=>{
  const sim=new BoatSimulation(true);
  try {
    const point=localToWorld({x:.915,y:.2,z:0},position,poses[0]!);
    const obstacle=sim.world.createCollider(RAPIER.ColliderDesc.ball(.055).setTranslation(point.x,point.y,point.z));
    sim.hazards.set(obstacle.handle,'closing-gap');
    sim.step();assert.equal(sim.condition,'afloat');
    let pairs=0;sim.world.contactPairsWith(sim.hullCollider,collider=>{if(collider.handle===obstacle.handle)pairs++;});
    assert.equal(pairs,1,'The still-separated pair must already exist in Rapier');
    sim.hull.setLinvel({x:.6,y:0,z:0},true);
    for(let i=0;i<30&&sim.condition==='afloat';i++)sim.step();
    assert.equal(sim.condition,'breaking');assert.equal(sim.obstacleId,'closing-gap');assert.equal(sim.crashId,1);
    measurements.push({case:'prediction-to-real-contact',checks:1});
  }finally{sim.dispose();}
});
