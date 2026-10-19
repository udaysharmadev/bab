// Owned only by the test runner over child-process IPC; no production HTTP/test command.
import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {BoatRoom} from '../../src/server/BoatRoom';
import {initPhysics} from '../../src/shared/simulation';
import {CHECKPOINTS} from '../../src/shared/world';
await initPhysics();
const server=new Server({transport:new WebSocketTransport({maxPayload:2048}),greet:false});
server.define('boat',BoatRoom);await server.listen(Number(process.env.PORT),'127.0.0.1');process.send?.({ready:true});
process.on('message',(message:unknown)=>{
 if(!message||typeof message!=='object')return;
 const m=message as {room?:string;checkpoint?:number};
 const room=m.room?matchMaker.getLocalRoomById(m.room):undefined;
 if(!(room instanceof BoatRoom)||m.checkpoint!==4)return;
 for(let i=1;i<=4;i++){room.sim.hull.setTranslation({x:0,y:.08,z:CHECKPOINTS[i]!+.1},true);room.sim.step();}
});
