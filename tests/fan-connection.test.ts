import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fanServerProblem,fanJoinProblem,checkFanServer} from '../src/client/fan-connection';
import {FAN_PROTOCOL,FAN_PHYSICS,FAN_WORLD} from '../src/shared/fan';

const healthy={status:'ready',fan:{protocol:FAN_PROTOCOL,physics:FAN_PHYSICS,world:FAN_WORLD}};
test('Fan preflight rejects the deployed legacy authority and incompatible identities',()=>{
  assert.equal(fanServerProblem(healthy),undefined);
  const stale={game:'Bad at Boating',protocol:3,physics:'basin-0.5',world:'waterworks-1',status:'ready'};
  assert.match(fanServerProblem(stale)!,/being updated/);
  for(const fan of [null,{},true,{...healthy.fan,protocol:0},{...healthy.fan,physics:'fan-raft-0.1'},{...healthy.fan,world:'old'}])
    assert.match(fanServerProblem({...healthy,fan})!,/being updated/);
  for(const value of [null,false,'html',[],{}, {...healthy,status:'starting'}])assert.match(fanServerProblem(value)!,/Could not reach/);
});
test('Join failures never expose raw framework errors and keep stale worker races actionable',()=>{
  assert.match(fanJoinProblem(new Error('provided room name "fan-raft" not defined')),/being updated/);
  assert.match(fanJoinProblem(new Error('The fan game changed. Reload this page.')),/being updated/);
  assert.match(fanJoinProblem(new Error('room not found')),/new invite/);
  assert.match(fanJoinProblem(new Error('This raft is full.')),/raft is full/);
  assert.match(fanJoinProblem(new Error('Too many room attempts')),/Wait a minute/);
  assert.match(fanJoinProblem(new Error('<stack trace>')),/Could not reach/);
});
test('Preflight fetch is uncached, bounded, rejects HTTP/JSON failures and retries recovered health',async t=>{
  let response=new Response(JSON.stringify({status:'ready',protocol:3}));let requests=0;
  t.mock.method(globalThis,'fetch',async(url:unknown,options:RequestInit)=>{
    requests++;assert.equal(url,'/game/health');assert.equal(options.cache,'no-store');assert(options.signal instanceof AbortSignal);return response;
  });
  await assert.rejects(checkFanServer('/game/health'),/being updated/);
  response=new Response('Unavailable',{status:503});await assert.rejects(checkFanServer('/game/health'),/Could not reach/);
  response=new Response('<html>');await assert.rejects(checkFanServer('/game/health'),/Could not reach/);
  response=new Response(JSON.stringify(healthy));await checkFanServer('/game/health');assert.equal(requests,4);
});
