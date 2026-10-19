import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {BoatRoom} from '../src/server/BoatRoom';
import {initPhysics} from '../src/shared/simulation';
import {FINISH_Z} from '../src/shared/world';
import {PROTOCOL_VERSION,PHYSICS_VERSION,type Snapshot} from '../src/shared/protocol';

test('Completed authority holds pose and rejects rowing until a shared restart restores play', {timeout:15000},async()=>{
 await initPhysics();
 const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});
 server.define('boat',BoatRoom);let client:Room|undefined;
 try{
  await server.listen(2592,'127.0.0.1');
  client=await new Client('ws://127.0.0.1:2592').create('boat',{protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'practice'});
  let latest:Snapshot|undefined;client.onMessage<Snapshot>('snapshot',s=>latest=s);client.onMessage('seat',()=>{});client.send('sync');
  const authority=matchMaker.getLocalRoomById(client.roomId);assert(authority instanceof BoatRoom);
  // Test owns the actual server instance; no teleport endpoint is added to the game.
  authority.sim.hull.setTranslation({x:0,y:.08,z:FINISH_Z+1},true);
  authority.sim.step();assert.equal(authority.sim.complete,true);
  const tick=authority.sim.tick,position={...authority.sim.hull.translation()},ack=authority.sim.paddles[0]!.intent.seq;
  client.send('input',{seq:ack+1,x:1,z:-1,dip:1});await sleep(200);
  assert.equal(authority.sim.tick,tick);assert.deepEqual({...authority.sim.hull.translation()},position);
  assert.equal(authority.sim.paddles[0]!.intent.seq,ack);assert.equal(latest?.complete,true);
  client.send('restart');await sleep(200);
  assert.equal(authority.sim.complete,false);assert.equal(authority.sim.checkpoint,0);assert(authority.sim.tick>tick);assert(authority.sim.hull.translation().z<1);
 }finally{await client?.leave();await server.gracefullyShutdown(false);}
});
