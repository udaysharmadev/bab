import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {playerName} from '../src/shared/names';
import {BoatRoom} from '../src/server/BoatRoom';
import {initPhysics} from '../src/shared/simulation';
import {PHYSICS_VERSION,PROTOCOL_VERSION} from '../src/shared/protocol';

test('Display names normalize spacing/Unicode, bound length and reject markup/control payloads',()=>{
  for(const [input,expected]of [['  Uday  Singh  ','Uday Singh'],['आदित्य','आदित्य'],['Zoe\u0308','Zoë'],["O'Neil","O'Neil"],['a'.repeat(20),'a'.repeat(20)]])assert.equal(playerName(input),expected);
  for(const input of [undefined,null,{},42,'','  ','a'.repeat(21),'a'.repeat(81),'<img onerror=x>','Tom & Jerry','a\u0000b','a\u202eb','🚣'])assert.equal(playerName(input),undefined);
});

test('Real room names belong to seats, survive reconnect and allow readiness before all four arrive',{timeout:15000},async()=>{
  process.env.BOAT_SAVE_DB=':memory:';await initPhysics();
  const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});server.define('boat',BoatRoom);
  const sdk=new Client('ws://127.0.0.1:2598'),rooms:Room[]=[];
  const options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends'};
  const observe=(room:Room)=>{for(const message of ['seat','snapshot','voyage'])room.onMessage(message,()=>{});};
  const until=async(check:()=>boolean)=>{const start=Date.now();while(!check()){assert(Date.now()-start<5000);await delay(20);}};
  try{
    await server.listen(2598,'127.0.0.1');
    const host=await sdk.create('boat',{...options,name:' Uday '});observe(host);rooms.push(host);
    const room=matchMaker.getLocalRoomById(host.roomId);assert(room instanceof BoatRoom);
    host.send('ready',true);await until(()=>room.snapshot().crew[0]?.ready===true);
    assert.equal(room.snapshot().crew[0]?.name,'Uday');assert.equal(room.stage,'lobby');assert.equal(room.sim.tick,0);
    host.send('name',{seat:1,name:'Forged'});host.send('name','<script>');await delay(70);assert.equal(room.snapshot().crew[0]?.name,'Uday');
    const names=['आदित्य',"O'Neil",'Mira'];
    for(const name of names){const peer=await sdk.joinById(host.roomId,{...options,name});observe(peer);rooms.push(peer);}
    assert.deepEqual(room.snapshot().crew.map(m=>m.name),['Uday',...names]);
    rooms[1]!.send('name','Aditi');await until(()=>room.snapshot().crew.find(m=>m.seat===1)?.name==='Aditi');
    assert.equal(room.snapshot().crew.find(m=>m.seat===0)?.name,'Uday');
    const token=rooms[1]!.reconnectionToken;rooms[1]!.reconnection.enabled=false;rooms[1]!.connection.close();
    await until(()=>room.snapshot().crew.find(m=>m.seat===1)?.connected===false);
    rooms[1]=await sdk.reconnect(token);observe(rooms[1]!);await until(()=>room.snapshot().crew.find(m=>m.seat===1)?.connected===true);
    assert.equal(room.snapshot().crew.find(m=>m.seat===1)?.name,'Aditi');
    for(const peer of rooms)peer.send('ready',true);
    await until(()=>room.stage==='playing');assert.equal(room.snapshot().crew.find(m=>m.seat===1)?.name,'Aditi');
  }finally{await Promise.allSettled(rooms.map(room=>{room.reconnection.enabled=false;return room.leave();}));await server.gracefullyShutdown(false);}
});
