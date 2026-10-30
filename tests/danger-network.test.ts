import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {Client,type Room} from '@colyseus/sdk';
import {BoatRoom} from '../src/server/BoatRoom';
import {initPhysics} from '../src/shared/simulation';
import {PROTOCOL_VERSION,PHYSICS_VERSION,type Snapshot} from '../src/shared/protocol';

test('Server-selected mover phase reaches every peer; clients cannot choose it; old clients are rejected',async()=>{
  process.env.BOAT_SAVE_DB=':memory:';await initPhysics();
  const server=new Server({transport:new WebSocketTransport(),greet:false});server.define('boat',BoatRoom);
  const rooms:Room[]=[];
  try{
    await server.listen(2617,'127.0.0.1');const sdk=new Client('ws://127.0.0.1:2617');
    const options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends',hazardPhase:-999};
    const snapshots:Snapshot[]=[];
    for(let i=0;i<4;i++){
      const room=i?await sdk.joinById(rooms[0]!.roomId,options):await sdk.create('boat',options);rooms.push(room);
      room.onMessage('seat',()=>{});room.onMessage('voyage',()=>{});
      snapshots.push(await new Promise<Snapshot>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Snapshot timeout')),5000);room.onMessage<Snapshot>('snapshot',s=>{clearTimeout(timer);resolve(s);});room.send('sync');}));
      if(i===0){
        await assert.rejects(sdk.joinById(room.roomId,{...options,protocol:5}),/version|Reload/i);
        await assert.rejects(sdk.joinById(room.roomId,{...options,protocol:6}),/version|Reload/i);
        await assert.rejects(sdk.joinById(room.roomId,{...options,physics:'basin-0.9'}),/version|Reload/i);
        await assert.rejects(sdk.joinById(room.roomId,{...options,physics:'basin-0.10'}),/version|Reload/i);
        await assert.rejects(sdk.joinById(room.roomId,{...options,physics:'basin-0.11'}),/version|Reload/i);
        await assert.rejects(sdk.joinById(room.roomId,{...options,physics:'basin-0.12'}),/version|Reload/i);
      }
    }
    const authority=matchMaker.getLocalRoomById(rooms[0]!.roomId);assert(authority instanceof BoatRoom);
    const phase=authority.sim.hazardPhase;assert(phase>=0&&phase<120);
    assert(snapshots.every(s=>s.hazardPhase===phase));
    authority.sim.reset();assert.equal(authority.snapshot().hazardPhase,phase);
  }finally{await Promise.allSettled(rooms.map(r=>r.leave()));await server.gracefullyShutdown(false);}
});
