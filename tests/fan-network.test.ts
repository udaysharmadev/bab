import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {initPhysics} from '../src/shared/simulation';
import {FanRoom} from '../src/server/FanRoom';
import {FAN_PROTOCOL,FAN_PHYSICS,FAN_WORLD,COURSE_END,fanCentre} from '../src/shared/fan';
const options={protocol:FAN_PROTOCOL,physics:FAN_PHYSICS,world:FAN_WORLD,name:'Uday',mode:'friends'};
async function until(fn:()=>boolean){const start=Date.now();while(!fn()){assert(Date.now()-start<6000,'Network condition timeout');await sleep(20);}}
function observe(r:Room){r.onMessage('seat',()=>{});r.onMessage('snapshot',()=>{});}

test('Fan authority: name/version, four-ready cancellation, owned bounded input, real pause/reconnect, reset voting and frozen finish',{timeout:25000},async()=>{
  await initPhysics();
  const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});server.define('fan-raft',FanRoom);
  const peers:Room[]=[];
  try {
    await server.listen(2617,'127.0.0.1');const sdk=new Client('ws://127.0.0.1:2617');
    await assert.rejects(sdk.create('fan-raft',{...options,physics:'basin-0.13'}));
    await assert.rejects(sdk.create('fan-raft',{...options,name:''}));
    await assert.rejects(sdk.create('fan-raft',{...options,saveToken:'legacy-save'}));
    for(let i=0;i<4;i++){const r=i?await sdk.joinById(peers[0]!.roomId,{...options,name:`Friend ${i}`}):await sdk.create('fan-raft',options);observe(r);peers.push(r);}
    const authority=matchMaker.getLocalRoomById(peers[0]!.roomId);assert(authority instanceof FanRoom);
    assert.deepEqual([...authority.members.values()].map(m=>m.seat),[0,1,2,3]);assert([...authority.members.values()].every(m=>!m.ready));
    for(const r of peers.slice(0,3))r.send('ready',true);await sleep(100);assert.equal(authority.snapshot().countdown,0);assert.equal(authority.stage,'lobby');
    peers[3]!.send('ready',true);await until(()=>authority.snapshot().countdown>0);
    peers[1]!.send('ready',false);await until(()=>authority.snapshot().countdown===0);assert.equal(authority.stage,'lobby');
    peers[1]!.send('ready',true);await until(()=>authority.stage==='playing');
    peers[0]!.send('fan',{seq:1,fan:true,scoot:0});await sleep(80);assert.equal(authority.sim.fans[0]!.input.seq,0,'Launch requires neutral rearm');
    peers[0]!.send('fan',{seq:1,fan:false,scoot:0});await until(()=>authority.sim.fans[0]!.input.seq===1);
    peers[0]!.send('fan',{seq:2,fan:true,scoot:0,seat:3});await sleep(70);assert.equal(authority.sim.fans[0]!.input.seq,1);
    peers[0]!.send('fan',{seq:2,fan:true,scoot:1});await until(()=>authority.sim.fans[0]!.strokes>0);
    assert(authority.sim.fans.slice(1).every(f=>f.strokes===0));assert(authority.sim.fans[0]!.slide<=.28);
    peers[0]!.send('fan',{seq:2,fan:false,scoot:0});await sleep(50);assert.equal(authority.sim.fans[0]!.input.fan,true,'Stale seq cannot replace state');
    await sleep(650);assert.equal(authority.sim.fans[0]!.power,0);assert(authority.sim.fans[0]!.needsNeutral);
    peers[0]!.send('fan',{seq:3,fan:true,scoot:0});await sleep(60);assert.equal(authority.sim.fans[0]!.input.seq,2);
    peers[0]!.send('fan',{seq:3,fan:false,scoot:0});await until(()=>authority.sim.fans[0]!.input.seq===3);
    peers[0]!.send('fan',{seq:4,fan:true,scoot:0});await until(()=>authority.sim.fans[0]!.input.seq===4);
    const token=peers[3]!.reconnectionToken,session=peers[3]!.sessionId;
    peers[3]!.reconnection.enabled=false;peers[3]!.connection.close();await until(()=>authority.paused);
    const tick=authority.sim.tick;await sleep(150);assert.equal(authority.sim.tick,tick);assert(authority.sim.fans.every(f=>f.power===0&&f.needsNeutral));
    peers[3]=await sdk.reconnect(token);observe(peers[3]!);peers[3]!.send('sync');await until(()=>!authority.paused);
    assert.equal(peers[3]!.sessionId,session);assert.equal(authority.members.get(session)?.seat,3);assert.equal(authority.members.get(session)?.name,'Friend 3');
    peers[0]!.send('fan',{seq:5,fan:true,scoot:0});await sleep(80);assert.equal(authority.sim.fans[0]!.input.seq,4,'Rejoin cannot replay another player held fan');
    peers[0]!.send('fan',{seq:5,fan:false,scoot:0});await until(()=>authority.sim.fans[0]!.input.seq===5);
    const reset=authority.sim.resetId;peers[0]!.send('reset');peers[0]!.send('reset');await until(()=>authority.snapshot().resetVotes===1);assert.equal(authority.sim.resetId,reset);
    peers[1]!.send('reset');peers[2]!.send('reset');await until(()=>authority.sim.resetId===reset+1);assert(authority.sim.fans.every(f=>f.needsNeutral));
    authority.sim.checkpoint=1;authority.sim.hull.setTranslation({x:fanCentre(COURSE_END),y:-.08,z:COURSE_END+.1},true);await until(()=>authority.sim.complete);
    const finalTick=authority.sim.tick,finalPose={...authority.sim.hull.translation()};await sleep(100);assert.equal(authority.sim.tick,finalTick);assert.deepEqual({...authority.sim.hull.translation()},finalPose);
    await sleep(1500);peers[0]!.send('reset');await until(()=>authority.stage==='lobby');assert([...authority.members.values()].every(m=>!m.ready));assert.equal(authority.sim.checkpoint,0);
    console.log(JSON.stringify({case:'fan-network',checks:['Version/name/legacy save rejection','Four-ready cancellation and actual countdown','Neutral rearm, seat forgery, stale input and cadence ownership','Actual socket pause/reconnect retains name/seat; all stale thrust cleared','Distinct majority reset votes','Frozen finish and explicit re-ready replay']}));
  }finally{await Promise.allSettled(peers.map(r=>{r.reconnection.enabled=false;return r.connection.isOpen?r.leave():Promise.resolve();}));await server.gracefullyShutdown(false);}
});

class ControlledFanRoom extends FanRoom {
  override setSimulationInterval(_callback?:(elapsed:number)=>void){}
}
test('Fan wall-clock watchdog clears a held stroke before bounded catch-up after a long server stall',{timeout:10000},async()=>{
  await initPhysics();const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});server.define('fan-raft',ControlledFanRoom);
  let peer:Room|undefined;
  try {
    await server.listen(2619,'127.0.0.1');peer=await new Client('ws://127.0.0.1:2619').create('fan-raft',{...options,mode:'practice'});observe(peer);
    const authority=matchMaker.getLocalRoomById(peer.roomId);assert(authority instanceof ControlledFanRoom);
    peer.send('fan',{seq:1,fan:false,scoot:0});await until(()=>authority.sim.fans[2]!.input.seq===1);
    peer.send('fan',{seq:2,fan:true,scoot:1});await until(()=>authority.sim.fans[2]!.input.seq===2);
    authority.members.get(peer.sessionId)!.lastInputAt=Date.now()-2000;
    authority.advance(2050);
    assert.equal(authority.sim.tick,5);assert.equal(authority.sim.tick+authority.droppedSteps,123);
    assert.equal(authority.sim.fans[2]!.power,0);assert.equal(authority.sim.fans[2]!.strokes,0);assert(authority.sim.fans[2]!.needsNeutral);
    peer.send('fan',{seq:3,fan:true,scoot:0});await sleep(80);assert.equal(authority.sim.fans[2]!.input.seq,2);
    peer.send('fan',{seq:3,fan:false,scoot:0});await until(()=>authority.sim.fans[2]!.input.seq===3);
    peer.send('fan',{seq:4,fan:true,scoot:0});await until(()=>authority.sim.fans[2]!.input.seq===4);authority.advance(70);assert.equal(authority.sim.fans[2]!.strokes,1);
  }finally{await peer?.leave();await server.gracefullyShutdown(false);}
});
