// One IPC-only pose in an isolated QA authority; no gameplay test endpoint.
import {matchMaker} from '@colyseus/core';
import {BoatRoom} from '../../src/server/BoatRoom';
await import('../../src/server/index');
process.send?.({ready:true});
process.on('message',(message:unknown)=>{
 if(!message||typeof message!=='object'||!('room' in message)||typeof message.room!=='string')return;
 const room=matchMaker.getLocalRoomById(message.room);if(!(room instanceof BoatRoom)||room.stage!=='playing')return;
 room.sim.checkpoint=4;room.sim.reset();room.sim.hull.setTranslation({x:-10.5,y:.08,z:260},true);
 process.send?.({approach:true,resetId:room.sim.resetId});
});
