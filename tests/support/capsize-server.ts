// QA-only parent IPC initial pose; no teleport command in shipped game.
import {matchMaker} from '@colyseus/core';
import {BoatRoom} from '../../src/server/BoatRoom';
await import('../../src/server/index');process.send?.({ready:true});
process.on('message',(message:unknown)=>{
 if(!message||typeof message!=='object'||!('room' in message)||typeof message.room!=='string')return;
 const room=matchMaker.getLocalRoomById(message.room);if(!(room instanceof BoatRoom)||room.stage!=='playing')return;
 room.sim.checkpoint=4;room.sim.reset();room.sim.hull.setTranslation({x:0,y:.08,z:264},true);room.sim.hull.setRotation({x:0,y:0,z:1,w:0},true);
 process.send?.({flipped:true,reset:room.sim.resetId});
});
