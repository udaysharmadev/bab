import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {cpus,platform,arch,release,totalmem} from 'node:os';
import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import WebSocket from 'ws';
import {BoatRoom} from '../src/server/BoatRoom';
import {initPhysics} from '../src/shared/simulation';
import {PROTOCOL_VERSION,PHYSICS_VERSION,PADDLE_SHAFT_RADIUS,type Snapshot} from '../src/shared/protocol';

const seconds=Number(process.env.LOAD_SECONDS??120),roomCount=Number(process.env.LOAD_ROOMS??4);
assert(Number.isInteger(seconds)&&seconds>=30&&seconds<=7200,'LOAD_SECONDS must be30–7200');
assert(Number.isInteger(roomCount)&&roomCount>=1&&roomCount<=8,'LOAD_ROOMS must be1–8 (normal admission limits apply)');
process.env.BOAT_SAVE_DB=':memory:';
await initPhysics();
const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});
server.define('boat',BoatRoom);
const sdk=new Client('ws://127.0.0.1:2604');
const options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends'};
type Crew={clients:Room[];authority:BoatRoom;snapshots:(Snapshot|undefined)[];lastSeen:number[];sequence:number[];previousAck:number[];resets:number;reconnects:number;gapMax:number;packets:number;wire:{outBytes:number;inBytes:number;outMessages:number};paused:boolean;resetAt:number};
const crews:Crew[]=[],violations:string[]=[],samples:unknown[]=[];
let pump:NodeJS.Timeout|undefined,start=0;
const delay=monitorEventLoopDelay({resolution:10});
const byteLength=(value:unknown)=>typeof value==='string'?Buffer.byteLength(value):value instanceof ArrayBuffer?value.byteLength:ArrayBuffer.isView(value)?value.byteLength:0;
async function until(check:()=>boolean,timeout=8000){const begin=Date.now();while(!check()){assert(Date.now()-begin<timeout,'Load condition timed out');await sleep(20);}}
function watch(crew:Crew,room:Room,seat:number){
  crew.lastSeen[seat]=Date.now();
  for(const type of ['seat','voyage'])room.onMessage(type,()=>{});
  room.onMessage<Snapshot>('snapshot',snapshot=>{
    const previous=crew.snapshots[seat],now=Date.now();
    crew.gapMax=Math.max(crew.gapMax,now-crew.lastSeen[seat]!);crew.lastSeen[seat]=now;crew.packets++;
    if(snapshot.ack[seat]!<crew.previousAck[seat]!)violations.push('acknowledgement regression');
    crew.previousAck[seat]=snapshot.ack[seat]!;
    if(![...Object.values(snapshot.position),...Object.values(snapshot.rotation),...Object.values(snapshot.velocity)].every(Number.isFinite))violations.push('nonfinite hull');
    if(snapshot.blades.some(blade=>!Number.isFinite(blade.force)||blade.force>420.001))violations.push('unbounded blade force');
    if(seat===0&&previous&&snapshot.resetId!==previous.resetId)crew.resets++;
    crew.snapshots[seat]=snapshot;
  });room.send('sync');
}
function measureTransport(crew:Crew,id?:string){
  for(const client of crew.authority.clients){
    if(id&&client.sessionId!==id)continue;
    const socket=client.ref;
    assert(socket instanceof WebSocket);
    socket.send=new Proxy(socket.send,{apply(target,receiver,args){crew.wire.outBytes+=byteLength(args[0]);crew.wire.outMessages++;return Reflect.apply(target,receiver,args);}});
    socket.on('message',(data:unknown)=>{crew.wire.inBytes+=byteLength(data);});
  }
}
function sample(){
  global.gc?.();
  samples.push({seconds:(Date.now()-start)/1000,...process.memoryUsage(),rooms:crews.map(crew=>({tick:crew.authority.sim.tick,droppedSteps:crew.authority.droppedSteps,bodies:crew.authority.sim.world.bodies.len(),colliders:crew.authority.sim.world.colliders.len(),members:crew.authority.members.size}))});
}
try {
  await server.listen(2604,'127.0.0.1');
  for(let index=0;index<roomCount;index++){
    const clients:Room[]=[];
    for(let seat=0;seat<4;seat++)clients.push(seat?await sdk.joinById(clients[0]!.roomId,options):await sdk.create('boat',options));
    const authority=matchMaker.getLocalRoomById(clients[0]!.roomId);assert(authority instanceof BoatRoom);
    const crew:Crew={clients,authority,snapshots:[],lastSeen:[0,0,0,0],sequence:[0,0,0,0],previousAck:[0,0,0,0],resets:0,reconnects:0,gapMax:0,packets:0,wire:{outBytes:0,inBytes:0,outMessages:0},paused:false,resetAt:0};
    crews.push(crew);clients.forEach((client,seat)=>watch(crew,client,seat));measureTransport(crew);
    clients.forEach(client=>client.send('ready',true));
  }
  await until(()=>crews.every(crew=>crew.snapshots.length===4&&crew.snapshots.every(snapshot=>snapshot?.stage==='playing')));
  start=Date.now();const cpuStart=process.cpuUsage(),utilization=performance.eventLoopUtilization();delay.enable();sample();
  const initial=crews.map(crew=>({bodies:crew.authority.sim.world.bodies.len(),colliders:crew.authority.sim.world.colliders.len()}));
  pump=setInterval(()=>{
    const phase=Math.floor((Date.now()-start)/4000)%4;
    for(const crew of crews)if(!crew.paused)crew.clients.forEach((client,seat)=>{if(client.connection.isOpen)client.send('row',{seq:++crew.sequence[seat]!,forward:phase===2?-1:phase===3?0:1,turn:phase===1&&seat>1?1:phase===3?-1:0});});
  },100);
  let nextSample=10,nextReset=15,nextDrop=25,drop=0;
  while(Date.now()-start<seconds*1000){
    await sleep(150);const elapsed=(Date.now()-start)/1000;
    assert.deepEqual(violations,[]);
    for(const [index,crew] of crews.entries()){
      assert.equal(crew.authority.members.size,4);assert.equal(crew.authority.sim.world.bodies.len(),initial[index]!.bodies);assert.equal(crew.authority.sim.world.colliders.len(),initial[index]!.colliders);
      assert(crew.snapshots.every((snapshot,seat)=>snapshot&&Date.now()-crew.lastSeen[seat]!<5000),'Every client must receive fresh snapshots');
      if((crew.authority.sim.condition==='sunk'||elapsed>=nextReset)&&Date.now()-crew.resetAt>2200){
        crew.clients.slice(0,3).forEach(client=>client.send('reset'));crew.resetAt=Date.now();
      }
    }
    if(elapsed>=nextReset)nextReset=elapsed+15;
    if(elapsed>=nextDrop){
      const crew=crews[drop%crews.length]!,seat=Math.floor(drop/crews.length)%4;drop++;
      const otherTicks=crews.filter(other=>other!==crew).map(other=>other.authority.sim.tick);
      crew.paused=true;crew.clients.forEach((client,index)=>client.send('row',{seq:++crew.sequence[index]!,forward:0,turn:0}));
      await sleep(100);const previous=crew.clients[seat]!,token=previous.reconnectionToken;previous.reconnection.enabled=false;previous.connection.close();
      await until(()=>crew.authority.paused);const frozen=crew.authority.sim.tick;await sleep(250);assert.equal(crew.authority.sim.tick,frozen);
      assert(crew.authority.sim.paddles.every(paddle=>paddle.dip===0));
      crews.filter(other=>other!==crew).forEach((other,index)=>assert(other.authority.sim.tick>otherTicks[index]!,'One crew drop must not freeze another room'));
      crew.clients[seat]=await sdk.reconnect(token);watch(crew,crew.clients[seat]!,seat);measureTransport(crew,crew.clients[seat]!.sessionId);
      await until(()=>!crew.authority.paused&&crew.authority.sim.tick>frozen);assert.equal(crew.authority.members.get(crew.clients[seat]!.sessionId)?.seat,seat);
      assert(crew.authority.sim.paddles.every(paddle=>paddle.dip===0));crew.reconnects++;crew.paused=false;nextDrop=elapsed+25;
    }
    if(elapsed>=nextSample){sample();nextSample=elapsed+10;console.log(`Load ${Math.round(elapsed)}/${seconds}s · ${roomCount} rooms /${roomCount*4} clients`);}
  }
  clearInterval(pump);pump=undefined;sample();delay.disable();
  const actualSeconds=(Date.now()-start)/1000,cpu=process.cpuUsage(cpuStart),eventLoop=performance.eventLoopUtilization(utilization);
  if(seconds>=roomCount*25+5)assert(crews.every(crew=>crew.reconnects>0),'A long-enough run must exercise every room reconnecting');
  const roomResults=crews.map(crew=>({packets:crew.packets,maxSnapshotGapMs:crew.gapMax,resets:crew.resets,reconnects:crew.reconnects,droppedSteps:crew.authority.droppedSteps,tick:crew.authority.sim.tick,wirePayloadBytes:crew.wire,averageOutboundBytesPerClientSecond:crew.wire.outBytes/4/actualSeconds}));
  const ids=crews.map(crew=>crew.clients[0]!.roomId);
  await Promise.all(crews.flatMap(crew=>crew.clients.map(client=>{client.reconnection.enabled=false;return client.leave();})));
  await until(()=>ids.every(id=>!matchMaker.getLocalRoomById(id)));
  const result={result:'PASS',date:new Date().toISOString(),runtime:process.version,protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,shaftContactRadius:PADDLE_SHAFT_RADIUS,host:{platform:platform(),arch:arch(),osRelease:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,totalMemoryBytes:totalmem()},requestedSeconds:seconds,actualSeconds,roomCount,clientCount:roomCount*4,realWebSockets:true,humanPlaytest:false,scope:'Local co-hosted authority+SDK clients, synthetic workload; not Internet, browser GPU, maximum capacity or hosting certification. Wire bytes count WS application payloads, excluding WS/TCP framing; per-client average includes setup/reconnect traffic.',cpuUserMs:cpu.user/1000,cpuSystemMs:cpu.system/1000,eventLoop:{utilization:eventLoop.utilization,delayP50ms:delay.percentile(50)/1e6,delayP95ms:delay.percentile(95)/1e6,delayMaxMs:delay.max/1e6},forcedGc:typeof global.gc==='function',rooms:roomResults,memory:samples,violations,roomsDisposed:true};
  writeFileSync('evidence/load.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,memory:undefined},null,2));
} catch(error){writeFileSync('evidence/load.json',JSON.stringify({result:'FAIL',date:new Date().toISOString(),requestedSeconds:seconds,roomCount,actualSeconds:start?(Date.now()-start)/1000:0,error:String(error),violations,memory:samples},null,2)+'\n');throw error;}
finally{if(pump)clearInterval(pump);delay.disable();await Promise.allSettled(crews.flatMap(crew=>crew.clients.map(client=>{client.reconnection.enabled=false;return client.connection.isOpen?client.leave():Promise.resolve();})));await server.gracefullyShutdown(false);}

