// QA-only authored poses through the parent process; no shipped HTTP/WS teleport endpoint.
import {matchMaker} from '@colyseus/core';
import {FanRoom} from '../../src/server/FanRoom';
import {fanCentre} from '../../src/shared/fan';
await import('../../src/server/index');process.send?.({ready:true});
process.on('message',(message:unknown)=>{
  if(!message||typeof message!=='object'||!('room' in message)||typeof message.room!=='string'
    ||!('z' in message)||typeof message.z!=='number'||!Number.isFinite(message.z)
    ||!('offset' in message)||typeof message.offset!=='number'||!Number.isFinite(message.offset))return;
  const room=matchMaker.getLocalRoomById(message.room);if(!(room instanceof FanRoom))return;
  room.sim.checkpoint=message.z>=76?1:0;room.sim.reset();
  room.sim.hull.setTranslation({x:fanCentre(message.z)+message.offset,y:-.08,z:message.z},true);
  process.send?.({z:message.z,resetId:room.sim.resetId});
});
