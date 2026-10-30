import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {writeFileSync} from 'node:fs';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {BoatRoom} from '../src/server/BoatRoom';
import {initPhysics} from '../src/shared/simulation';
import {PROTOCOL_VERSION,PHYSICS_VERSION,type Snapshot} from '../src/shared/protocol';

process.env.BOAT_SAVE_DB=':memory:';await initPhysics();
const server=new Server({transport:new WebSocketTransport(),greet:false});server.define('boat',BoatRoom);
const rooms:Room[]=[],snapshots:(Snapshot|undefined)[]=[],checks:unknown[]=[];
const options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends'};
const until=async(check:()=>boolean,ms=8000)=>{const start=Date.now();while(!check()){assert(Date.now()-start<ms,'Condition timed out');await sleep(25);}};
function watch(room:Room,seat:number){for(const type of ['seat','voyage'])room.onMessage(type,()=>{});room.onMessage<Snapshot>('snapshot',s=>{snapshots[seat]=s;});room.send('sync');}
try{
 await server.listen(2620,'127.0.0.1');const sdk=new Client('ws://127.0.0.1:2620');
 for(let i=0;i<4;i++){const room=i?await sdk.joinById(rooms[0]!.roomId,{...options,name:`Rower ${i}`}):await sdk.create('boat',{...options,name:'Rower 0'});rooms.push(room);watch(room,i);}
 const authority=matchMaker.getLocalRoomById(rooms[0]!.roomId);assert(authority instanceof BoatRoom);assert.equal(authority.reconnectGrace,90);
 rooms.forEach(r=>r.send('ready',true));await until(()=>snapshots.length===4&&snapshots.every(s=>s?.stage==='playing'));
 rooms[0]!.send('row',{seq:1,forward:1,turn:0});await until(()=>authority.sim.strokes[0]!>0);
 const phase=authority.sim.hazardPhase,checkpoint=authority.sim.checkpoint,token=rooms[0]!.reconnectionToken;
 rooms[0]!.reconnection.enabled=false;rooms[0]!.connection.close();await until(()=>authority.paused);
 const tick=authority.sim.tick,reset=authority.sim.resetId,strokes=authority.sim.strokes.slice(),started=Date.now();
 while(Date.now()-started<45000){await sleep(Math.min(1000,45000-(Date.now()-started)));assert.equal(authority.sim.tick,tick);assert.equal(authority.sim.resetId,reset);assert.equal(authority.members.size,4);}
 rooms[0]=await sdk.reconnect(token);watch(rooms[0],0);await until(()=>!authority.paused&&authority.sim.tick>tick);
 assert.equal(authority.members.get(rooms[0].sessionId)?.seat,0);assert.equal(authority.members.get(rooms[0].sessionId)?.name,'Rower 0');assert.equal(authority.sim.hazardPhase,phase);assert.equal(authority.sim.checkpoint,checkpoint);
 await sleep(1800);assert.deepEqual(authority.sim.strokes,strokes);assert(authority.sim.blades.every(b=>b.immersion===0));
 checks.push({case:'real45SecondAbsence',milliseconds:Date.now()-started,sameSeatNameCheckpointPhase:true,frozenClock:true,noStaleStroke:true});console.log('PASS:45-second absence resumes same seat without stale input');
 const expired=rooms[3]!.reconnectionToken;rooms[3]!.reconnection.enabled=false;rooms[3]!.connection.close();await until(()=>authority.paused);
 const expiryStarted=Date.now(),frozen=authority.sim.tick;
 while(Date.now()-expiryStarted<88000){await sleep(Math.min(1000,88000-(Date.now()-expiryStarted)));assert.equal(authority.sim.tick,frozen);assert.equal(authority.members.size,4);assert.equal(authority.stage,'playing');}
 await until(()=>authority.members.size===3&&authority.stage==='lobby',10000);
 const expiryMs=Date.now()-expiryStarted;assert(expiryMs>=89000&&expiryMs<100000);await assert.rejects(sdk.reconnect(expired));
 assert(authority.snapshot().crew.every(m=>!m.ready));assert.equal(authority.sim.checkpoint,checkpoint);
 rooms[3]=await sdk.joinById(rooms[0]!.roomId,{...options,name:'Replacement'});watch(rooms[3],3);await until(()=>authority.members.get(rooms[3]!.sessionId)?.seat===3);
 rooms.forEach(r=>r.send('ready',true));await until(()=>authority.stage==='playing'&&!authority.paused);
 checks.push({case:'real90SecondExpiry',expiryMs,expiredTokenRejected:true,seatReclaimed:true,checkpointPreserved:true,fourReadyRelaunch:true});
 writeFileSync('evidence/grace.json',JSON.stringify({result:'PASS',physics:PHYSICS_VERSION,productionGraceSeconds:90,clock:'actual wall time; no shortened grace or fake timers',checks,scope:'Local real WebSocket disconnect/reconnect/expiry. Real Internet/TCP loss, physical network changes and long browser soak remain open.'},null,2)+'\n');console.log('PASS:90-second expiry rejects old token and relaunches replacement crew');
}catch(error){writeFileSync('evidence/grace.json',JSON.stringify({result:'FAIL',checks,error:String(error)},null,2)+'\n');throw error;}
finally{await Promise.allSettled(rooms.map(r=>{r.reconnection.enabled=false;return r.leave();}));await server.gracefullyShutdown(false);}
