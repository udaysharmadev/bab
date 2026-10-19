import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fork,type ChildProcess} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {Client,type Room} from '@colyseus/sdk';
import {PROTOCOL_VERSION,PHYSICS_VERSION,type Snapshot} from '../src/shared/protocol';
async function until(check:()=>boolean){const start=Date.now();while(!check()){if(Date.now()-start>7000)throw new Error('Save restart wait timed out');await sleep(25);}}

test('A real server crash restores the durable canonical checkpoint into a new four-ready room', {timeout:25000},async()=>{
 const folder=mkdtempSync(join(tmpdir(),'boat-restart-'));let server:ChildProcess|undefined;const rooms:Room[]=[];
 async function boot(){
  const child=fork('tests/support/save-server.ts',[],{execArgv:['--import','tsx'],env:{...process.env,PORT:'2593',BOAT_SAVE_DB:join(folder,'save.sqlite')},silent:true});
  let ready=false,output='';child.on('message',m=>{if(m&&typeof m==='object'&&'ready' in m&&m.ready)ready=true;});child.stderr?.on('data',b=>output+=String(b));
  await until(()=>ready||child.exitCode!==null);assert(ready,output);return child;
 }
 try{
  server=await boot();const sdk=new Client('ws://127.0.0.1:2593');const options={protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,mode:'friends'};
  let saved:{token:string;checkpoint:number}|undefined;
  const first=await sdk.create('boat',options);rooms.push(first);
  first.onMessage('voyage',m=>saved=m);first.onMessage('snapshot',()=>{});first.onMessage('seat',()=>{});first.send('sync');
  for(let i=1;i<4;i++){const room=await sdk.joinById(first.roomId,options);rooms.push(room);room.onMessage('voyage',()=>{});room.onMessage('snapshot',()=>{});room.onMessage('seat',()=>{});}
  rooms.forEach(room=>room.send('ready',true));await sleep(120);
  server.send({room:first.roomId,checkpoint:4});await until(()=>saved?.checkpoint===4);
  const token=saved!.token;rooms.forEach(room=>room.reconnection.enabled=false);
  const exited=new Promise(resolve=>server!.once('exit',resolve));server.kill('SIGKILL');await exited;
  server=await boot();
  const resumed=await new Client('ws://127.0.0.1:2593').create('boat',{...options,saveToken:token});rooms.push(resumed);
  let snapshot:Snapshot|undefined;resumed.onMessage<Snapshot>('snapshot',s=>snapshot=s);resumed.onMessage('seat',()=>{});resumed.onMessage('voyage',()=>{});resumed.send('sync');
  await until(()=>snapshot?.checkpoint===4);
  assert.equal(snapshot!.stage,'lobby');assert.equal(snapshot!.position.z,260);assert.equal(snapshot!.velocity.z,0);
  assert(snapshot!.blades.every(b=>b.immersion===0));
  await assert.rejects(new Client('ws://127.0.0.1:2593').create('boat',{...options,saveToken:token}),/already active/);
  console.log(JSON.stringify({case:'process-crash-durable-resume',checkpoint:4,z:snapshot!.position.z,stage:snapshot!.stage,duplicateResumeRejected:true}));
 }finally{
  for(const room of rooms){room.reconnection.enabled=false;if(room.connection?.isOpen)await room.leave().catch(()=>{});}
  if(server&&server.exitCode===null){const exited=new Promise(resolve=>server!.once('exit',resolve));server.kill('SIGTERM');await exited;}
  rmSync(folder,{recursive:true,force:true});
 }
});
