import {before,test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {bedHeight,bedMesh,bedDragScale} from '../src/shared/bathymetry';
import {riverbedGeometry} from '../src/client/riverbed';
import {RiverWater} from '../src/client/water';
import {BoatSimulation,initPhysics} from '../src/shared/simulation';
import {PaddleStroke,rowingAction} from '../src/client/input';
import {CHECKPOINTS,FINISH_Z,channelCenter} from '../src/shared/world';
import {PHYSICS_VERSION,DT,rotate,localToWorld} from '../src/shared/protocol';
before(initPhysics);

test('Exact bed triangles agree between authority rays, rendered surfaces and interpolation over the entire route',()=>{
 const sim=new BoatSimulation(true),ray=new T.Raycaster();sim.world.step();let checks=0,maxHeightError=0,maxPhysicsError=0;
 try{
  for(let start=-30;start<FINISH_Z+30;start+=60){
   const geometry=riverbedGeometry(start),mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();
   const p=geometry.getAttribute('position'),indices=geometry.index!;
   for(let i=0;i<indices.count;i+=3){
    const point=new T.Vector3();for(let j=0;j<3;j++)point.addScaledVector(new T.Vector3().fromBufferAttribute(p,indices.getX(i+j)),[.21,.37,.42][j]!);
    ray.set(new T.Vector3(point.x,2,point.z),new T.Vector3(0,-1,0));const visible=ray.intersectObject(mesh)[0];assert(visible);
    const hit=sim.world.castRay(new RAPIER.Ray({x:point.x,y:2,z:point.z},{x:0,y:-1,z:0}),5,true,undefined,undefined,undefined,sim.hull,c=>c.shape.type===RAPIER.ShapeType.TriMesh);assert(hit);
    maxHeightError=Math.max(maxHeightError,Math.abs(bedHeight(point.x,point.z)-visible.point.y));
    maxPhysicsError=Math.max(maxPhysicsError,Math.abs(2-hit.timeOfImpact-visible.point.y));checks++;
   }
   const next=riverbedGeometry(start+60),n=next.getAttribute('position'),normal=geometry.getAttribute('normal'),nextNormal=next.getAttribute('normal');
   for(let col=0;col<7;col++)for(const key of ['getX','getY','getZ'] as const){assert.equal(p[key](84+col),n[key](col));assert.equal(normal[key](84+col),nextNormal[key](col));}
   geometry.dispose();next.dispose();mesh.material.dispose();
  }
  assert(maxHeightError<.00002);assert(maxPhysicsError<.0002);
  writeFileSync('evidence/bathymetry-geometry.json',JSON.stringify({result:'PASS',physics:PHYSICS_VERSION,triangleChecks:checks,maxHeightError,maxPhysicsError,scope:'Independent Three rays and actual authority Rapier triangles; exact geometry/normal chunk seams.'},null,2)+'\n');
 }finally{sim.dispose();}
});

test('Canonical checkpoints retain deep hull/blade lanes and depth drag is continuous, bounded and dissipative',()=>{
 let checks=0;
 for(const z of CHECKPOINTS)for(const offset of [-2.5,-1,0,1,2.5])for(const longitudinal of [-2.5,0,2.5]){
  assert(bedHeight(channelCenter(z)+offset,z+longitudinal)<=-1.79);checks++;
 }
 let previous=bedDragScale(-1);
 for(let i=0;i<=2000;i++){
  const clearance=-1+i*.001,scale=bedDragScale(clearance);assert(scale>=1&&scale<=3);assert(Math.abs(scale-previous)<.006);previous=scale;
  const vx=Math.sin(i),vz=Math.cos(i);assert((-22*vx*scale)*vx+(-3*vz*scale)*vz<=0);
 }
 assert.equal(bedDragScale(.55),1);assert.equal(bedDragScale(2),1);assert.equal(bedDragScale(0),3);
 writeFileSync('evidence/bathymetry-lanes.json',JSON.stringify({result:'PASS',physics:PHYSICS_VERSION,spawnChecks:checks,dragSamples:2001},null,2)+'\n');
});

test('Water depth attributes follow exact bed heights through both quality modes and same-tick relocations',()=>{
 const water=new RiverWater();let checks=0;
 try{
  for(const low of [false,true])for(const z of [0,245,260,275,310,566,1030,1390]){
   water.setLowQuality(low);water.update(5,new T.PerspectiveCamera(),new T.Vector3(0,.08,z),new T.Quaternion(),1,true);
   const p=water.geometry.getAttribute('position'),levels=water.geometry.getAttribute('bedLevel');
   for(let i=0;i<p.count;i+=7){assert(Math.abs(levels.getX(i)-bedHeight(p.getX(i),water.position.z-p.getY(i)))<.00001);checks++;}
  }
  const levels=water.geometry.getAttribute('bedLevel'),positions=water.geometry.getAttribute('position');
  assert(levels instanceof T.BufferAttribute&&positions instanceof T.BufferAttribute);
  const version=levels.version,waveVersion=positions.version;
  water.update(6,new T.PerspectiveCamera(),new T.Vector3(0,.08,1390),new T.Quaternion(),1,true);
  assert.equal(levels.version,version,'Stationary waves must reuse the static depth buffer');assert(positions.version>waveVersion,'Wave geometry still advances');
  water.update(6,new T.PerspectiveCamera(),new T.Vector3(0,.08,260),new T.Quaternion(),1,true);
  assert(levels.version>version,'A same-tick relocation must invalidate the depth cache');
  writeFileSync('evidence/bathymetry-water.json',JSON.stringify({result:'PASS',checks,scope:'Shared depth samples; shader appearance independently checked in native Chrome.'},null,2)+'\n');
 }finally{water.geometry.dispose();water.material.dispose();}
});

test('A settled sandbar hull stays nonlethal and idle; four real reverse paddles can push off into deep water without recovery',()=>{
 const results=[];
 for(const x of [-10.5,-10,-9.5,-9]){
  const sim=new BoatSimulation(true);sim.checkpoint=4;sim.hull.setTranslation({x,y:.08,z:260},true);
  try{
   for(let i=0;i<360;i++)sim.step();let ground=false;
   sim.world.contactPairsWith(sim.hullCollider,c=>{if(c.shape.type===RAPIER.ShapeType.TriMesh)sim.world.contactPair(sim.hullCollider,c,m=>{for(let i=0;i<m.numContacts();i++)if(m.contactDist(i)<=.001)ground=true;});});
   if(x===-10.5)assert(ground,'Actual bed contact must support the bank-side grounded hull');
   assert.equal(sim.recoveryId,0);assert.equal(sim.crashId,0);assert(Math.hypot(sim.hull.linvel().x,sim.hull.linvel().z)<.01);
   const controllers=[0,1,2,3].map(()=>new PaddleStroke()),keys=new Set(['KeyS']);for(let seat=0;seat<4;seat++)sim.setActive(seat,true);
   let ticks=0,maxForce=0;
   const keelClearance=()=>Math.min(...[-.72,.72].flatMap(x=>[-1.55,1.55].map(z=>{const p=localToWorld({x,y:-.25,z},sim.hull.translation(),sim.hull.rotation());return p.y-bedHeight(p.x,p.z);})));
   for(;ticks<3600&&keelClearance()<.8;ticks++){
    for(let seat=0;seat<4;seat++)sim.accept(seat,{seq:ticks+1,...controllers[seat]!.sample(keys,seat,ticks*DT)},rowingAction(keys));sim.step();
    maxForce=Math.max(maxForce,...sim.blades.map(b=>b.force));assert.equal(sim.recoveryId,0);assert.equal(sim.crashId,0);assert.equal(sim.condition,'afloat');
    assert(sim.blades.every(b=>Number.isFinite(b.force)&&b.force<421));
   }
   assert(keelClearance()>=.8,'Normal reverse controls must clear the bed under the whole keel');assert(ticks<3600);assert(maxForce>0);
   assert(rotate({x:0,y:1,z:0},sim.hull.rotation()).y>.9);results.push({x,ground,seconds:ticks*DT,maxForce,exit:{...sim.hull.translation()}});
  }finally{sim.dispose();}
 }
 writeFileSync('evidence/bathymetry-handling.json',JSON.stringify({result:'PASS',physics:PHYSICS_VERSION,results,humanPlaytest:false,scope:'Real normal PaddleStroke controller commands and real bed contacts; no test steering force or teleport.'},null,2)+'\n');
});

test('Passive bed-paddle friction dissipates motion without lift; resting and released paddles supply no force',()=>{
 const sim=new BoatSimulation(true),base=new BoatSimulation(true),pose={x:-10,y:.08,z:260};
 const energy=(s:BoatSimulation)=>{const v=s.hull.linvel(),w=s.hull.angvel(),inertia=s.hull.principalInertia();return s.hull.mass()*(v.x*v.x+v.z*v.z)/2+(inertia.x*w.x*w.x+inertia.y*w.y*w.y+inertia.z*w.z*w.z)/2;};
 try{
  for(const s of [sim,base]){s.world.step();s.hull.setTranslation(pose,true);s.hull.setLinvel({x:.4,y:0,z:1},true);s.hull.setAngvel({x:0,y:0,z:0},true);}
  for(let seat=0;seat<4;seat++){sim.setActive(seat,true);const p=sim.paddles[seat]!;p.dip=1;sim.accept(seat,{seq:1,x:0,z:0,dip:1});}
  sim.step();base.step();assert(sim.blades.some(b=>b.state==='BRACE'&&b.force>0));
  assert(sim.blades.every(b=>b.force<=260.00001));assert(Math.abs(sim.hull.userForce().y-base.hull.userForce().y)<1e-5);assert(energy(sim)<=energy(base)+.001);
  for(let tick=0;tick<60;tick++){
   sim.hull.setTranslation(pose,true);sim.hull.setRotation({x:0,y:0,z:0,w:1},true);sim.hull.setLinvel({x:0,y:0,z:0},true);sim.hull.setAngvel({x:0,y:0,z:0},true);
   for(let seat=0;seat<4;seat++)sim.accept(seat,{seq:tick+2,x:0,z:0,dip:1});sim.step();assert(sim.blades.every(b=>b.force===0));
  }
  sim.releaseInputs();sim.step();assert(sim.blades.every(b=>b.state!=='BRACE'&&b.force===0));
 }finally{sim.dispose();base.dispose();}
});
