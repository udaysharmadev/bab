import {before,test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {BoatSimulation,initPhysics} from '../src/shared/simulation';
import {paddleShaftContact} from '../src/shared/paddle-contact';
import {DT,SEATS,paddleHandle,localToWorld,rotate,PHYSICS_VERSION} from '../src/shared/protocol';

before(initPhysics);
const energy=(sim:BoatSimulation)=>{
  const v=sim.hull.linvel(),q=sim.hull.rotation(),w=rotate(sim.hull.angvel(),{x:-q.x,y:-q.y,z:-q.z,w:q.w}),inertia=sim.hull.principalInertia();
  return sim.hull.mass()*(v.x*v.x+v.z*v.z)/2+(inertia.x*w.x*w.x+inertia.y*w.y*w.y+inertia.z*w.z*w.z)/2;
};
function fixture(seat:number,yaw:number,heel:number,solid=true,speed=1){
  const sim=new BoatSimulation(true),q={x:Math.sin(yaw/2)*Math.sin(heel/2),y:Math.sin(yaw/2)*Math.cos(heel/2),z:Math.cos(yaw/2)*Math.sin(heel/2),w:Math.cos(yaw/2)*Math.cos(heel/2)};
  sim.hull.setTranslation({x:0,y:.08,z:0},true);sim.hull.setRotation(q,true);
  const p=sim.paddles[seat]!;sim.setActive(seat,solid);p.dip=1;p.intent={seq:1,x:0,z:0,dip:1};p.age=0;
  const pos=sim.hull.translation(),handle=localToWorld(paddleHandle(seat),pos,q),tip=localToWorld(sim.bladeLocal(seat),pos,q),side=SEATS[seat]!.side;
  const centre=localToWorld({x:side*1.07,y:.27,z:SEATS[seat]!.z+.015},pos,q);
  const collider=solid?sim.world.createCollider(RAPIER.ColliderDesc.cuboid(.02,.1,.15).setTranslation(centre.x,centre.y,centre.z).setRotation(q)):undefined;
  // Refresh the real broad phase, then restore the exact measured initial pose.
  sim.world.step();sim.hull.setTranslation(pos,true);sim.hull.setRotation(q,true);
  sim.hull.setLinvel(rotate({x:side*speed,y:0,z:0},q),true);sim.hull.setAngvel({x:0,y:0,z:0},true);
  return {sim,handle,tip,collider};
}

test('Persistent shaft-only contacts are nonlethal and dissipative across every seat, heading and heel',()=>{
  const results=[];
  for(let seat=0;seat<4;seat++)for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const heel of [-.4,0,.4]){
    const hit=fixture(seat,yaw,heel),base=fixture(seat,yaw,heel,false);
    try{
      const contact=paddleShaftContact(hit.sim.world,hit.sim.hull,hit.handle,hit.tip);assert(contact,'Shaft midpoint contact must persist with zero blade travel');
      assert.equal(contact.collider.handle,hit.collider!.handle);
      assert(!hit.collider!.intersectsShape(new RAPIER.Ball(.025),hit.tip,{x:0,y:0,z:0,w:1}),'Tip is clear: the old zero-travel ray cannot find this contact');
      hit.sim.step();base.sim.step();const blade=hit.sim.blades[seat]!;
      assert.equal(blade.state,'BRACE');assert(blade.force>0&&blade.force<=260.00001);
      assert(Math.abs(hit.sim.hull.userForce().y-base.sim.hull.userForce().y)<1e-5,'Solid reaction adds no vertical thrust');
      assert(energy(hit.sim)<=energy(base.sim)+.001,'A stationary paddle against static solid cannot add kinetic energy');
      assert.equal(hit.sim.condition,'afloat');assert.equal(hit.sim.crashId,0);
      results.push({seat,yaw,heel,force:blade.force,impulse:blade.force*DT,energy:energy(hit.sim),controlEnergy:energy(base.sim)});
    }finally{hit.sim.dispose();base.sim.dispose();}
  }
  writeFileSync('evidence/paddle-contact.json',JSON.stringify({result:'PASS',physics:PHYSICS_VERSION,cases:results,scope:'Real Rapier shaft-only contacts; static passive dissipation/force/vertical checks. Full blade queries have separate evidence; human handling remains open.'},null,2)+'\n');
});

test('Holding a dipped shaft still produces no free force; release and inactive paddles stop bracing',()=>{
  const {sim}=fixture(0,0,0,true,0);
  try{
    for(let i=0;i<60;i++){
      sim.hull.setTranslation({x:0,y:.08,z:0},true);sim.hull.setRotation({x:0,y:0,z:0,w:1},true);
      sim.hull.setLinvel({x:0,y:0,z:0},true);sim.hull.setAngvel({x:0,y:0,z:0},true);
      sim.accept(0,{seq:i+2,x:0,z:0,dip:1});sim.step();
      assert.equal(sim.blades[0]!.state,'BRACE');assert.equal(sim.blades[0]!.force,0);
    }
    sim.releaseInputs();sim.step();assert.notEqual(sim.blades[0]!.state,'BRACE');
    sim.setActive(0,false);sim.step();assert.equal(sim.blades[0]!.state,'DISABLED');assert.equal(sim.blades[0]!.force,0);
  }finally{sim.dispose();}
});

test('Shaft queries exclude own hull, sensors and separated solids',()=>{
  const {sim,handle,tip,collider}=fixture(0,0,0);
  try{
    collider!.setSensor(true);sim.world.step();assert.equal(paddleShaftContact(sim.world,sim.hull,handle,tip),undefined);
    collider!.setSensor(false);collider!.setTranslation({x:-5,y:0,z:0});sim.world.step();assert.equal(paddleShaftContact(sim.world,sim.hull,handle,tip),undefined);
  }finally{sim.dispose();}
});

test('Moving-solid relative velocity and saturated impacts remain bounded for every seat',()=>{
  const results=[],references=new Map<number,number>();
  for(let seat=0;seat<4;seat++)for(const [hullSpeed,solidSpeed] of [[0,0],[1,1],[1,0],[3,2],[0,-1],[0,1],[0,20],[20,0]] as const){
    const {sim,collider}=fixture(seat,0,0,true,hullSpeed),side=SEATS[seat]!.side;
    try{
      const position={...collider!.translation()},rotation={...collider!.rotation()};sim.world.removeCollider(collider!,false);
      const body=sim.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(position.x,position.y,position.z));
      sim.world.createCollider(RAPIER.ColliderDesc.cuboid(.02,.1,.15).setRotation(rotation),body);
      sim.world.step();sim.hull.setTranslation({x:0,y:.08,z:0},true);sim.hull.setRotation({x:0,y:0,z:0,w:1},true);
      sim.hull.setLinvel({x:side*hullSpeed,y:0,z:0},true);sim.hull.setAngvel({x:0,y:0,z:0},true);
      body.setLinvel({x:side*solidSpeed,y:0,z:0},true);sim.step();
      const blade=sim.blades[seat]!;assert.equal(blade.state,'BRACE');
      assert(Number.isFinite(blade.force)&&blade.force<=260.00001);
      if(hullSpeed<=solidSpeed)assert.equal(blade.force,0,'Matching or separating motion cannot push');
      else if(hullSpeed-solidSpeed===1){
        assert(blade.force>0);const reference=references.get(seat);
        if(reference!==undefined)assert(Math.abs(blade.force-reference)<.001,'Equal relative closing speed gives the same reaction in a moving frame');
        else references.set(seat,blade.force);
      }else assert(blade.force>references.get(seat)!,'High closing speed reaches the bounded saturated response');
      assert(blade.force*DT<=260*DT+.00001);assert.equal(sim.condition,'afloat');assert.equal(sim.crashId,0);
      results.push({seat,hullSpeed,solidSpeed,force:blade.force,maxImpulse:blade.force*DT});
    }finally{sim.dispose();}
  }
  writeFileSync('evidence/paddle-contact-moving.json',JSON.stringify({result:'PASS',cases:results,forceCapNewtons:260,perSeatImpulseCapNs:260*DT},null,2)+'\n');
});
