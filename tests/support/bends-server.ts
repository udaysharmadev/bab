// Isolated QA process: authored poses arrive over parent IPC only. No test API
// or teleport command is added to the shipped authority or client protocol.
import {matchMaker} from '@colyseus/core';
import {BoatRoom} from '../../src/server/BoatRoom';
import {RIVER_BENDS,CHECKPOINTS,channelCenter,channelSlope} from '../../src/shared/world';
await import('../../src/server/index');
process.send?.({ready:true});
process.on('message',(message:unknown)=>{
  if(!message||typeof message!=='object'||!('room' in message)||typeof message.room!=='string'
    ||!('bend' in message)||typeof message.bend!=='number'||!Number.isInteger(message.bend))return;
  const bend=RIVER_BENDS[message.bend],room=matchMaker.getLocalRoomById(message.room);
  if(!bend||!(room instanceof BoatRoom)||room.stage!=='playing')return;
  const z=(bend.start+bend.end)/2,yaw=Math.atan(channelSlope(z));
  room.sim.checkpoint=CHECKPOINTS.filter(station=>station<z).length-1;
  room.sim.reset();
  room.sim.hull.setTranslation({x:channelCenter(z),y:.08,z},true);
  room.sim.hull.setRotation({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)},true);
  process.send?.({bend:message.bend,resetId:room.sim.resetId,z,x:channelCenter(z),section:bend.id});
});
