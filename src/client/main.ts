import { Client, type Room } from '@colyseus/sdk';
import { RiverScene } from './scene';
import { GameAudio } from './audio';
import { PHYSICS_VERSION, PROTOCOL_VERSION, SEATS, type Snapshot } from '../shared/protocol';
import { PaddleStroke, paddleKey } from './input';
import './style.css';

function element<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el as T;
}
const title = element('title-screen');
const menu = element<HTMLDialogElement>('settings-dialog');
const joinDialog = element<HTMLDialogElement>('join-dialog');
const controls = element<HTMLDialogElement>('controls-dialog');
let toastTimer = 0;
function toast(message: string) {
  element('toast').textContent = message; element('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => element('toast').classList.remove('show'), 2500);
}
let scene: RiverScene;
try { scene = new RiverScene(element('world')); }
catch (error) {
  element('menu-message').textContent = 'Enable graphics acceleration in your desktop browser to play.';
  for (const button of title.querySelectorAll('button')) button.disabled = true;
  throw error;
}
const gameSurface = scene.renderer.domElement;
gameSurface.tabIndex = 0;
gameSurface.setAttribute('role','application');
gameSurface.setAttribute('aria-label','Your paddle. Hold WASD or the arrow keys to row and steer.');
function focusGame() {
  if (room && title.hidden && !dialogOpen()) gameSurface.focus({preventScroll:true});
}
gameSurface.addEventListener('pointerdown',focusGame);
const endpoint = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${import.meta.env.DEV ? '/game' : ''}`;
const client = new Client(endpoint);
const audio = new GameAudio();
try {
  const saved = JSON.parse(localStorage.getItem('bad-at-boating-audio') ?? '{}');
  if (typeof saved.enabled === 'boolean') audio.setEnabled(saved.enabled);
  if (typeof saved.volume === 'number' && Number.isFinite(saved.volume)) audio.setVolume(saved.volume);
} catch { /* Storage unavailable: use sensible defaults. */ }
function saveSound() {
  try { localStorage.setItem('bad-at-boating-audio', JSON.stringify({enabled:audio.enabled,volume:audio.volume})); } catch { /* Preferences are optional. */ }
}
function unlockSound() { void audio.unlock().catch(() => { document.body.dataset.audioState = 'unavailable'; }); }
window.addEventListener('pointerdown', unlockSound, { once: true });
window.addEventListener('keydown', unlockSound, { once: true });
let room: Room | undefined;
let latest: Snapshot | undefined;
let seat = -1;
let seq = 0;
let connecting = false;
let connected = false;
let lastCrew = '';
let lastCheckpoint = 0;
type SavedVoyage = {id:string;token:string;checkpoint:number;finished:boolean;savedAt:number;available:boolean;blocked?:boolean};
let currentVoyage: SavedVoyage | undefined;
function storedVoyage(): SavedVoyage | undefined {
  try {
    const saved=JSON.parse(localStorage.getItem('bad-at-boating-voyage')??'null');
    if(saved && typeof saved.id==='string' && /^[A-Za-z0-9_-]{43}$/.test(saved.token) && Number.isInteger(saved.checkpoint) && saved.checkpoint>0) return saved;
  } catch { /* Storage is optional; recovery codes can be copied from the menu. */ }
  return undefined;
}
const input = { x: 0, z: 0, dip: 0 };
const stroke = new PaddleStroke();
const keys = new Set<string>();
const dialogOpen = () => !!document.querySelector('dialog[open]');
function release() { keys.clear(); Object.assign(input, stroke.reset()); }
function closeMenu() { menu.close(); focusGame(); }
function openMenu() { release(); if (room && !menu.open) menu.showModal(); }
function showTitle(message = '') {
  scene.presentation = 'title'; title.hidden = false;
  for (const id of ['lobby', 'failure', 'finish-screen', 'crew-waiting', 'menu-button', 'loading']) element(id).hidden = true;
  element('menu-message').textContent = message;
  element('resume-crew').hidden = !sessionStorage.getItem('bad-at-boating-reconnect');
  element('continue-voyage').hidden = !storedVoyage() || !!storedVoyage()?.finished;
}
function clearRoom() {
  audio.clear();
  connected = false; release(); seat = -1; latest = undefined; lastCrew = ''; lastCheckpoint = 0; currentVoyage=undefined;
  scene.snapshot = undefined; scene.targetPosition.set(0, 0, 0); scene.targetRotation.identity();
  for (const person of scene.people) person.visible = false;
  for (const key of ['seat', 'stage', 'mode', 'condition', 'tick', 'strokes', 'position', 'rotation', 'resetId', 'blades', 'ack']) delete document.body.dataset[key];
}
async function leaveRoom() {
  const previous = room; room = undefined;
  sessionStorage.removeItem('bad-at-boating-reconnect');
  clearRoom(); closeMenu();
  const url = new URL(location.href); url.searchParams.delete('crew'); history.replaceState(null, '', url);
  if (previous) await previous.leave();
  showTitle();
}
function renderCrew(snapshot: Snapshot) {
  const signature = JSON.stringify([seat, snapshot.crew]);
  if (signature === lastCrew) return;
  lastCrew = signature;
  element('crew').innerHTML = SEATS.map((station, i) => {
    const member = snapshot.crew.find(m => m.seat === i);
    return `<li class="crew-seat ${member?.connected ? 'connected' : ''} ${i === seat ? 'mine' : ''}" style="--seat-color:${station.color}"><span class="seat-dot">${member?.ready ? '✓' : i + 1}</span><span>${member?.connected ? (i === seat ? 'You' : 'Crewmate') : 'Empty'}</span></li>`;
  }).join('');
  const count = snapshot.crew.filter(m => m.connected).length;
  element('crew-count').textContent = `Crew aboard · ${count} / 4`;
}
function onSnapshot(snapshot: Snapshot) {
  const enteringPlay = latest?.stage !== 'playing' && snapshot.stage === 'playing';
  if (latest && latest.resetId !== snapshot.resetId) release();
  if (latest && (latest.recoveryId ?? 0) !== (snapshot.recoveryId ?? 0)) {
    release();
    const message = snapshot.recoveryReason === 'grounded'
      ? 'Boat unstuck. Back at the last checkpoint.'
      : snapshot.recoveryReason === 'capsized'
        ? 'Boat righted. Back at the last checkpoint.'
        : 'Boat recovered. Back at the last checkpoint.';
    toast(message);
  }
  latest = snapshot; scene.setSnapshot(snapshot); audio.update(snapshot);
  if (seat >= 0) seq = Math.max(seq, snapshot.ack[seat] ?? 0);
  title.hidden = true; element('loading').hidden = true; element('menu-button').hidden = false;
  element('lobby').hidden = snapshot.stage !== 'lobby';
  element('failure').hidden = snapshot.stage !== 'playing' || snapshot.condition !== 'sunk';
  element('finish-screen').hidden = !snapshot.complete || snapshot.condition !== 'afloat';
  element('crew-waiting').hidden = !snapshot.paused && connected;
  renderCrew(snapshot);
  const me = snapshot.crew.find(m => m.seat === seat);
  element('ready').textContent = me?.ready ? 'Ready ✓' : 'Ready to Row';
  element<HTMLButtonElement>('ready').disabled = snapshot.crew.filter(m => m.connected).length !== 4;
  if (snapshot.checkpoint > lastCheckpoint) toast('Checkpoint reached.');
  lastCheckpoint = snapshot.checkpoint;
  const stopped = snapshot.stage !== 'playing' || snapshot.condition !== 'afloat' || snapshot.paused || snapshot.complete;
  if (stopped) release();
  const data = document.body.dataset;
  data.tick = String(snapshot.tick); data.seat = String(seat); data.checkpoint = String(snapshot.checkpoint);
  data.stage = snapshot.stage; data.mode = snapshot.mode; data.condition = snapshot.condition;
  data.crashId = String(snapshot.crashId); data.wreckAge = String(snapshot.wreckAge);
  data.strokes = String(snapshot.strokes[seat] ?? 0); data.position = JSON.stringify(snapshot.position);
  data.blades = JSON.stringify(snapshot.blades); data.ack = JSON.stringify(snapshot.ack);
  data.rotation = JSON.stringify(snapshot.rotation);
  data.resetId = String(snapshot.resetId);
  data.recoveryId = String(snapshot.recoveryId ?? 0); data.recoveryReason = snapshot.recoveryReason ?? 'none';
  if(enteringPlay)focusGame();
}

async function connect(mode: 'friends' | 'practice' = 'friends', roomId?: string, resume = false, saveToken?: string) {
  if (connecting || room) return;
  connecting = true; closeMenu(); title.hidden = true; element('loading').hidden = false;
  element('loading').textContent = resume ? 'Rejoining your crew…' : 'Finding your boat…';
  try {
    const options = { protocol: PROTOCOL_VERSION, physics: PHYSICS_VERSION, mode, ...(saveToken?{saveToken}:{}) };
    const token = sessionStorage.getItem('bad-at-boating-reconnect');
    const joined = resume && token ? await client.reconnect(token) : roomId ? await client.joinById(roomId, options) : await client.create('boat', options);
    room = joined; connected = true; seq = 0; lastCheckpoint = 0;
    sessionStorage.setItem('bad-at-boating-reconnect', joined.reconnectionToken);
    const url = new URL(location.href); url.searchParams.set('crew', joined.roomId); history.replaceState(null, '', url);
    joined.onMessage<{ seat: number }>('seat', message => {
      seat = message.seat; element('seat-name').textContent = `Your paddle: ${SEATS[seat]?.name ?? 'Crew seat'}`;
      focusGame();
    });
    joined.onMessage<Snapshot>('snapshot', onSnapshot);
    joined.onMessage<SavedVoyage>('voyage', message => {
      if (!message.available && currentVoyage?.available !== false) toast(message.blocked?'This voyage is active in another crew. Return to the main menu.':'Checkpoint saving is unavailable. Keep this crew open and try again.');
      if (message.available && (message.checkpoint>0 || storedVoyage()?.id===message.id)) {
        try { localStorage.setItem('bad-at-boating-voyage',JSON.stringify(message)); } catch { /* Recovery code remains available in the menu. */ }
        if(currentVoyage && message.checkpoint>currentVoyage.checkpoint)toast('Checkpoint saved.');
      }
      currentVoyage=message;
      element<HTMLButtonElement>('copy-recovery').disabled=!message.available;
      document.body.dataset.savedCheckpoint=String(message.checkpoint);
      document.body.dataset.saveAvailable=String(message.available);
    });
    joined.onDrop(() => { audio.clear(); connected = false; release(); element('crew-waiting').hidden = false; });
    joined.onReconnect(() => {
      connected = true; release(); joined.send('sync');
      sessionStorage.setItem('bad-at-boating-reconnect', joined.reconnectionToken);
    });
    joined.onLeave((code) => {
      document.body.dataset.disconnectCode=String(code);
      if (room !== joined) return;
      room = undefined; sessionStorage.removeItem('bad-at-boating-reconnect');
      clearRoom(); closeMenu(); showTitle('Your crew connection ended. Start or join a boat.');
    });
    joined.onError((_code, message) => toast(message ?? 'The crew connection ran into trouble.'));
    joined.send('sync');
    focusGame();
  } catch (error) {
    sessionStorage.removeItem('bad-at-boating-reconnect');
    const message = error instanceof Error ? error.message : 'Could not reach this crew.';
    showTitle(`Couldn’t join. ${message}`);
  } finally { connecting = false; }
}

element('play-friends').addEventListener('click', () => void connect('friends'));
element('resume-crew').addEventListener('click', () => void connect('friends', undefined, true));
element('continue-voyage').addEventListener('click', () => {
  const saved=storedVoyage();if(saved)void connect('friends',undefined,false,saved.token);
});
element('join-title').addEventListener('click', () => joinDialog.showModal());
element('join-form').addEventListener('submit', event => {
  event.preventDefault();
  const value = element<HTMLInputElement>('room-code').value.trim();
  let code = value;
  if(value.startsWith('voyage:')) {
    const token=value.slice(7);
    if(!/^[A-Za-z0-9_-]{43}$/.test(token)){toast('Paste a valid voyage recovery code.');return;}
    joinDialog.close();void connect('friends',undefined,false,token);return;
  }
  try { code = new URL(value).searchParams.get('crew') ?? ''; } catch { /* Plain room code. */ }
  if (!/^[a-zA-Z0-9_-]{4,30}$/.test(code)) { toast('Paste a crew invite link or room code.'); return; }
  joinDialog.close(); void connect('friends', code);
});
async function copyInvite() {
  if (!room) return;
  const url = new URL(location.href); url.search = ''; url.searchParams.set('crew', room.roomId);
  try { await navigator.clipboard.writeText(url.href); toast('Crew invite copied.'); }
  catch { toast(`Crew code: ${room.roomId}`); }
}
for (const id of ['invite', 'invite-menu']) element(id).addEventListener('click', () => void copyInvite());
element('copy-recovery').addEventListener('click',()=>{
  if(currentVoyage?.available)void navigator.clipboard.writeText(`voyage:${currentVoyage.token}`).then(()=>toast('Voyage recovery code copied.'),()=>toast('Clipboard unavailable. Continue Voyage will use this browser’s saved checkpoint.'));
});
element('ready').addEventListener('click', () => {
  room?.send('ready', !latest?.crew.find(m => m.seat === seat)?.ready);
  focusGame();
});
for (const id of ['leave', 'failure-leave', 'finish-leave']) element(id).addEventListener('click', () => void leaveRoom());
for (const id of ['reset', 'retry-checkpoint']) element(id).addEventListener('click', () => { release(); room?.send('reset'); closeMenu(); focusGame(); });
element('replay').addEventListener('click', () => { release(); room?.send('restart'); focusGame(); });
element('menu-button').addEventListener('click', openMenu);
element('resume').addEventListener('click', closeMenu);
for (const id of ['show-controls']) element(id).addEventListener('click', () => { closeMenu(); controls.showModal(); });
for (const dialog of [menu, controls, joinDialog]) dialog.addEventListener('close', focusGame);
element<HTMLInputElement>('reduced-motion').checked = scene.reducedMotion;
element('reduced-motion').addEventListener('change', event => scene.reducedMotion = (event.target as HTMLInputElement).checked);
element('low-quality').addEventListener('change', event => scene.setLowQuality((event.target as HTMLInputElement).checked));
element<HTMLInputElement>('sound-enabled').checked = audio.enabled;
element<HTMLInputElement>('sound-volume').value = String(audio.volume);
element('sound-enabled').addEventListener('change', event => { audio.setEnabled((event.target as HTMLInputElement).checked); saveSound(); unlockSound(); });
element('sound-volume').addEventListener('input', event => { audio.setVolume(Number((event.target as HTMLInputElement).value)); saveSound(); });
element('fullscreen').addEventListener('click', () => {
  const action = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  void action.catch(() => toast('Fullscreen is unavailable in this browser panel.'));
});

window.addEventListener('keydown', event => {
  if (event.code === 'Escape') {
    release();
    if (!dialogOpen() && room) { event.preventDefault(); openMenu(); }
    return;
  }
  if (!room || latest?.stage !== 'playing' || latest.condition !== 'afloat' || dialogOpen() || latest.paused || latest.complete || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && (event.target.closest('input, textarea, select') || event.target.isContentEditable)) return;
  const key=paddleKey(event);
  if (key) { event.preventDefault(); keys.add(key); }
}, {capture:true});
window.addEventListener('keyup', event => { const key=paddleKey(event);if(key)keys.delete(key); }, {capture:true});
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
// Mouse movement and mouse buttons are deliberately not bound to paddles.
setInterval(() => {
  if (!room || !connected || seat < 0 || latest?.stage !== 'playing' || latest.condition !== 'afloat') return;
  if (document.hidden || dialogOpen() || latest.paused || latest.complete) release();
  Object.assign(input, stroke.sample(keys, seat, performance.now() / 1000));
  room.send('input', { seq: ++seq, ...input });
}, 1000 / 30);
let previousTime = performance.now();
function frame(now: number) {
  const dt = Math.min((now - previousTime) / 1000, 0.05); previousTime = now;
  audio.setAudible(connected && !document.hidden && !dialogOpen() && title.hidden);
  document.body.dataset.audioState = audio.state; document.body.dataset.audioEnabled = String(audio.enabled); document.body.dataset.audioCues = String(audio.cueCount);
  scene.render(dt, now / 1000); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
showTitle();
const crew = new URL(location.href).searchParams.get('crew');
const token = sessionStorage.getItem('bad-at-boating-reconnect');
if (crew) void connect('friends', crew, !!token && token.startsWith(`${crew}:`));
