import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@colyseus/sdk';

const target = new URL(process.argv[2] ?? 'http://localhost:2569');
assert(['http:', 'https:'].includes(target.protocol) && target.pathname === '/' && !target.search && !target.username && !target.password, 'Use the dedicated application origin, e.g. https://play.example.com');
const http = target.origin;
const health = await fetch(`${http}/health`, { signal: AbortSignal.timeout(15000) });
assert.equal(health.status, 200, 'Health request failed');
const info = await health.json();
assert.equal(info.protocol, 4, 'Client/server protocol mismatch');
assert.equal(info.physics, 'basin-0.5');
assert.equal(info.status, 'ready');
const title = await fetch(http, { signal: AbortSignal.timeout(15000) });
assert.equal(title.status, 200);
assert((await title.text()).includes('Bad at Boating'));
assert.equal((await fetch(`${http}/assets/`)).status, 404, 'Directories must not be served');
const endpoint = http.replace(/^http/, 'ws');
const sdk = new Client(endpoint), rooms = [], snapshots = [], seats = [], failures = [];
const options = { mode: 'friends', protocol: info.protocol, physics: info.physics };
async function until(check) {
  const start = Date.now();
  while (!check()) {
    assert(Date.now() - start < 15000, 'Timed out: inspect WebSocket upgrade / one-process routing in hosting configuration');
    await delay(50);
  }
}
try {
  for (let i = 0; i < 4; i++) {
    const room = i === 0 ? await sdk.create('boat', options) : await sdk.joinById(rooms[0].roomId, options);
    rooms.push(room);
    room.onMessage('snapshot', data => { snapshots[i] = data; });
    room.onMessage('seat', data => { seats[i] = data.seat; });
    room.onMessage('voyage', () => {});
    room.onError((code, message) => failures.push({ code, message }));
    room.send('sync');
  }
  await until(() => snapshots.filter(Boolean).length === 4 && seats.filter(Number.isInteger).length === 4);
  assert.equal(new Set(seats).size, 4);
  for (const room of rooms) room.send('ready', true);
  await until(() => snapshots.every(data => data.stage === 'playing'));
  const start = snapshots[0].tick;
  await delay(1200);
  assert(snapshots[0].tick > start + 30, 'Physics clock did not advance');
  const token = rooms[3].reconnectionToken;
  rooms[3].reconnection.enabled = false;
  rooms[3].connection.close();
  await until(() => snapshots[0].paused === true);
  const resumed = await sdk.reconnect(token); rooms[3] = resumed;
  resumed.onMessage('snapshot', data => { snapshots[3] = data; });
  resumed.onMessage('seat', data => { seats[3] = data.seat; });
  resumed.onMessage('voyage', () => {}); resumed.send('sync');
  await until(() => snapshots[0].paused === false && seats[3] === 3);
  assert.deepEqual(failures, []);
  console.log(JSON.stringify({ result: 'PASS', origin: http, protocol: info.protocol, physics: info.physics, seats, checks: ['health', 'title', 'directory guard', 'four WebSocket seats', 'four-ready launch', '60Hz clock advances', 'drop pauses crew', 'reconnect resumes same seat'], scope: 'Automated private crew; destination browser/human/performance tests remain' }, null, 2));
} finally {
  await Promise.allSettled(rooms.map(room => { room.reconnection.enabled = false; return room.leave(); }));
}
