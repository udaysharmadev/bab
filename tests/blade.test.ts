import {before,test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {PADDLE_CORES,paddleBladeRotation} from '../src/shared/paddle-blade';
import {paddleBlade} from '../src/client/boat-detail';
import {paddleBladeContact,paddleShaftContact} from '../src/shared/paddle-contact';
import {BoatSimulation,initPhysics} from '../src/shared/simulation';
import {localToWorld,paddleHandle,rotate,PHYSICS_VERSION} from '../src/shared/protocol';
before(initPhysics);
const identity={x:0,y:0,z:0,w:1},zero={x:0,y:0,z:0};
const energy=(sim:BoatSimulation)=>{
  const v=sim.hull.linvel(),q=sim.hull.rotation(),w=rotate(sim.hull.angvel(),{x:-q.x,y:-q.y,z:-q.z,w:q.w}),inertia=sim.hull.principalInertia();
  return sim.hull.mass()*(v.x*v.x+v.z*v.z)/2+(inertia.x*w.x*w.x+inertia.y*w.y*w.y+inertia.z*w.z*w.z)/2;
};

test('Blade pose matches renderer for zero-length, vertical and near-antiparallel directions',()=>{
  const body=new T.Quaternion().setFromEuler(new T.Euler(.2,1.4,-.4)),up=new T.Vector3(0,1,0);
  for(let seat=0;seat<4;seat++)for(const direction of [zero,{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:1e-7,y:-1,z:0},{x:0,y:-1,z:1e-7}]){
    const handle=paddleHandle(seat),tip={x:handle.x+direction.x,y:handle.y+direction.y,z:handle.z+direction.z};
    const actual=paddleBladeRotation(seat,tip,body),expected=body.clone().multiply(new T.Quaternion().setFromUnitVectors(up,new T.Vector3(direction.x,direction.y,direction.z).normalize()));
    assert(1-Math.abs(expected.dot(new T.Quaternion(actual.x,actual.y,actual.z,actual.w)))<1e-12,JSON.stringify({seat,direction,actual,expected}));
  }
});

test('Shared rounded blade preserves original render geometry and both convex cores stay inside its faces',()=>{
  const original=new T.Shape();original.moveTo(-.025,.204);original.lineTo(.025,.204);original.lineTo(.035,.105);
  original.quadraticCurveTo(.098,.02,.098,-.10);original.quadraticCurveTo(.098,-.203,0,-.203);
  original.quadraticCurveTo(-.098,-.203,-.098,-.10);original.quadraticCurveTo(-.098,.02,-.035,.105);original.closePath();
  const baseline=new T.ExtrudeGeometry(original,{depth:.039,steps:1,curveSegments:4,bevelEnabled:true,bevelSegments:1,bevelThickness:.006,bevelSize:.006});
  baseline.translate(0,0,-.0195);baseline.rotateZ(Math.PI);
  const geometry=paddleBlade();assert.deepEqual(geometry.getAttribute('position').array,baseline.getAttribute('position').array);
  assert.deepEqual(geometry.getAttribute('normal').array,baseline.getAttribute('normal').array);
  const material=new T.MeshBasicMaterial({side:T.DoubleSide}),mesh=new T.Mesh(geometry,material),ray=new T.Raycaster();mesh.updateMatrixWorld();
  let checks=0;
  for(const core of PADDLE_CORES){
    const shape=new RAPIER.ConvexPolyhedron(core.vertices,core.indices);
    assert(shape.containsPoint(zero,identity,zero)||shape.containsPoint(zero,identity,{x:0,y:-.16,z:0}));
    for(let i=0;i<core.vertices.length;i+=3){
      const x=core.vertices[i]!,y=core.vertices[i+1]!,z=core.vertices[i+2]!;
      // Move microscopically inward in XY to avoid triangle-edge ray ambiguity.
      ray.set(new T.Vector3(x*.99999,y*.99999,1),new T.Vector3(0,0,-1));
      const hits=ray.intersectObject(mesh);assert(hits.some(h=>h.point.z>=Math.abs(z)-1e-6),`${x},${y},${z} outside visible blade`);checks++;
    }
  }
  writeFileSync('evidence/blade-geometry.json',JSON.stringify({result:'PASS',physics:PHYSICS_VERSION,coreVertexChecks:checks,renderPositionsAndNormals:'identical to original',convexParts:2},null,2)+'\n');
  baseline.dispose();geometry.dispose();material.dispose();
});

test('Rounded volume catches edge-only contacts and sweeps, while shoulder gaps, sensors and own hull remain clear',()=>{
  const world=new RAPIER.World(zero),body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,0,-5));
  world.createCollider(RAPIER.ColliderDesc.ball(.1),body);
  const obstacle=world.createCollider(RAPIER.ColliderDesc.ball(.004).setTranslation(.075,.1,0));world.step();
  try{
    const hit=paddleBladeContact(world,body,zero,identity,zero);assert(hit);assert.equal(hit.collider.handle,obstacle.handle);
    assert(!obstacle.intersectsShape(new RAPIER.Ball(.025),zero,identity),'Old tip sample is clear');
    obstacle.setTranslation({x:.045,y:-.16,z:0});world.step();
    assert.equal(paddleBladeContact(world,body,zero,identity,zero),undefined,'Concave shoulder must remain empty');
    obstacle.setTranslation({x:0,y:.12,z:0});world.step();
    const sweep=paddleBladeContact(world,body,{x:.4,y:0,z:0},identity,{x:-.4,y:0,z:0});assert(sweep,'Finite blade edge must sweep across thin obstacle');
    assert(sweep.normal.x<-.9);assert(Math.abs(sweep.point.y-.12)<.006,'Witness is on the hit collider in world space');
    assert.equal(world.castRay(new RAPIER.Ray({x:-.4,y:0,z:0},{x:1,y:0,z:0}),.8,true),null,'Centre ray misses the same obstacle');
    obstacle.setSensor(true);world.step();assert.equal(paddleBladeContact(world,body,{x:.4,y:0,z:0},identity,{x:-.4,y:0,z:0}),undefined);
    obstacle.setSensor(false);obstacle.setTranslation({x:0,y:2,z:0});body.setTranslation(zero,true);world.step();
    assert.equal(paddleBladeContact(world,body,zero,identity,zero),undefined);
  }finally{world.free();}
});

test('Blade-only bracing is bounded, passive and nonlethal across seats, headings and heels',()=>{
  const results=[];
  for(let seat=0;seat<4;seat++)for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const heel of [-.4,0,.4]){
    const sim=new BoatSimulation(true),base=new BoatSimulation(true),q=new T.Quaternion().setFromEuler(new T.Euler(0,yaw,heel,'YXZ'));
    try{
      sim.setActive(seat,true);const p=sim.paddles[seat]!;p.dip=1;p.age=0;p.intent={seq:1,x:0,z:0,dip:1};
      const pos={x:0,y:.08,z:0},tip=localToWorld(sim.bladeLocal(seat),pos,q),rotation=paddleBladeRotation(seat,sim.bladeLocal(seat),q);
      const centre=localToWorld({x:.104,y:.1,z:0},tip,rotation);
      const collider=sim.world.createCollider(RAPIER.ColliderDesc.ball(.012).setTranslation(centre.x,centre.y,centre.z));
      sim.world.step();sim.hull.setTranslation(pos,true);sim.hull.setRotation(q,true);sim.hull.setAngvel(zero,true);
      assert.equal(paddleShaftContact(sim.world,sim.hull,localToWorld(paddleHandle(seat),pos,q),tip),undefined,'Shaft must be clear');
      const hit=paddleBladeContact(sim.world,sim.hull,tip,rotation,tip);assert(hit);assert.equal(hit.collider.handle,collider.handle);
      const closing={x:-hit.normal.x*2,y:0,z:-hit.normal.z*2};sim.hull.setLinvel(closing,true);
      base.world.step();base.hull.setTranslation(pos,true);base.hull.setRotation(q,true);base.hull.setAngvel(zero,true);base.hull.setLinvel(closing,true);
      sim.step();base.step();assert.equal(sim.blades[seat]!.state,'BRACE');const force=sim.blades[seat]!.force;
      assert(force>0&&force<=260.00001,JSON.stringify({seat,yaw,heel,force,normal:hit.normal}));assert.equal(sim.condition,'afloat');assert.equal(sim.crashId,0);
      // Static normal opposition must not supply energy or vertical thrust.
      const applied=sim.hull.userForce();assert(Number.isFinite(applied.x+applied.y+applied.z));
      assert(Math.abs(applied.y-base.hull.userForce().y)<1e-5,'No added vertical thrust');
      assert(energy(sim)<=energy(base)+.001,'Static blade contact must dissipate energy');
      results.push({seat,yaw,heel,force,energy:energy(sim),controlEnergy:energy(base)});
    }finally{sim.dispose();base.dispose();}
  }
  writeFileSync('evidence/blade-contact.json',JSON.stringify({result:'PASS',physics:PHYSICS_VERSION,cases:results,scope:'48 actual blade-only contacts; bounded nonlethal response. Translational casts are not rotational CCD.'},null,2)+'\n');
});

test('Blade-only moving-frame response, saturation, resting contact and release stay bounded',()=>{
  const results=[],reference=new Map<number,number>();
  for(let seat=0;seat<4;seat++)for(const [hullSpeed,solidSpeed] of [[0,0],[1,1],[1,0],[3,2],[0,-1],[0,1],[0,20],[20,0]] as const){
    const sim=new BoatSimulation(true);
    try{
      const p=sim.paddles[seat]!;sim.setActive(seat,true);p.dip=1;p.age=0;p.intent={seq:1,x:0,z:0,dip:1};
      const pos={x:0,y:.08,z:0},tip=localToWorld(sim.bladeLocal(seat),pos,identity),q=paddleBladeRotation(seat,sim.bladeLocal(seat),identity);
      const centre=localToWorld({x:.104,y:.1,z:0},tip,q),solid=sim.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(centre.x,centre.y,centre.z));
      sim.world.createCollider(RAPIER.ColliderDesc.ball(.012),solid);sim.world.step();
      sim.hull.setTranslation(pos,true);sim.hull.setRotation(identity,true);sim.hull.setAngvel(zero,true);
      const hit=paddleBladeContact(sim.world,sim.hull,tip,q,tip);assert(hit);
      const direction={x:-hit.normal.x,y:0,z:-hit.normal.z};
      sim.hull.setLinvel({x:direction.x*hullSpeed,y:0,z:direction.z*hullSpeed},true);solid.setLinvel({x:direction.x*solidSpeed,y:0,z:direction.z*solidSpeed},true);
      sim.step();const blade=sim.blades[seat]!;assert.equal(blade.state,'BRACE');assert(blade.force<=260.00001);
      if(hullSpeed<=solidSpeed)assert.equal(blade.force,0,'Resting, matched or separating contact cannot push');
      else if(hullSpeed-solidSpeed===1){const previous=reference.get(seat);if(previous!==undefined)assert(Math.abs(blade.force-previous)<.001);else reference.set(seat,blade.force);assert(blade.force>0);}
      else assert(blade.force>reference.get(seat)!);
      assert.equal(sim.condition,'afloat');assert.equal(sim.crashId,0);
      results.push({seat,hullSpeed,solidSpeed,force:blade.force});
      sim.releaseInputs();sim.step();assert.notEqual(sim.blades[seat]!.state,'BRACE');sim.setActive(seat,false);sim.step();assert.equal(sim.blades[seat]!.force,0);
    }finally{sim.dispose();}
  }
  writeFileSync('evidence/blade-moving.json',JSON.stringify({result:'PASS',physics:PHYSICS_VERSION,cases:results,forceCap:260},null,2)+'\n');
});
