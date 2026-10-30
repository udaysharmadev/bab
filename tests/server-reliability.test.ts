import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { Server, matchMaker, Protocol, getMessageBytes } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import WebSocket from 'ws';
import { BoatRoom } from '../src/server/BoatRoom';
import { initPhysics } from '../src/shared/simulation';
import { DT, PHYSICS_VERSION, PROTOCOL_VERSION } from '../src/shared/protocol';
import { FINISH_Z } from '../src/shared/world';

async function until(check: () => boolean) {
  const start = Date.now();
  while (!check()) { assert(Date.now() - start < 6000, 'Reliability condition timed out'); await sleep(20); }
}
const options = { protocol: PROTOCOL_VERSION, physics: PHYSICS_VERSION, mode: 'friends' };
const observe = (room: Room) => {
  for (const type of ['snapshot', 'seat', 'voyage']) room.onMessage(type, () => {});
};

test('Slow output disconnects safely, retains the seat and resumes without old rowing', { timeout: 15000 }, async () => {
  process.env.BOAT_SAVE_DB = ':memory:';
  await initPhysics();
  const server = new Server({ transport: new WebSocketTransport({ maxPayload: 2048 }), greet: false });
  server.define('boat', BoatRoom);
  const rooms: Room[] = [];
  let unacknowledged: WebSocket | undefined;
  try {
    await server.listen(2601, '127.0.0.1');
    const sdk = new Client('ws://127.0.0.1:2601');
    for (let i = 0; i < 4; i++) {
      const room = i ? await sdk.joinById(rooms[0]!.roomId, options) : await sdk.create('boat', options);
      observe(room); rooms.push(room);
    }
    const authority = matchMaker.getLocalRoomById(rooms[0]!.roomId);
    assert(authority instanceof BoatRoom);
    rooms.forEach(room => room.send('ready', true));
    await until(() => authority.stage === 'playing');
    rooms[0]!.send('row', { seq: 1, forward: 1, turn: 0 });
    await until(() => authority.sim.paddles[0]!.intent.seq === 1);
    const oldSession = rooms[0]!.sessionId, token = rooms[0]!.reconnectionToken;
    rooms[0]!.reconnection.enabled = false;
    const blocked = authority.clients.find(client => client.sessionId === oldSession);
    assert(blocked);
    // Control the pressure measurement, then exercise the actual WS close and
    // SDK reconnect. This is a policy regression, not a TCP capacity benchmark.
    Object.defineProperty(blocked.ref, 'bufferedAmount', { configurable: true, value: 65537 });
    authority.sendSnapshot();
    await until(() => authority.paused);
    const tick = authority.sim.tick;
    await sleep(100);
    assert.equal(authority.sim.tick, tick);
    assert(authority.sim.paddles.every(paddle => paddle.dip === 0));
    assert.equal(authority.members.get(oldSession)?.connected, false);
    rooms[0] = await sdk.reconnect(token); observe(rooms[0]!); rooms[0]!.send('sync');
    await until(() => !authority.paused && authority.sim.tick > tick);
    assert.equal(rooms[0]!.sessionId, oldSession);
    assert.equal(authority.members.get(oldSession)?.seat, 0);
    assert(authority.sim.paddles.every(paddle => paddle.dip === 0));
    rooms[0]!.send('row', { seq: 2, forward: 1, turn: 0 });
    await until(() => authority.sim.paddles[0]!.intent.seq === 2);
    const refreshedToken=rooms[0]!.reconnectionToken.split(':')[1];
    rooms[0]!.reconnection.enabled=false; rooms[0]!.connection.close();
    await until(()=>authority.paused);
    const response=await fetch(`http://127.0.0.1:2601/matchmake/reconnect/${rooms[0]!.roomId}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reconnectionToken:refreshedToken}),
    });
    assert(response.ok);
    const reservation:{roomId:string;processId:string;sessionId:string}=await response.json();
    // The SDK forwards the original token into the WS URL; the HTTP response
    // itself intentionally does not include that credential.
    unacknowledged=new WebSocket(`ws://127.0.0.1:2601/${reservation.processId}/${reservation.roomId}?sessionId=${reservation.sessionId}&reconnectionToken=${refreshedToken}`);
    await new Promise<void>((resolve,reject)=>{unacknowledged!.once('message',data=>{
      if(data instanceof Buffer&&data[0]===Protocol.JOIN_ROOM)resolve();else reject(new Error('Expected reconnect JOIN handshake'));
    });unacknowledged!.once('error',reject);});
    assert.equal(authority.members.get(oldSession)?.connected,true,'Transport has returned before the JOIN acknowledgement');
    const frozen=authority.sim.tick;
    await sleep(150);assert.equal(authority.paused,true);assert.equal(authority.sim.tick,frozen,'Reconnecting transport must not resume physics before handshake completes');
    unacknowledged.send(Uint8Array.of(Protocol.JOIN_ROOM));
    await until(()=>!authority.paused&&authority.sim.tick>frozen);
    assert(authority.sim.paddles.every(paddle=>paddle.dip===0));
  } finally {
    if(unacknowledged?.readyState===WebSocket.OPEN) {
      const closed=new Promise<void>(resolve=>unacknowledged!.once('close',()=>resolve()));
      unacknowledged.send(Uint8Array.of(Protocol.LEAVE_ROOM)); await closed;
    } else unacknowledged?.terminate();
    await Promise.allSettled(rooms.map(room => { room.reconnection.enabled = false; return room.connection.isOpen ? room.leave() : Promise.resolve(); }));
    await server.gracefullyShutdown(false);
  }
});

class ControlledClockRoom extends BoatRoom {
  advance?: (elapsed: number) => void;
  override setSimulationInterval(callback?: (elapsed: number) => void) { this.advance = callback; }
}

test('Catch-up counts the complete stall, caps work at five steps and freezes on the first finish step', { timeout: 10000 }, async () => {
  await initPhysics();
  const server = new Server({ transport: new WebSocketTransport({ maxPayload: 2048 }), greet: false });
  server.define('boat', ControlledClockRoom);
  let room: Room | undefined;
  try {
    await server.listen(2602, '127.0.0.1');
    room = await new Client('ws://127.0.0.1:2602').create('boat', { ...options, mode: 'practice' });
    observe(room);
    const authority = matchMaker.getLocalRoomById(room.roomId);
    assert(authority instanceof ControlledClockRoom);
    assert(authority.advance);
    authority.advance(2050);
    assert.equal(authority.sim.tick, 5, 'Bounded work regardless of stall duration');
    assert.equal(authority.sim.tick + authority.droppedSteps, 123, 'All 2.05 seconds must be accounted for');
    assert(authority.debt >= 0 && authority.debt < DT);
    authority.sim.hull.setTranslation({ x: 0, y: .08, z: FINISH_Z + 1 }, true);
    authority.sim.accept(0, { seq: 1, x: 0, z: -.5, dip: 1 });
    const tick = authority.sim.tick;
    authority.advance(100);
    assert.equal(authority.sim.complete, true);
    assert.equal(authority.sim.tick, tick + 1, 'No remaining catch-up steps after finish');
    assert.equal(authority.debt, 0);
    assert(authority.sim.paddles.every(paddle => paddle.dip === 0));
    assert.equal(authority.snapshot().finishTimeMs, authority.sim.tick * DT * 1000);
  } finally {
    await room?.leave();
    await server.gracefullyShutdown(false);
  }
});

test('A socket withholding JOIN acknowledgement cannot accumulate periodic snapshot messages', { timeout: 10000 }, async () => {
  process.env.BOAT_SAVE_DB = ':memory:';
  await initPhysics();
  const server = new Server({ transport: new WebSocketTransport({ maxPayload: 2048 }), greet: false });
  server.define('boat', BoatRoom);
  let socket: WebSocket | undefined;
  try {
    await server.listen(2603, '127.0.0.1');
    const response = await fetch('http://127.0.0.1:2603/matchmake/create/boat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options),
    });
    assert(response.ok);
    const reservation: { roomId: string; processId: string; sessionId: string } = await response.json();
    assert.equal(typeof reservation.roomId, 'string');
    socket = new WebSocket(`ws://127.0.0.1:2603/${reservation.processId}/${reservation.roomId}?sessionId=${reservation.sessionId}`);
    await new Promise<void>((resolve, reject) => { socket!.once('open', resolve); socket!.once('error', reject); });
    const authority = matchMaker.getLocalRoomById(reservation.roomId);
    assert(authority instanceof BoatRoom);
    await until(() => authority.clients.length === 1);
    const client = authority.clients[0]!;
    assert('_enqueuedMessages' in client && Array.isArray(client._enqueuedMessages));
    const initial = client._enqueuedMessages.length;
    for (let i = 0; i < 200; i++) authority.sendSnapshot();
    await sleep(100);
    assert.equal(client._enqueuedMessages.length, initial, 'Only bounded seat/voyage setup messages may wait for JOIN');
    assert(initial <= 2);
    for(let i=0;i<20;i++) {
      socket.send(getMessageBytes.raw(Protocol.ROOM_DATA,'sync'));
      socket.send(getMessageBytes.raw(Protocol.ROOM_DATA,'ready',true));
      socket.send(getMessageBytes.raw(Protocol.ROOM_DATA,'row',{seq:i+1,forward:1,turn:0}));
    }
    await sleep(150);
    assert.equal(client._enqueuedMessages.length,initial,'Commands before JOIN acknowledgement cannot grow the setup queue');
    assert.equal(authority.members.get(client.sessionId)?.ready,false,'Unacknowledged client cannot ready the crew');
  } finally {
    socket?.terminate();
    await server.gracefullyShutdown(false);
  }
});
