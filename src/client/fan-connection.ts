import {FAN_PHYSICS,FAN_PROTOCOL,FAN_WORLD} from '../shared/fan';

const updating='The game server is being updated. Please try again shortly.';
const unreachable='Could not reach the game server. Check your connection and try again.';

export function fanServerProblem(info:unknown):string|undefined {
  if(!info||typeof info!=='object'||!('status' in info)||info.status!=='ready')return unreachable;
  if(!('fan' in info)||!info.fan||typeof info.fan!=='object')return updating;
  const fan=info.fan;
  if(!('protocol' in fan)||fan.protocol!==FAN_PROTOCOL||!('physics' in fan)||fan.physics!==FAN_PHYSICS
    ||!('world' in fan)||fan.world!==FAN_WORLD)return updating;
}

export async function checkFanServer(url:string) {
  let info:unknown;
  try {
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(6000)});
    if(!response.ok)throw new Error('Unavailable');
    info=await response.json();
  }catch{throw new Error(unreachable);}
  const problem=fanServerProblem(info);if(problem)throw new Error(problem);
}

export function fanJoinProblem(error:unknown):string {
  const message=error instanceof Error?error.message:'';
  if(message===updating||message===unreachable)return message;
  // A deployment may switch workers between preflight and matchmaking.
  if(/room name .*not defined|fan game changed|reload for the fan game/i.test(message))return updating;
  if(/not found|no rooms found|room.*expired|invalid reconnection/i.test(message))return 'This crew is no longer available. Ask for a new invite or start a fresh crew.';
  if(/full|locked/i.test(message))return 'This raft is full. Ask your friends for another invite.';
  if(/name/i.test(message))return 'Enter a name using up to 20 letters, numbers or spaces.';
  if(/too many|rate limit/i.test(message))return 'Too many attempts. Wait a minute, then try again.';
  return unreachable;
}
