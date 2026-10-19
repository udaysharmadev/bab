import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {setTimeout as sleep} from 'node:timers/promises';
import {writeFileSync} from 'node:fs';
import WebSocket,{WebSocketServer,type RawData} from 'ws';
import {Server,matchMaker,type Client as ServerClient} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {BoatRoom} from '../src/server/BoatRoom';
import {initPhysics} from '../src/shared/simulation';
import {PROTOCOL_VERSION,PHYSICS_VERSION,type Snapshot} from '../src/shared/protocol';
import {rowingAction} from '../src/shared/rowing';

async function until(check:()=>boolean,ms=7000){const start=Date.now();while(!check()){if(Date.now()-start>ms)throw new Error('Impairment condition timed out');await sleep(20);}}
class StressRoom extends BoatRoom {
 override reconnectGrace=2;
 readonly lifecycle:{event:string;seat:number|undefined;state:number;stage:string;members:number}[]=[];
 private trace(event:string,client:ServerClient){this.lifecycle.push({event,seat:this.members.get(client.sessionId)?.seat,state:client.state,stage:this.stage,members:this.members.size});}
 override onDrop(client:ServerClient){this.trace('drop',client);super.onDrop(client);}
 override onReconnect(client:ServerClient){this.trace('reconnect',client);super.onReconnect(client);}
 override onLeave(client:ServerClient){this.trace('leave',client);super.onLeave(client);}
}

test('Real WebSocket impairment grid, blackout, reconnect races, expiry and rate abuse preserve authority',{timeout:80000},async()=>{
 process.env.BOAT_SAVE_DB=':memory:';await initPhysics();
 const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});server.define('boat',StressRoom);
 const proxy=createServer((req,res)=>{
  const upstream=httpRequest({hostname:'127.0.0.1',port:2594,path:req.url,method:req.method,headers:req.headers},reply=>{res.writeHead(reply.statusCode??502,reply.headers);reply.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
 });
 const wss=new WebSocketServer({noServer:true}),sockets=new Set<WebSocket>(),timers=new Set<NodeJS.Timeout>();
 proxy.on('upgrade',(req,socket,head)=>wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req)));
 let seed=51823,enabled=false,delay=0,jitter=0,loss=0,blackoutUntil=0,dropped=0,forwarded=0,bytes=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 wss.on('connection',(down,req)=>{
  const up=new WebSocket(`ws://127.0.0.1:2594${req.url}`);sockets.add(down);sockets.add(up);
  const queued:{data:RawData;binary:boolean}[]=[];
  type Packet={buffer:Buffer;binary:boolean;due:number};
  const upward:Packet[]=[],downward:Packet[]=[];
  function drain(destination:WebSocket,queue:Packet[],outgoing:boolean){
   const head=queue[0];if(!head)return;
   const timer=setTimeout(()=>{
    timers.delete(timer);queue.shift();
    if(outgoing&&Date.now()<blackoutUntil)dropped++;
    else if(destination.readyState===WebSocket.OPEN){destination.send(head.buffer,{binary:head.binary});forwarded++;bytes+=head.buffer.byteLength;}
    drain(destination,queue,outgoing);
   },Math.max(1,head.due-Date.now()));timers.add(timer);
  }
  function forward(destination:WebSocket,data:RawData,binary:boolean,outgoing:boolean){
   const buffer=Array.isArray(data)?Buffer.concat(data):Buffer.from(data instanceof ArrayBuffer?new Uint8Array(data):data);
   const app=buffer[0]===13;
   if(enabled&&app&&(random()<loss||(outgoing&&Date.now()<blackoutUntil))){dropped++;return;}
   const wait=enabled&&app?Math.max(0,delay+(random()*2-1)*jitter):0;
   const queue=outgoing?upward:downward;
   queue.push({buffer,binary,due:Date.now()+wait});
   if(queue.length===1)drain(destination,queue,outgoing);
  }
  down.on('message',(data,binary)=>{if(up.readyState===WebSocket.OPEN)forward(up,data,binary,true);else queued.push({data,binary});});
  up.on('open',()=>queued.splice(0).forEach(m=>forward(up,m.data,m.binary,true)));
  up.on('message',(data,binary)=>forward(down,data,binary,false));
  up.on('error',()=>down.close());down.on('error',()=>up.close());
  down.on('close',()=>{sockets.delete(down);up.close();});up.on('close',()=>{sockets.delete(up);down.close();});
 });
 const rooms:Room[]=[],snapshots:(Snapshot|undefined)[]=[],acks=[0,0,0,0],violations:string[]=[],results:unknown[]=[];
 let pump:NodeJS.Timeout|undefined,diagnosticRoom:StressRoom|undefined;
 const options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends'};
 function watch(room:Room,index:number){
  snapshots[index]=undefined;
  room.onMessage('seat',()=>{});room.onMessage('voyage',()=>{});room.onError(()=>{});
  room.onMessage<Snapshot>('snapshot',s=>{
   if(s.ack[index]!<acks[index]!)violations.push(JSON.stringify({case:'ack-regression',seat:index,old:acks[index],ack:s.ack[index],tick:s.tick,reset:s.resetId,delay,jitter,loss,connected:room.connection.isOpen}));acks[index]=s.ack[index]!;snapshots[index]=s;
   if(![...Object.values(s.position),...Object.values(s.rotation),...Object.values(s.velocity)].every(Number.isFinite))violations.push('non-finite hull');
   if(s.blades.some(b=>b.force>420.001))violations.push('force cap');
  });room.send('sync');
 }
 try{
  await server.listen(2594,'127.0.0.1');await new Promise<void>(resolve=>proxy.listen(2595,'127.0.0.1',resolve));
  const sdk=new Client('ws://127.0.0.1:2595');
  for(let i=0;i<4;i++){const room=i===0?await sdk.create('boat',options):await sdk.joinById(rooms[0]!.roomId,options);rooms.push(room);watch(room,i);}
  rooms.forEach(room=>room.send('ready',true));await until(()=>snapshots.length===4&&snapshots.every(s=>s?.stage==='playing'));
  const authority=matchMaker.getLocalRoomById(rooms[0]!.roomId);assert(authority instanceof StressRoom);diagnosticRoom=authority;
  const seq=acks.slice(),keys=new Set(['KeyW']);
  pump=setInterval(()=>rooms.forEach((room,i)=>{if(room.connection.isOpen)room.send('row',{seq:++seq[i]!,...rowingAction(keys)});}),100);
  for(const profile of [{delay:80,jitter:35,loss:.10},{delay:180,jitter:70,loss:.25},{delay:300,jitter:100,loss:.15}]){
   enabled=false;await sleep(550);authority.sim.reset(true);
   ({delay,jitter,loss}=profile);dropped=forwarded=bytes=0;enabled=true;
   const before=authority.sim.tick,beforeStrokes=authority.sim.strokes.slice();await sleep(4000);
   assert(authority.sim.tick>before+100);assert.equal(authority.sim.condition,'afloat');assert(authority.sim.maxSpeed<5);
   assert(authority.sim.strokes.every((count,i)=>count-beforeStrokes[i]!>=2),'Every seat must keep rowing under delay/jitter');
   results.push({...profile,scope:'one-way ms; ordered application-message drop, not TCP packet loss',ticks:authority.sim.tick-before,dropped,forwarded,bytes,positionZ:authority.sim.hull.translation().z,strokes:authority.sim.strokes.slice()});
  }
  blackoutUntil=Date.now()+1700;await sleep(1500);assert(authority.sim.paddles.every(p=>p.dip===0),'Blackout must lift stale blades');
  results.push({case:'upstream-blackout',staleBladesLifted:true});
  enabled=false;blackoutUntil=0;keys.clear();await sleep(600);
  const token=rooms[0]!.reconnectionToken;rooms[0]!.reconnection.enabled=false;rooms[0]!.connection.close();
  await until(()=>authority.paused);const pausedTick=authority.sim.tick;await sleep(150);
  assert.equal(authority.sim.tick,pausedTick);assert(authority.sim.paddles.every(p=>p.dip===0));
  const races=await Promise.allSettled([sdk.reconnect(token),new Client('ws://127.0.0.1:2595').reconnect(token)]);
  const winners=races.filter((r):r is PromiseFulfilledResult<Room>=>r.status==='fulfilled');
  assert.equal(winners.length,1,'A reconnect token must admit exactly one connection');rooms[0]=winners[0]!.value;watch(rooms[0],0);
  // onReconnect runs before the transport's JOIN acknowledgement. Wait for a
  // snapshot on the new socket before treating that reconnect as complete.
  await until(()=>authority.stage==='playing'&&!authority.paused&&snapshots[0]?.paused===false);assert.equal(authority.members.get(rooms[0].sessionId)?.seat,0);
  results.push({case:'duplicate-reconnect-race',accepted:1,pausedAllBladesLifted:true});
  for(const i of [0,1]){rooms[i]!.reconnection.enabled=false;rooms[i]!.connection.close();}
  await until(()=>authority.paused);const frozen=authority.sim.tick;await sleep(180);assert.equal(authority.sim.tick,frozen);
  await Promise.all([0,1].map(async i=>{rooms[i]=await sdk.reconnect(rooms[i]!.reconnectionToken);watch(rooms[i]!,i);}));
  await until(()=>authority.stage==='playing'&&!authority.paused&&[0,1].every(i=>snapshots[i]?.paused===false));results.push({case:'two-simultaneous-reconnects',sameSeats:true});
  const expired=rooms[3]!.reconnectionToken;rooms[3]!.reconnection.enabled=false;rooms[3]!.connection.close();
  await until(()=>authority.stage==='lobby',5000);await assert.rejects(sdk.reconnect(expired));
  rooms[3]=await sdk.joinById(rooms[0]!.roomId,options);watch(rooms[3],3);assert.equal(authority.members.get(rooms[3].sessionId)?.seat,3);
  results.push({case:'real-grace-expiry',testGraceSeconds:2,productionGraceSeconds:90,expiredRejected:true,seatReclaimed:true});
  clearInterval(pump);pump=undefined;
  rooms[2]!.reconnection.enabled=false;
  for(let i=0;i<200;i++)rooms[2]!.send('input',{seq:99999999,x:999,z:999,dip:1,thrust:1e9});
  await until(()=>!authority.members.get(rooms[2]!.sessionId)?.connected);
  assert(authority.sim.hull.translation().z<20);results.push({case:'abusive-message-burst',clientDisconnected:true,forgedThrustRejected:true});
  assert.deepEqual(violations,[]);
  const evidence={result:'PASS',realWebSockets:true,humanPlaytest:false,reconnectBoundary:'Server snapshot received on the replacement socket, after JOIN acknowledgement',results,lifecycle:authority.lifecycle,violations};writeFileSync('evidence/network-stress.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
 }catch(error){console.error(JSON.stringify({completed:results,violations,lifecycle:diagnosticRoom?.lifecycle,error:String(error)}));throw error;}finally{
  if(pump)clearInterval(pump);rooms.forEach(room=>{room.reconnection.enabled=false;void room.leave().catch(()=>{});});
  timers.forEach(clearTimeout);sockets.forEach(socket=>socket.terminate());wss.close();await new Promise<void>(resolve=>proxy.close(()=>resolve()));await server.gracefullyShutdown(false);
 }
});
