import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RiverWater} from '../src/client/water';
import {ROCKS,PYLONS,SPIKES} from '../src/shared/world';
import {BoatRoom} from '../src/server/BoatRoom';
import {VoyageStore} from '../src/server/voyages';
import {initPhysics,BoatSimulation} from '../src/shared/simulation';

test('Foam obstacle cache initializes at rest and refreshes after movement',()=>{
  const water=new RiverWater(),camera=new T.PerspectiveCamera();
  const expected=(x:number,z:number)=>[...ROCKS.map(r=>[r.x,r.z,r.radius]),...PYLONS.map(p=>[p.x,p.z,.27]),...SPIKES.map(p=>[p.x,p.z,p.radius])]
    .sort((a,b)=>Math.hypot(a[0]!-x,a[1]!-z)-Math.hypot(b[0]!-x,b[1]!-z)).slice(0,12);
  const actual=()=> (water.material.uniforms.obstacles!.value as T.Vector3[]).map(p=>p.toArray());
  water.update(0,camera,new T.Vector3(),new T.Quaternion(),0);
  assert.deepEqual(actual(),expected(0,0));
  water.update(1,camera,new T.Vector3(.1,0,.1),new T.Quaternion(),0);
  assert.deepEqual(actual(),expected(0,0),'Sub-threshold movement reuses initialized cache');
  water.update(2,camera,new T.Vector3(0,0,310),new T.Quaternion(),0);
  assert.deepEqual(actual(),expected(0,310));water.geometry.dispose();water.material.dispose();
});

test('Lost voyage lease publishes unavailable/blocked and never retries stale persistence',async()=>{
  await initPhysics();let now=1000;
  const store=new VoyageStore(':memory:',()=>now),room=new BoatRoom(),messages:unknown[]=[];
  room.roomId='old-crew';room.sim=new BoatSimulation(true);
  const claim=store.claim(room.roomId);
  room['saves']=store;room['voyage']=claim.voyage;room['saveToken']=claim.token;
  room.broadcast=(_type:string|number,message?:unknown)=>{messages.push(message);};
  try{
    now+=80000;const next=store.claim('new-crew',claim.token);
    room.sim.checkpoint=1;room.stage='playing';
    room['persistVoyage']();
    assert.equal(room['saveConflict'],true);assert.equal(room['saveUnavailable'],false);
    assert.equal(room.stage,'lobby');
    assert.deepEqual(messages.at(-1),{...claim.voyage,token:claim.token,available:false,blocked:true});
    const count=messages.length;
    store.save=()=>{throw Error('Stale writer retried');};
    store.heartbeat=()=>{throw Error('Stale owner heartbeated');};
    room['persistVoyage']();assert.equal(messages.length,count);
    room['sendVoyage']();assert.equal((messages.at(-1) as {available:boolean}).available,false);
    assert.equal(next.voyage.checkpoint,0);
  }finally{room.sim.dispose();store.close();}
});
