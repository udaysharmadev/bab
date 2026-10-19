import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {BoatRoom} from '../src/server/BoatRoom';
import {initPhysics} from '../src/shared/simulation';
import {CHECKPOINTS,FINISH_Z} from '../src/shared/world';
import {PROTOCOL_VERSION,PHYSICS_VERSION} from '../src/shared/protocol';

async function until(condition:()=>boolean,timeout=5000) {
 const start=Date.now(); while(!condition()){assert(Date.now()-start<timeout,'lifecycle condition timed out');await sleep(20);}
}

test('Crew countdown, strict-majority consent, checkpoint durability and completed departure lifecycle', {timeout:35000},async()=>{
 process.env.BOAT_SAVE_DB=':memory:'; await initPhysics();
 const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});server.define('boat',BoatRoom);
 const rooms:Room[]=[]; const sdk=new Client('ws://127.0.0.1:2596');
 const options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends'};
 const observe=(room:Room)=>{for(const type of ['snapshot','seat','voyage'])room.onMessage(type,()=>{});};
 try{
  await server.listen(2596,'127.0.0.1');
  for(let i=0;i<4;i++){const r=i?await sdk.joinById(rooms[0]!.roomId,options):await sdk.create('boat',options);observe(r);rooms.push(r);}
  const authority=matchMaker.getLocalRoomById(rooms[0]!.roomId);assert(authority instanceof BoatRoom);
  rooms.forEach(r=>r.send('ready',true));await until(()=>authority.snapshot().countdownSeconds===3);
  assert.equal(authority.sim.tick,0);assert.equal(authority.stage,'lobby');
  const token=rooms[3]!.reconnectionToken; rooms[3]!.reconnection.enabled=false;rooms[3]!.connection.close();
  await until(()=>!authority.snapshot().countdownSeconds);await sleep(3100);assert.equal(authority.stage,'lobby');
  rooms[3]=await sdk.reconnect(token);observe(rooms[3]!);
  await until(()=>authority.snapshot().crew.every(m=>m.connected));assert.equal(authority.snapshot().crew.find(m=>m.seat===3)?.ready,false);
  rooms[3]!.send('ready',true);await until(()=>!!authority.snapshot().countdownSeconds);
  rooms[0]!.send('ready',false);await until(()=>!authority.snapshot().countdownSeconds);
  rooms[0]!.send('ready',true);await until(()=>authority.stage==='playing');
  const reset=authority.sim.resetId;
  rooms[0]!.send('reset');rooms[0]!.send('reset');await until(()=>authority.snapshot().resetVotes===1);
  assert.equal(authority.snapshot().resetVotesNeeded,3);
  rooms[1]!.send('reset');await until(()=>authority.snapshot().resetVotes===2);assert.equal(authority.sim.resetId,reset);
  rooms[0]!.send('reset',false);await until(()=>authority.snapshot().resetVotes===1);
  assert.deepEqual(authority.snapshot().resetVoters,[1]);
  rooms[0]!.send('reset');rooms[2]!.send('reset');await until(()=>authority.sim.resetId>reset);assert.equal(authority.snapshot().resetVotes??0,0);
  await sleep(2100);rooms[0]!.send('reset');await until(()=>authority.snapshot().resetVotes===1);
  await until(()=>!authority.snapshot().resetVotes,16000);assert.equal(authority.sim.resetId,reset+1);
  // Observe the actual durable-save acknowledgement, with the periodic heartbeat far away.
  let saved=-1;rooms[0]!.onMessage<{checkpoint:number}>('voyage',v=>saved=v.checkpoint);
  authority.sincePersist=0;authority.sim.hull.setTranslation({x:0,y:.08,z:CHECKPOINTS[1]!+.5},true);
  await until(()=>authority.sim.checkpoint===1);await until(()=>saved===1,400);
  // Finish runs on simulated time; a finished crewmate leaving must not erase completion.
  authority.sim.hull.setTranslation({x:0,y:.08,z:FINISH_Z+1},true);
  await until(()=>authority.sim.complete);const finished=authority.snapshot();
  assert(finished.finishTimeMs!>0);assert(finished.finishTimeMs!<=authority.sim.tick/60*1000+1);
  rooms[0]!.send('reset');await sleep(100);assert.equal(authority.sim.complete,true);
  await rooms[3]!.leave();await until(()=>authority.members.size===3);
  assert.equal(authority.sim.complete,true);assert.equal(authority.paused,false);
  rooms[0]!.send('restart');await until(()=>authority.stage==='lobby');
  assert.equal(authority.sim.complete,false);assert(authority.snapshot().crew.every(m=>!m.ready));
 }finally{for(const r of rooms){r.reconnection.enabled=false;void r.leave().catch(()=>{});}await server.gracefullyShutdown(false);}
});

test('HTTP room creation limiter uses transport AuthContext before room allocation; existing-room joins still work', {timeout:10000},async()=>{
 await initPhysics();const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});server.define('boat',BoatRoom);
 const sdk=new Client('ws://127.0.0.1:2597',{headers:{'x-real-ip':'192.0.2.37'}});
 const options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends'};const rooms:Room[]=[];
 const observe=(r:Room)=>{for(const type of ['seat','snapshot','voyage'])r.onMessage(type,()=>{});};
 try{
  await server.listen(2597,'127.0.0.1');
  for(let i=0;i<8;i++){const room=await sdk.create('boat',options);observe(room);rooms.push(room);}
  await assert.rejects(sdk.create('boat',options),/Too many rooms/);
  const joined=await sdk.joinById(rooms[0]!.roomId,options);observe(joined);rooms.push(joined);
  assert.equal(matchMaker.getLocalRoomById(rooms[0]!.roomId)?.clients.length,2);
 }finally{await Promise.allSettled(rooms.map(r=>r.leave()));await server.gracefullyShutdown(false);}
});
