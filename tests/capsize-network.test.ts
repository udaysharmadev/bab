import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {BoatRoom} from '../src/server/BoatRoom';
import {initPhysics} from '../src/shared/simulation';
import {PROTOCOL_VERSION,PHYSICS_VERSION} from '../src/shared/protocol';
async function until(check:()=>boolean){const start=Date.now();while(!check()){assert(Date.now()-start<6000,'Capsize network wait timed out');await delay(20);}}
const watch=(room:Room)=>{for(const type of ['snapshot','seat','voyage'])room.onMessage(type,()=>{});};
test('Real crew righting requires fresh majority input and survives reconnect with no stale effort or teleport',async()=>{
 process.env.BOAT_SAVE_DB=':memory:';await initPhysics();const server=new Server({transport:new WebSocketTransport(),greet:false});server.define('boat',BoatRoom);const peers:Room[]=[],checks:string[]=[];
 try{
  await server.listen(2623,'127.0.0.1');const sdk=new Client('ws://127.0.0.1:2623'),options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends'};
  for(let i=0;i<4;i++){const peer=i?await sdk.joinById(peers[0]!.roomId,options):await sdk.create('boat',options);watch(peer);peers.push(peer);peer.send('ready',true);}
  const authority=matchMaker.getLocalRoomById(peers[0]!.roomId);assert(authority instanceof BoatRoom);await until(()=>authority.stage==='playing');
  const sim=authority.sim;sim.checkpoint=4;sim.hull.setTranslation({x:0,y:.08,z:264},true);sim.hull.setRotation({x:0,y:0,z:1,w:0},true);
  await until(()=>!!sim.capsize);const reset=sim.resetId;
  for(const p of peers)p.send('row',{seq:1,forward:-1,turn:0,seat:0});await delay(100);assert.equal(sim.capsize!.helpers,0,'Extra fields cannot forge effort');
  for(const p of peers)p.send('row',{seq:1,forward:-1,turn:0});await delay(100);assert.equal(sim.capsize!.helpers,0,'Held commands must first rearm through neutral after capsize entry');
  for(const p of peers)p.send('row',{seq:2,forward:0,turn:0});
  peers[0]!.send('row',{seq:3,forward:-1,turn:0});peers[1]!.send('row',{seq:3,forward:-1,turn:0});await until(()=>sim.capsize?.helpers===2);assert.equal(sim.rightedId,0);checks.push('Entry requires neutral rearming;owned validated reverse actions count distinct seats;spoofed extra fields and minority cannot right the hull');
  await until(()=>sim.capsize?.helpers===0);peers[0]!.send('row',{seq:1,forward:-1,turn:0});await delay(100);assert.equal(sim.capsize!.helpers,0);checks.push('Missing heartbeats expire through the actual production row timeout;stale sequence cannot rearm effort');
  const dropped=peers[3]!,token=dropped.reconnectionToken;dropped.reconnection.enabled=false;dropped.connection.close();await until(()=>authority.paused);
  await delay(100);const frozen=sim.tick,countdown=sim.capsizeTicks;await delay(400);assert.equal(sim.tick,frozen);assert.equal(sim.capsizeTicks,countdown);assert.equal(sim.capsize!.helpers,0);
  peers[3]=await sdk.reconnect(token);watch(peers[3]!);await until(()=>!authority.paused);await delay(120);assert.equal(sim.capsize!.helpers,0);assert.equal(sim.resetId,reset);checks.push('Actual socket drop freezes rescue time and clears all effort;reconnect retains the hull/window without replaying input');
  let sequence=3;const pump=setInterval(()=>{sequence++;for(const p of peers.slice(0,3))p.send('row',{seq:sequence,forward:-1,turn:0});},80);
  try{await until(()=>sim.rightedId===1);}finally{clearInterval(pump);}
  for(const p of peers)p.send('row',{seq:++sequence,forward:-1,turn:0});await delay(120);assert([...authority.members.values()].every(m=>!m.row),'In-flight held reverse cannot become rowing after success');
  for(const p of peers)p.send('row',{seq:++sequence,forward:0,turn:0});
  assert.equal(sim.recoveryId,0);assert.equal(sim.resetId,reset);assert.equal(sim.checkpoint,4);assert(Math.abs(sim.hull.translation().z-264)<4);assert.equal(sim.crashId,0);await delay(150);assert([...authority.members.values()].every(m=>!m.row||m.row.forward===0));
  checks.push('Fresh majority physically rights the same hull;checkpoint/reset/crash stay unchanged and success clears held rows');
  writeFileSync('evidence/capsize-network.json',JSON.stringify({result:'PASS',protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,checks,scope:'Actual local WebSockets;real disconnect/reconnect. Not Internet or human handling acceptance.'},null,2)+'\n');
 }finally{await Promise.allSettled(peers.map(p=>p.leave()));await server.gracefullyShutdown(false);}
});
