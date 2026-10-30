// Parent IPC sets one approach pose in this isolated QA process. No test
// endpoint, teleport command, steering controller or extra force is shipped.
import {matchMaker} from '@colyseus/core';
import {BoatRoom} from '../../src/server/BoatRoom';
await import('../../src/server/index');
process.send?.({ready:true});
process.on('message',(message:unknown)=>{
  if(!message||typeof message!=='object'||!('room' in message)||typeof message.room!=='string')return;
  const room=matchMaker.getLocalRoomById(message.room);
  if(!(room instanceof BoatRoom)||room.stage!=='playing')return;
  room.sim.checkpoint=4;room.sim.reset();
  room.sim.hull.setTranslation({x:-8,y:.08,z:371},true);
  room.sim.hull.setLinvel({x:0,y:0,z:1.2},true);
  process.send?.({approach:true,resetId:room.sim.resetId,tick:room.sim.tick});
});
