import { Client, CloseCode, type Room } from '@colyseus/sdk';
import {Vector3} from 'three';
import { RiverScene } from './scene';
import { GameAudio } from './audio';
import { DockRehearsal } from './rehearsal';
import {channelCenter,sampleRescueCurrent,FINISH_Z,ROUTE_SECTIONS} from '../shared/world';
import {playerName} from '../shared/names';
import { PHYSICS_VERSION, PROTOCOL_VERSION, SEATS, type Snapshot } from '../shared/protocol';
import { DEFAULT_KEYS, PaddleInput, paddleKey, validBindings, type ControlAction, type KeyBindings } from './input';
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
const nameDialog=element<HTMLDialogElement>('name-dialog');
let profileName:string|undefined;
let nameConfirmed=false;
try{profileName=playerName(localStorage.getItem('bad-at-boating-name'));}catch{/* Optional preference storage. */}
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
let rescueHintShown = false;
let lastSnapshotAt = 0;
let reconnectStarted = 0;
let graphicsLost = false;
let controllerSuspended = false;
let controllerMenuHeld = false;
let bindingAction: ControlAction | undefined;
let keyBindings: KeyBindings = { ...DEFAULT_KEYS };
let lowQuality = false;
let controllerEnabled = true;
let reducedMotionOverride: boolean | undefined;
try {
  const saved = JSON.parse(localStorage.getItem('bad-at-boating-controls') ?? '{}');
  if (validBindings(saved.keys)) keyBindings = saved.keys;
  if (typeof saved.lowQuality === 'boolean') lowQuality = saved.lowQuality;
  if (typeof saved.controller === 'boolean') controllerEnabled = saved.controller;
  if (typeof saved.reducedMotion === 'boolean') reducedMotionOverride = saved.reducedMotion;
} catch { /* Preferences are optional. */ }
scene.setLowQuality(lowQuality);
if (reducedMotionOverride !== undefined) scene.reducedMotion = reducedMotionOverride;
function saveControls() {
  try { localStorage.setItem('bad-at-boating-controls', JSON.stringify({keys:keyBindings, lowQuality, controller:controllerEnabled, reducedMotion:reducedMotionOverride})); } catch { /* Preferences are optional. */ }
}
type SavedVoyage = {id:string;token:string;checkpoint:number;finished:boolean;savedAt:number;available:boolean;blocked?:boolean};
let currentVoyage: SavedVoyage | undefined;
function storedVoyage(): SavedVoyage | undefined {
  try {
    const saved=JSON.parse(localStorage.getItem('bad-at-boating-voyage')??'null');
    if(saved && typeof saved.id==='string' && /^[A-Za-z0-9_-]{43}$/.test(saved.token) && Number.isInteger(saved.checkpoint) && saved.checkpoint>0) return saved;
  } catch { /* Storage is optional; recovery codes can be copied from the menu. */ }
  return undefined;
}
const input = new PaddleInput();
const rehearsal = new DockRehearsal();
const keys = input.keyboard;
const dialogOpen = () => !!document.querySelector('dialog[open]');
const canRow = () => !!room && connected && !graphicsLost && !document.hidden && !dialogOpen()
  && latest?.stage === 'playing' && latest.condition === 'afloat' && !latest.paused && !latest.complete;
const canRehearse = () => !!room && connected && seat >= 0 && !graphicsLost && !document.hidden && !dialogOpen()
  && latest?.stage === 'lobby' && !latest.countdownSeconds && !latest.paused && latest.condition === 'afloat';
const canPaddle = () => canRow() || canRehearse();
function sendRow() {
  if (!room || !connected || !room.connection.isOpen || seat < 0 || latest?.stage !== 'playing' || latest.condition !== 'afloat' || latest.paused || latest.complete) return;
  room.send('row', { seq: ++seq, ...input.action() });
}
function release() { input.clear(); rehearsal.clear(); scene.dockPreview = undefined; sendRow(); }
gameSurface.addEventListener('webglcontextlost', event => {
  event.preventDefault(); graphicsLost = true; release();
  element('graphics-recovery').hidden = false;
});
gameSurface.addEventListener('webglcontextrestored', () => {
  graphicsLost = false; release(); element('graphics-recovery').hidden = true;
  toast('Graphics restored. Your crew is still connected.');
});
element('reload-graphics').addEventListener('click', () => location.reload());
function connectionNotice() {
  if (!room) return;
  element('crew-waiting').hidden = connected && !latest?.paused;
  if (connected && !latest?.paused) return;
  const seconds = connected ? latest?.reconnectSeconds ?? 90 : Math.max(0, 90 - Math.floor((Date.now() - reconnectStarted) / 1000));
  element('connection-message').textContent = connected
    ? `A crewmate lost connection. Boat paused safely. Waiting for their seat to reconnect · ${seconds}s`
    : `Your connection dropped. Reconnecting to your seat… · ${seconds}s`;
}
function closeMenu() { menu.close(); focusGame(); }
function openMenu() { release(); if (room && !menu.open) menu.showModal(); }
function showTitle(message = '') {
  scene.presentation = 'title'; title.hidden = false;
  for (const id of ['crew', 'lobby', 'failure', 'finish-screen', 'crew-waiting', 'menu-button', 'loading', 'touch-controls', 'reset-vote-banner', 'capsize-rescue', 'lobby-countdown', 'hud-strokes', 'hud-progress']) element(id).hidden = true;
  element('menu-message').textContent = message;
  element('resume-crew').hidden = !sessionStorage.getItem('bad-at-boating-reconnect');
  const stored = storedVoyage();
  element('continue-voyage').hidden = !stored || !!stored.finished;
}
function clearRoom() {
  nameDialog.close();
  nameConfirmed=false;
  audio.clear();
  connected = false; release(); seat = -1; latest = undefined; lastCrew = ''; lastCheckpoint = 0; rescueHintShown = false; currentVoyage=undefined;
  scene.snapshot = undefined; scene.targetPosition.set(0, 0, 0); scene.targetRotation.identity();
  for (const person of scene.people) person.visible = false;
  for (const key of ['seat', 'stage', 'mode', 'condition', 'tick', 'strokes', 'position', 'rotation', 'resetId', 'blades', 'ack', 'paused','capsize','rightedId']) delete document.body.dataset[key];
  // Hide HUD elements that belong to the game session.
  element('touch-controls').hidden = true;
  element('reset-vote-banner').hidden = true;
  element('hud-strokes').hidden = true;
  element('hud-progress').hidden = true;
}
async function leaveRoom() {
  const previous = room; room = undefined;
  sessionStorage.removeItem('bad-at-boating-reconnect');
  clearRoom(); closeMenu();
  const url = new URL(location.href); url.searchParams.delete('crew'); history.replaceState(null, '', url);
  if (previous) {
    previous.reconnection.enabled = false;
    if (previous.connection.isOpen) void previous.leave().catch(() => {});
  }
  showTitle();
}
function renderCrew(snapshot: Snapshot) {
  const signature = JSON.stringify([seat, snapshot.crew]);
  if (signature === lastCrew) return;
  lastCrew = signature;
  const labels=SEATS.map((station, i) => {
    const member = snapshot.crew.find(m => m.seat === i);
    const label=document.createElement('li');label.className=`crew-seat ${member?.connected?'connected':''} ${i===seat?'mine':''}`;label.style.setProperty('--seat-color',station.color);label.dataset.seat=String(i);
    const tick=document.createElement('span');tick.className='ready-tick';tick.textContent='✓';tick.hidden=!member?.ready;tick.setAttribute('aria-label','Ready');
    const name=document.createElement('span');name.className='player-label';name.textContent=member?(i===seat?'You':member.name??`Paddler ${i+1}`):'Invite friend';
    label.title=member?.name??'Empty seat';label.append(tick,name);return label;
  });
  element('crew').replaceChildren(...labels);
  positionCrewLabels();
  const count = snapshot.crew.filter(m => m.connected).length;
  element('crew-count').textContent = `${count} / 4 aboard`;
}
const crewPoint=new Vector3();
function positionCrewLabels(){
  element('crew').hidden=latest?.stage!=='lobby'||!connected||graphicsLost||document.hidden;
  if(element('crew').hidden)return;
  for(const label of element('crew').children){
    if(!(label instanceof HTMLElement))continue;
    const station=Number(label.dataset.seat),person=scene.people[station];
    if(!person)continue;
    person.head.getWorldPosition(crewPoint);crewPoint.y+=.38;crewPoint.project(scene.camera);
    label.style.left=`${(crewPoint.x+1)*innerWidth/2-SEATS[station]!.side*28}px`;
    label.style.top=`${(1-crewPoint.y)*innerHeight/2-(SEATS[station]!.z>0?24:0)}px`;
  }
}
// CSS name widths change immediately on resize; do not wait for a throttled
// animation frame to move their anchors into the new camera/viewport.
window.addEventListener('resize',()=>{
  scene.scene.updateMatrixWorld(true);scene.camera.updateMatrixWorld(true);positionCrewLabels();
});
function askName(){
  release();element<HTMLInputElement>('player-name').value=profileName??'';
  if(!nameDialog.open)nameDialog.showModal();
}
function onSnapshot(snapshot: Snapshot) {
  lastSnapshotAt = Date.now();
  const enteringPlay = latest?.stage !== 'playing' && snapshot.stage === 'playing';
  if (latest?.stage !== snapshot.stage || !!latest?.countdownSeconds !== !!snapshot.countdownSeconds) release();
  if (latest && latest.resetId !== snapshot.resetId) { release(); rescueHintShown=false; }
  if(!!latest?.capsize!==!!snapshot.capsize)release();
  if(latest&&(latest.rightedId??0)!==(snapshot.rightedId??0)){release();toast('Boat righted. Release your controls, then row on.');}
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
  const sunk = snapshot.stage === 'playing' && snapshot.condition === 'sunk';
  element('failure').hidden = !sunk;
  if (sunk && snapshot.obstacleId) {
    const label = snapshot.obstacleId.replace(/-(\d+)$/, ' $1').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    element('obstacle-name').textContent = ` Hit: ${label}.`;
  } else { element('obstacle-name').textContent = ''; }
  element('finish-screen').hidden = !snapshot.complete || snapshot.condition !== 'afloat';
  connectionNotice();
  renderCrew(snapshot);
  if(!nameConfirmed&&!nameDialog.open&&!dialogOpen())askName();
  const me = snapshot.crew.find(m => m.seat === seat);
  element('ready').textContent = me?.ready ? 'Not Ready' : 'Ready';
  element('ready').classList.toggle('is-ready',!!me?.ready);
  element<HTMLButtonElement>('ready').disabled = !connected||!nameConfirmed;
  element('ready').title = 'Launches when all 4 players are ready. Click again to cancel.';
  if (snapshot.checkpoint > lastCheckpoint) toast('Checkpoint reached.');
  lastCheckpoint = snapshot.checkpoint;
  // Encounter guidance takes priority if a checkpoint and pocket entry arrive
  // in the same snapshot, including after a reconnect/discontinuity.
  if(!rescueHintShown&&snapshot.stage==='playing'&&!snapshot.paused&&snapshot.condition==='afloat'
    &&sampleRescueCurrent(snapshot.position.x-channelCenter(snapshot.position.z),snapshot.position.z).weight>.04){
    rescueHintShown=true;toast('Recovery eddy. Turn toward the open channel, then row forward.');
  }
  const stopped = snapshot.stage !== 'playing' || snapshot.condition !== 'afloat' || snapshot.paused || snapshot.complete;
  element('capsize-rescue').hidden=!snapshot.capsize||stopped||dialogOpen();
  if(snapshot.capsize){
    element('capsize-hint').textContent=`Hold ${keyBindings.reverse.replace('Key','').replace('Digit','')} / ↓, or the button below. Release other controls.`;
    element('capsize-effort').textContent=`${snapshot.capsize.helpers}/${snapshot.capsize.needed} crew helping · ${snapshot.capsize.seconds}s until checkpoint rescue`;
  }
  if (!canPaddle()) release();
  element('dock-hint').textContent = snapshot.countdownSeconds
    ? 'Paddles up. Release your controls; press again after launch.'
    : `Your paddle: ${SEATS[seat]?.name ?? 'crew seat'}. Try the controls while you wait.`;
  // G2: Lobby countdown display.
  const cdEl = element('lobby-countdown');
  const countdown = snapshot.countdownSeconds;
  cdEl.hidden = !countdown || countdown <= 0;
  if (countdown && countdown > 0) cdEl.textContent = `Launching in ${countdown}…`;
  // G1: Reset vote banner — visible while an afloat mid-run vote is in progress.
  const voteBanner = element('reset-vote-banner');
  if (snapshot.resetVotes && snapshot.resetVotesNeeded && !stopped) {
    voteBanner.hidden = false;
    element('reset-vote-text').textContent = `Return to checkpoint: ${snapshot.resetVotes}/${snapshot.resetVotesNeeded} agree · ${snapshot.resetVoteSeconds ?? 0}s`;
    const voted = snapshot.resetVoters?.includes(seat) ?? false;
    element<HTMLButtonElement>('agree-reset').disabled = voted;
    element('agree-reset').textContent = voted ? 'Agreed' : 'Agree';
    element('withdraw-reset').hidden = !voted;
  } else {
    voteBanner.hidden = true;
  }
  // F3: Finish time display.
  const ftEl = element('finish-time');
  if (snapshot.finishTimeMs) {
    const mins = Math.floor(snapshot.finishTimeMs / 60000);
    const secs = Math.floor((snapshot.finishTimeMs % 60000) / 1000);
    ftEl.textContent = `Crew session time ${mins}:${String(secs).padStart(2, '0')}`;
  } else {
    ftEl.textContent = '';
  }
  element('stroke-summary').textContent = `Your strokes: ${snapshot.strokes[seat] ?? 0}`;
  const hudStrokes = element('hud-strokes');
  const showHud = connected && snapshot.stage === 'playing' && !stopped && seat >= 0;
  hudStrokes.hidden = !showHud;
  if (showHud) hudStrokes.textContent = `Strokes: ${snapshot.strokes[seat] ?? 0}`;
  element('touch-controls').hidden = !!snapshot.capsize || !connected || (stopped && !canRehearse());

  // River progress HUD — shown during active play.
  const hudProgress = element('hud-progress');
  const hudBar = element('hud-progress-bar');
  const hudLabel = element('hud-progress-label');
  const showProgress = connected && snapshot.stage === 'playing' && !stopped;
  hudProgress.hidden = !showProgress;
  if (showProgress) {
    const pct = Math.max(0, Math.min(100, (snapshot.position.z / FINISH_Z) * 100));
    hudBar.style.setProperty('--progress', `${pct.toFixed(1)}%`);
    const section = ROUTE_SECTIONS.find(s => snapshot.position.z >= s.start && snapshot.position.z < s.end);
    hudLabel.textContent = section?.name ?? '';
  }

  const data = document.body.dataset;
  data.tick = String(snapshot.tick); data.seat = String(seat); data.checkpoint = String(snapshot.checkpoint);
  data.stage = snapshot.stage; data.mode = snapshot.mode; data.condition = snapshot.condition;
  data.paused = String(snapshot.paused);
  data.crashId = String(snapshot.crashId); data.wreckAge = String(snapshot.wreckAge);
  data.strokes = String(snapshot.strokes[seat] ?? 0); data.position = JSON.stringify(snapshot.position);
  data.blades = JSON.stringify(snapshot.blades); data.ack = JSON.stringify(snapshot.ack);
  data.rotation = JSON.stringify(snapshot.rotation);
  data.resetId = String(snapshot.resetId);
  data.recoveryId = String(snapshot.recoveryId ?? 0); data.recoveryReason = snapshot.recoveryReason ?? 'none';
  data.capsize=JSON.stringify(snapshot.capsize??null);data.rightedId=String(snapshot.rightedId??0);
  if(enteringPlay)focusGame();
}

async function connect(mode: 'friends' | 'practice' = 'friends', roomId?: string, resume = false, saveToken?: string) {
  if (connecting || room) return;
  connecting = true; closeMenu(); title.hidden = true; element('loading').hidden = false;
  element('loading').textContent = resume ? 'Rejoining your crew…' : 'Finding your boat…';
  try {
    const options = { protocol: PROTOCOL_VERSION, physics: PHYSICS_VERSION, mode, ...(profileName?{name:profileName}:{}), ...(saveToken?{saveToken}:{}) };
    const token = sessionStorage.getItem('bad-at-boating-reconnect');
    const joined = resume && token ? await client.reconnect(token) : roomId ? await client.joinById(roomId, options) : await client.create('boat', options);
    nameConfirmed=!!profileName&&resume&&sessionStorage.getItem('bad-at-boating-name-confirmed')===joined.roomId;
    room = joined; connected = true; seq = 0; lastCheckpoint = 0;
    lastSnapshotAt = Date.now();
    // Recover even if a connection drops immediately after joining. Defaults
    // otherwise decline reconnection during the first five seconds.
    Object.assign(joined.reconnection, { minUptime: 0, minDelay: 200, maxDelay: 2000, maxRetries: 40, maxEnqueuedMessages: 0 });
    sessionStorage.setItem('bad-at-boating-reconnect', joined.reconnectionToken);
    const url = new URL(location.href); url.searchParams.set('crew', joined.roomId); history.replaceState(null, '', url);
    joined.onMessage<{ seat: number }>('seat', message => {
      if (room !== joined) return;
      seat = message.seat; element('seat-name').textContent = `Your paddle: ${SEATS[seat]?.name ?? 'Crew seat'}`;
      focusGame();
    });
    joined.onMessage<Snapshot>('snapshot', snapshot => { if (room === joined) onSnapshot(snapshot); });
    joined.onMessage<SavedVoyage>('voyage', message => {
      if (room !== joined) return;
      if (!message.available && currentVoyage?.available !== false) toast(message.blocked?'This voyage is active in another crew. Return to the main menu.':'Checkpoint saving is unavailable. Keep this crew open and try again.');
      if (message.available && (message.checkpoint>0 || storedVoyage()?.id===message.id)) {
        try { localStorage.setItem('bad-at-boating-voyage',JSON.stringify(message)); } catch { /* Recovery code remains available in the menu. */ }
        // The snapshot already announces checkpoint progress. A later save
        // acknowledgement must not overwrite an encounter/recovery instruction.
      }
      currentVoyage=message;
      element<HTMLButtonElement>('copy-recovery').disabled=!message.available;
      document.body.dataset.savedCheckpoint=String(message.checkpoint);
      document.body.dataset.saveAvailable=String(message.available);
    });
    joined.onDrop(() => {
      if (room !== joined) return;
      audio.clear(); connected = false; reconnectStarted = Date.now(); release(); connectionNotice();
    });
    // The SDK replaces its token and sends JOIN acknowledgement after this
    // callback. Resume on the next microtask so sync/input and saved tokens
    // cannot race the handshake.
    joined.onReconnect(() => queueMicrotask(() => {
      if (room !== joined) { joined.reconnection.enabled = false; void joined.leave().catch(() => {}); return; }
      lastSnapshotAt = Date.now();
      connected = true; release();
      if(profileName)joined.send('name',profileName);
      joined.send('sync');
      sessionStorage.setItem('bad-at-boating-reconnect', joined.reconnectionToken);
      focusGame();
    }));
    joined.onLeave((code) => {
      document.body.dataset.disconnectCode=String(code);
      if (room !== joined) return;
      room = undefined; sessionStorage.removeItem('bad-at-boating-reconnect');
      clearRoom(); closeMenu(); showTitle('Your crew connection ended. Start or join a boat.');
    });
    joined.onError((_code, message) => { if (room === joined) toast(message ?? 'The crew connection ran into trouble.'); });
    if(profileName)joined.send('name',profileName);
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
element('name-form').addEventListener('submit',event=>{
  event.preventDefault();const field=element<HTMLInputElement>('player-name'),name=playerName(field.value);
  if(!name){field.setCustomValidity('Use 1–20 letters, numbers, spaces, dots, apostrophes or dashes.');field.reportValidity();return;}
  profileName=name;try{localStorage.setItem('bad-at-boating-name',name);}catch{/* Optional preference storage. */}
  nameConfirmed=true;
  if(room)try{sessionStorage.setItem('bad-at-boating-name-confirmed',room.roomId);}catch{/* Confirmation remains valid for this page. */}
  room?.send('name',name);nameDialog.close();focusGame();
});
element('player-name').addEventListener('input',()=>element<HTMLInputElement>('player-name').setCustomValidity(''));
nameDialog.addEventListener('cancel',event=>{if(!nameConfirmed)event.preventDefault();});
element('name-leave').addEventListener('click',()=>void leaveRoom());
element('edit-name').addEventListener('click',()=>{closeMenu();askName();});
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
for (const id of ['leave', 'failure-leave', 'finish-leave', 'connection-leave']) element(id).addEventListener('click', () => void leaveRoom());
for (const id of ['reset', 'retry-checkpoint']) element(id).addEventListener('click', () => { release(); room?.send('reset'); closeMenu(); focusGame(); });
element('agree-reset').addEventListener('click', () => { release(); room?.send('reset', true); focusGame(); });
element('withdraw-reset').addEventListener('click', () => { room?.send('reset', false); focusGame(); });
element('replay').addEventListener('click', () => { release(); room?.send('restart'); focusGame(); });
element('menu-button').addEventListener('click', openMenu);
element('resume').addEventListener('click', closeMenu);
for (const id of ['show-controls']) element(id).addEventListener('click', () => { closeMenu(); controls.showModal(); });
for (const dialog of [menu, controls, joinDialog]) dialog.addEventListener('close', focusGame);
function renderBindings() {
  for (const button of controls.querySelectorAll<HTMLButtonElement>('button[data-bind]')) {
    const action = button.dataset.bind as ControlAction;
    button.textContent = bindingAction === action ? 'Press key…' : keyBindings[action].replace(/^(Key|Digit)/, '');
    button.setAttribute('aria-pressed', String(bindingAction === action));
  }
  const bindingNote = `Hold ${keyBindings.forward.replace(/^(Key|Digit)/,'')}/↑ forward · ${keyBindings.reverse.replace(/^(Key|Digit)/,'')}/↓ reverse · ${keyBindings.left.replace(/^(Key|Digit)/,'')}/← ${keyBindings.right.replace(/^(Key|Digit)/,'')}/→ turn. Each player controls their own paddle.`;
  element('paddle-controls-note').textContent = bindingNote;
  element('settings-controls-note').textContent = bindingNote;
}
for (const button of controls.querySelectorAll<HTMLButtonElement>('button[data-bind]')) button.addEventListener('click', () => {
  release(); bindingAction = button.dataset.bind as ControlAction;
  element('binding-message').textContent = 'Press a letter or number. Escape cancels.'; renderBindings();
});
controls.addEventListener('close', () => { bindingAction = undefined; renderBindings(); });
element('restore-keys').addEventListener('click', () => {
  release(); bindingAction = undefined; keyBindings = { ...DEFAULT_KEYS }; saveControls(); renderBindings();
  element('binding-message').textContent = 'WASD restored. Arrow keys also work.';
});
renderBindings();
element<HTMLInputElement>('controller-enabled').checked = controllerEnabled;
element('controller-enabled').addEventListener('change', event => {
  release(); controllerEnabled = (event.target as HTMLInputElement).checked; saveControls();
});
element<HTMLInputElement>('reduced-motion').checked = scene.reducedMotion;
element('reduced-motion').addEventListener('change', event => {
  reducedMotionOverride = (event.target as HTMLInputElement).checked;
  scene.reducedMotion = reducedMotionOverride; saveControls();
});
// Sync reduced-motion when the OS preference changes without a reload (U6).
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
  if (reducedMotionOverride !== undefined) return;
  scene.reducedMotion = event.matches;
  element<HTMLInputElement>('reduced-motion').checked = event.matches;
});
element<HTMLInputElement>('low-quality').checked = lowQuality;
element('low-quality').addEventListener('change', event => {
  lowQuality = (event.target as HTMLInputElement).checked; scene.setLowQuality(lowQuality); saveControls();
});
element<HTMLInputElement>('sound-enabled').checked = audio.enabled;
element<HTMLInputElement>('sound-volume').value = String(audio.volume);
element('sound-enabled').addEventListener('change', event => { audio.setEnabled((event.target as HTMLInputElement).checked); saveSound(); unlockSound(); });
element('sound-volume').addEventListener('input', event => { audio.setVolume(Number((event.target as HTMLInputElement).value)); saveSound(); });
element('fullscreen').addEventListener('click', () => {
  const action = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  void action.catch(() => toast('Fullscreen is unavailable in this browser panel.'));
});

window.addEventListener('keydown', event => {
  if (bindingAction && controls.open) {
    event.preventDefault();
    if (event.code === 'Escape') { bindingAction = undefined; element('binding-message').textContent = 'Key change cancelled.'; renderBindings(); return; }
    if (event.ctrlKey || event.metaKey || event.altKey || !/^(Key[A-Z]|Digit[0-9])$/.test(event.code)) return;
    const proposed = { ...keyBindings, [bindingAction]: event.code };
    if (!validBindings(proposed)) { element('binding-message').textContent = 'That key is already assigned. Choose a different key.'; return; }
    keyBindings = proposed; bindingAction = undefined; saveControls(); renderBindings();
    element('binding-message').textContent = 'Key saved. Arrow keys also work.'; return;
  }
  if (event.code === 'Escape') {
    release();
    if (!dialogOpen() && room) { event.preventDefault(); openMenu(); }
    return;
  }
  if (!canPaddle() || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && (event.target.closest('input, textarea, select') || event.target.isContentEditable)) return;
  controllerSuspended = false;
  const key=paddleKey(event,keyBindings);
  if (key) { event.preventDefault(); if (!keys.has(key) && !event.repeat) { keys.add(key); sendRow(); } }
}, {capture:true});
window.addEventListener('keyup', event => { const key=paddleKey(event,keyBindings);if(key && keys.delete(key))sendRow(); }, {capture:true});
window.addEventListener('blur', () => { controllerSuspended = true; release(); });
window.addEventListener('focus', () => { controllerSuspended = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('#touch-controls button[data-key],#capsize-rescue button[data-key]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (!canPaddle()) return;
    button.setPointerCapture(event.pointerId);
    input.touches.set(event.pointerId, button.dataset.key!);
    unlockSound(); focusGame(); sendRow();
  });
  const lift = (event: PointerEvent) => { if (input.touches.delete(event.pointerId)) sendRow(); };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(type, lift);
}
// Mouse movement and mouse buttons are deliberately not bound to paddles.
setInterval(() => {
  connectionNotice();
  if (!room || !connected) return;
  if (!document.hidden && Date.now() - lastSnapshotAt > 5000 && room.connection.isOpen) {
    release(); room.connection.close(CloseCode.MAY_TRY_RECONNECT, 'Snapshot timeout'); return;
  }
  if (seat < 0 || latest?.stage !== 'playing' || latest.condition !== 'afloat') return;
  if (!canRow()) release();
  else sendRow();
}, 100);
let previousTime = performance.now();
function frame(now: number) {
  const dt = Math.min((now - previousTime) / 1000, 0.05); previousTime = now;
  let pad: Gamepad | undefined;
  try { pad = navigator.getGamepads?.().find(pad => pad?.connected && pad.mapping === 'standard') ?? undefined; } catch { /* Controller access can be disabled by an embed policy. */ }
  const menuPressed = !!pad?.buttons[9]?.pressed;
  if (menuPressed && !controllerMenuHeld && controllerEnabled && !controllerSuspended && !document.hidden && room && !graphicsLost) {
    unlockSound(); if (menu.open) closeMenu(); else if (!dialogOpen()) openMenu();
  }
  controllerMenuHeld = menuPressed;
  if (input.updateController(pad, canPaddle() && controllerEnabled && !controllerSuspended)) { unlockSound(); sendRow(); }
  if (canRehearse()) {
    const point = rehearsal.sample(input.action(), seat, now / 1000, dt);
    scene.dockPreview = point ? {seat, point} : undefined;
  } else { rehearsal.clear(); scene.dockPreview = undefined; }
  audio.setAudible(connected && !graphicsLost && !document.hidden && !dialogOpen() && title.hidden);
  document.body.dataset.audioState = audio.state; document.body.dataset.audioEnabled = String(audio.enabled); document.body.dataset.audioCues = String(audio.cueCount);
  if (!graphicsLost) scene.render(dt, now / 1000);
  positionCrewLabels();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
showTitle();
const crew = new URL(location.href).searchParams.get('crew');
const token = sessionStorage.getItem('bad-at-boating-reconnect');
if (crew) void connect('friends', crew, !!token && token.startsWith(`${crew}:`));
