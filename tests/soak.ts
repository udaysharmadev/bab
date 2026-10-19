import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {writeFileSync} from 'node:fs';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {BoatRoom} from '../src/server/BoatRoom';
import {initPhysics} from '../src/shared/simulation';
import {PROTOCOL_VERSION,PHYSICS_VERSION,type Snapshot} from '../src/shared/protocol';

async function until(check:()=>boolean,timeout=6000){
 const start=Date.now();while(!check()){assert(Date.now()-start<timeout,'Soak condition timed out');await sleep(25);}
}
async function run(){
 const seconds=Number(process.env.SOAK_SECONDS??1800);
 assert(Number.isInteger(seconds)&&seconds>=30&&seconds<=7200,'SOAK_SECONDS must be 30–7200');
 process.env.BOAT_SAVE_DB=':memory:';await initPhysics();
 const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});server.define('boat',BoatRoom);
 const rooms:Room[]=[],snapshots:(Snapshot|undefined)[]=[],lastSeen=[0,0,0,0],acks=[0,0,0,0],seq=[0,0,0,0];
 const memory:{seconds:number;heap:number;rss:number;tick:number;bodies:number;colliders:number}[]=[];
 const violations:string[]=[],reconnects:{seat:number;frozenTick:number;resumedTick:number}[]=[];
 let packets=0,totalCatches=0,maxGapMs=0,sharedResets=0,start=0,rowing=true;
 let pump:NodeJS.Timeout|undefined,authority:BoatRoom|undefined;
 const sdk=new Client('ws://127.0.0.1:2598');const options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends'};
 function watch(room:Room,index:number){
  snapshots[index]=undefined;lastSeen[index]=Date.now();
  for(const type of ['seat','voyage'])room.onMessage(type,()=>{});
  room.onMessage<Snapshot>('snapshot',s=>{
   const old=snapshots[index],now=Date.now();maxGapMs=Math.max(maxGapMs,now-lastSeen[index]!);lastSeen[index]=now;packets++;
   if(s.ack[index]!<acks[index]!)violations.push(`ack regression seat ${index}`);acks[index]=s.ack[index]!;
   if(![...Object.values(s.position),...Object.values(s.rotation),...Object.values(s.velocity)].every(Number.isFinite))violations.push('nonfinite hull');
   if(s.blades.some(b=>!Number.isFinite(b.force)||b.force>420.001))violations.push('invalid blade force');
   if(index===0&&old){totalCatches+=s.strokes.reduce((sum,n,i)=>sum+Math.max(0,n-old.strokes[i]!),0);if(s.resetId!==old.resetId)sharedResets++;}
   snapshots[index]=s;
  });room.send('sync');
 }
 const sampleMemory=()=>{
  global.gc?.();const usage=process.memoryUsage();
  memory.push({seconds:Math.round((Date.now()-start)/1000),heap:usage.heapUsed,rss:usage.rss,tick:authority!.sim.tick,bodies:authority!.sim.world.bodies.len(),colliders:authority!.sim.world.colliders.len()});
 };
 try{
  await server.listen(2598,'127.0.0.1');
  for(let i=0;i<4;i++){const r=i?await sdk.joinById(rooms[0]!.roomId,options):await sdk.create('boat',options);rooms.push(r);watch(r,i);}
  const found=matchMaker.getLocalRoomById(rooms[0]!.roomId);assert(found instanceof BoatRoom);authority=found;
  rooms.forEach(r=>r.send('ready',true));await until(()=>snapshots.length===4&&snapshots.every(s=>s?.stage==='playing'));
  start=Date.now();sampleMemory();const initialBodies=memory[0]!.bodies,initialColliders=memory[0]!.colliders;
  pump=setInterval(()=>{
   if(!rowing)return;
   const phase=Math.floor((Date.now()-start)/5000)%6;
   rooms.forEach((r,i)=>{if(r.connection.isOpen)r.send('row',{seq:++seq[i]!,forward:phase===3?-1:phase<3?1:0,turn:phase===1&&i>1?1:phase===2&&i>1?-1:phase===4?1:phase===5?-1:0});});
  },100);
  let nextSample=15,nextDrop=40,nextReset=25,dropIndex=0,lastRetry=0;
  while(Date.now()-start<seconds*1000){
   await sleep(200);const elapsed=(Date.now()-start)/1000;
   assert.equal(authority.members.size,4);assert.equal(authority.sim.world.bodies.len(),initialBodies);assert.equal(authority.sim.world.colliders.len(),initialColliders);
   assert.deepEqual(violations,[]);assert(snapshots.every((s,i)=>s&&Date.now()-lastSeen[i]!<5000),'All four clients must continue receiving snapshots');
   if(authority.sim.condition==='sunk'&&Date.now()-lastRetry>2200){rooms[0]!.send('reset');lastRetry=Date.now();}
   if(elapsed>=nextReset&&authority.sim.condition==='afloat'){
    const reset=authority.sim.resetId;rooms.slice(0,3).forEach(r=>r.send('reset'));
    await until(()=>authority!.sim.resetId>reset);nextReset=elapsed+25;
   }
   if(elapsed>=nextDrop){
    const i=dropIndex++%4;rowing=false;rooms.forEach((r,j)=>r.send('row',{seq:++seq[j]!,forward:0,turn:0}));await sleep(100);
    const token=rooms[i]!.reconnectionToken;rooms[i]!.reconnection.enabled=false;rooms[i]!.connection.close();await until(()=>authority!.paused);
    const tick:number=authority.sim.tick;await sleep(400);assert.equal(authority.sim.tick,tick);assert(authority.sim.paddles.every(p=>p.dip===0));
    rooms[i]=await sdk.reconnect(token);watch(rooms[i]!,i);await until(()=>!authority!.paused&&snapshots[i]?.paused===false);
    assert.equal(authority.members.get(rooms[i]!.sessionId)?.seat,i);await sleep(100);assert(authority.sim.paddles.every(p=>p.dip===0),'Reconnect must not replay old actions');
    rowing=true;await until(()=>authority!.sim.tick>tick);reconnects.push({seat:i,frozenTick:tick,resumedTick:authority.sim.tick});nextDrop=elapsed+40;
   }
   if(elapsed>=nextSample){sampleMemory();nextSample=elapsed+15;console.log(`Soak ${Math.round(elapsed)}/${seconds}s · tick ${authority.sim.tick} · ${packets} snapshots · ${reconnects.length} reconnects`);}
  }
  clearInterval(pump);pump=undefined;rowing=false;sampleMemory();
  assert(totalCatches>seconds/2,'Held controls must keep generating strokes across resets/reconnects');
  assert(memory.at(-1)!.heap-memory[0]!.heap<64*1024*1024,'Post-GC authority heap grew more than64MiB');
  const roomId=rooms[0]!.roomId;await Promise.all(rooms.map(r=>{r.reconnection.enabled=false;return r.leave();}));
  await until(()=>!matchMaker.getLocalRoomById(roomId));
  const result={result:'PASS',realWebSockets:true,humanPlaytest:false,scope:'Local real-time single crew; no Internet latency, browser GPU, capacity or multi-hour certification',seconds:(Date.now()-start)/1000,protocol:PROTOCOL_VERSION,packets,totalCatches,sharedResets,reconnects,maxGapMs,forcedGc:typeof global.gc==='function',memory,violations,roomDisposed:true};
  writeFileSync('evidence/soak.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,memorySamples:memory.length,memory:undefined},null,2));
 }finally{if(pump)clearInterval(pump);for(const r of rooms){r.reconnection.enabled=false;void r.leave().catch(()=>{});}await server.gracefullyShutdown(false);}
}
void run().catch(error=>{console.error(error);process.exitCode=1;});
