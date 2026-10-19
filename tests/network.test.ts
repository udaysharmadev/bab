import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { Client, type Room } from '@colyseus/sdk';
import { PHYSICS_VERSION, PROTOCOL_VERSION, type Snapshot } from '../src/shared/protocol';

async function until(condition: () => boolean, timeout = 5000) {
  const start = Date.now();
  while (!condition()) { if (Date.now() - start > timeout) throw new Error('Timed out waiting for network condition'); await setTimeout(30); }
}

test('NET: four distinct seats, launch barrier, authority, forged inputs, drop/pause/reconnect and host independence', { timeout: 25000 }, async () => {
  const server = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { env: { ...process.env, PORT: '2568', BOAT_SAVE_DB: ':memory:' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; server.stdout.on('data', b => { log += String(b); }); server.stderr.on('data', b => { log += String(b); });
  const rooms: Room[] = [];
  const snapshots: (Snapshot | undefined)[] = [];
  const seats: number[] = [];
  try {
    await until(() => log.includes('authority listening'));
    const sdk = new Client('ws://127.0.0.1:2568');
    await assert.rejects(sdk.create('boat', { protocol: 999, physics: PHYSICS_VERSION }));
    const options = { protocol: PROTOCOL_VERSION, physics: PHYSICS_VERSION, mode: 'friends' };
    for (let i = 0; i < 4; i++) {
      const room = i === 0 ? await sdk.create('boat', options) : await sdk.joinById(rooms[0]!.roomId, options);
      rooms.push(room);
      room.onMessage<Snapshot>('snapshot', s => { snapshots[i] = s; });
      room.onMessage<{ seat: number }>('seat', s => { seats[i] = s.seat; });
      room.onMessage('voyage',()=>{});
      room.onError(() => {}); room.send('sync');
    }
    await until(() => seats.length === 4 && snapshots[0]?.crew.length === 4);
    assert.equal(new Set(seats).size, 4);
    await assert.rejects(sdk.joinById(rooms[0]!.roomId, options));
    for (const room of rooms.slice(0, 3)) room.send('ready', true);
    rooms[0]!.send('input', { seq: 1, x: 0, z: -1, dip: 1 });
    await setTimeout(100); assert.equal(snapshots[0]!.stage, 'lobby'); assert.equal(snapshots[0]!.tick, 0);
    assert.equal(snapshots[0]!.ack[0], 0);
    rooms[3]!.send('ready', true);
    await until(() => snapshots[0]?.stage === 'playing');
    rooms[0]!.send('input', { seq: 1, x: 0, z: 1, dip: 0 });
    await until(() => snapshots[0]?.ack[seats[0]!] === 1);
    rooms[0]!.send('input', { seq: 2, x: 0, z: 0, dip: 1, thrust: 9999 });
    rooms[0]!.send('input', { seq: 1, x: 0, z: 0, dip: 1 });
    rooms[0]!.send('input', { seq: 3, x: 0, z: 50, dip: 1 });
    rooms[0]!.send('hull', { position: { x: 0, y: 200, z: 999 } });
    rooms[0]!.send('checkpoint', { revision: 999 });
    await setTimeout(180);
    assert.equal(snapshots[0]!.ack[seats[0]!], 1);
    assert(snapshots[0]!.position.z < 5); assert.equal(snapshots[0]!.checkpoint, 0);
    // Four simultaneous action streams: forward paddlers and steering
    // paddlers must all be consumed, rather than one player's input winning.
    const seq = [1, 0, 0, 0];
    const pump = setInterval(() => rooms.forEach((room, i) => room.send('row', {
      seq: ++seq[i]!, forward: i < 2 ? 1 : 0, turn: i < 2 ? 0 : 1,
    })), 100);
    try { await setTimeout(3800); } finally { clearInterval(pump); }
    await until(() => snapshots[0]!.strokes.every(count => count >= 2));
    const mixed = snapshots[0]!;
    assert(mixed.ack.every((ack, i) => ack > (i === 0 ? 1 : 0)));
    assert(mixed.position.z > .4 && mixed.rotation.y < -.05, 'W from two players and D from two must combine');
    rooms.forEach((room, i) => room.send('row', { seq: ++seq[i]!, forward: 0, turn: 0 }));
    await until(() => snapshots[0]!.ack.every((ack, i) => ack === seq[i]));
    const lastAck = snapshots[0]!.ack[0]!;
    for (const forged of [{seq:lastAck,forward:1,turn:0}, {seq:lastAck+1,forward:1,turn:0,seat:3}, {seq:lastAck+1,forward:99,turn:0}]) rooms[0]!.send('row',forged);
    await setTimeout(100); assert.equal(snapshots[0]!.ack[0],lastAck);
    const token = rooms[0]!.reconnectionToken;
    rooms[0]!.reconnection.enabled = false;
    rooms[0]!.connection.close();
    await until(() => snapshots[1]?.paused === true);
    const pausedTick = snapshots[1]!.tick;
    await setTimeout(150); assert.equal(snapshots[1]!.tick, pausedTick);
    const oldSeat = seats[0];
    const rejoined = await sdk.reconnect(token); rooms[0] = rejoined;
    rejoined.onMessage<Snapshot>('snapshot', s => { snapshots[0] = s; });
    rejoined.onMessage<{ seat: number }>('seat', s => { seats[0] = s.seat; });
    rejoined.send('sync');
    await until(() => snapshots[1]?.paused === false && snapshots[0]!.tick > pausedTick);
    assert.equal(seats[0], oldSeat);
    assert.equal(snapshots[0]!.blades[oldSeat!]!.immersion, 0);
    assert(snapshots[1]!.reconnectSeconds! <= 90);
    await rejoined.leave();
    await until(() => snapshots[1]?.crew.length === 3 && snapshots[1]?.stage === 'lobby');
    assert(snapshots[1]!.tick > pausedTick, 'Organiser leaving must not kill authoritative room');
    console.log(JSON.stringify({ case: 'four-client-room', seats, pausedTick, resumedTick: snapshots[1]!.tick, forgeryRejected: true, reconnectSeatPreserved: true }));
  } catch (error) { console.error(log); throw error; }
  finally {
    for (const room of rooms) { room.reconnection.enabled = false; void room.leave(); }
    server.kill('SIGTERM');
  }
});
