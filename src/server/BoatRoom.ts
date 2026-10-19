import { Room, type Client } from '@colyseus/core';
import { BoatSimulation } from '../shared/simulation';
import { DT, PHYSICS_VERSION, PROTOCOL_VERSION, validateIntent, validateRowIntent, type Snapshot, type RowIntent } from '../shared/protocol';
import { PaddleStroke } from '../shared/rowing';
import { voyageStore, VoyageConflict, type Voyage, type VoyageStore } from './voyages';

type Member = { seat: number; connected: boolean; ready: boolean; lastReset: number; stroke: PaddleStroke; row?: RowIntent; lastRowAt: number; disconnectedAt?: number };

export class BoatRoom extends Room {
  maxClients = 4;
  maxMessagesPerSecond = 90;
  reconnectGrace = 90;
  sim!: BoatSimulation;
  members = new Map<string, Member>();
  mode: Snapshot['mode'] = 'practice';
  stage: Snapshot['stage'] = 'playing';
  debt = 0;
  sinceSnapshot = 0;
  droppedSteps = 0;
  private saves?: VoyageStore;
  private voyage?: Voyage;
  private saveToken = '';
  private lastSaveAttempt = 0;
  private lastHeartbeat = 0;
  private saveUnavailable = false;
  private saveConflict = false;
  private lastSharedReset = 0;

  onCreate(options: Record<string, unknown>) {
    if(options.protocol!==PROTOCOL_VERSION || options.physics!==PHYSICS_VERSION)throw new Error('Game version changed. Reload this page to join.');
    this.setPrivate(true);
    this.sim = new BoatSimulation();
    this.mode = options.mode === 'practice' ? 'practice' : 'expedition';
    this.stage = this.mode === 'practice' ? 'playing' : 'lobby';
    if (this.mode === 'expedition') {
      this.saves = voyageStore();
      if (options.saveToken !== undefined && typeof options.saveToken !== 'string') throw new Error('Invalid voyage recovery code.');
      const claimed = this.saves.claim(this.roomId, options.saveToken as string | undefined);
      this.voyage = claimed.voyage; this.saveToken = claimed.token;
      this.sim.checkpoint = claimed.voyage.checkpoint; this.sim.revision = claimed.voyage.revision; this.sim.reset();
    }
    this.onMessage('input', (client, message: unknown) => {
      const member = this.members.get(client.sessionId);
      if (!member?.connected || this.paused || this.stage !== 'playing' || this.sim.complete) return;
      const paddle = this.sim.paddles[member.seat]!;
      if (validateIntent(message, Math.max(paddle.intent.seq, member.row?.seq ?? 0))) { member.row = undefined; this.sim.accept(member.seat, message); }
    });
    this.onMessage('row', (client, message: unknown) => {
      const member = this.members.get(client.sessionId);
      if (!member?.connected || this.paused || this.stage !== 'playing' || this.sim.complete || this.sim.condition !== 'afloat') return;
      if (validateRowIntent(message, Math.max(this.sim.paddles[member.seat]!.intent.seq, member.row?.seq ?? 0))) {
        member.row = message; member.lastRowAt = Date.now();
      }
    });
    this.onMessage('ready', (client, value: unknown) => {
      const member = this.members.get(client.sessionId);
      if (!member || typeof value !== 'boolean' || this.stage !== 'lobby' || this.saveConflict) return;
      member.ready = value;
      if (this.members.size === 4 && [...this.members.values()].every(m => m.connected && m.ready)) {
        this.mode = 'expedition';
        this.stage = 'playing';
        this.sim.reset();
        this.clearRowing();
      }
      this.sendSnapshot();
    });
    this.onMessage('reset', client => {
      const member = this.members.get(client.sessionId);
      if (!member || this.stage !== 'playing' || this.sim.condition === 'breaking' || Date.now() - this.lastSharedReset < 2000) return;
      member.lastReset = this.lastSharedReset = Date.now();
      this.sim.reset();
      this.clearRowing();
      this.sendSnapshot();
    });
    this.onMessage('sync', client => {
      this.sendSeat(client);
      this.sendVoyage(client);
      client.send('snapshot', this.snapshot());
    });
    this.onMessage('restart', client => {
      const member = this.members.get(client.sessionId);
      if (!member || !this.sim.complete || this.sim.condition !== 'afloat' || Date.now() - this.lastSharedReset < 2000) return;
      member.lastReset = this.lastSharedReset = Date.now(); this.sim.reset(true); this.clearRowing(); this.persistVoyage(); this.sendSnapshot();
    });
    this.onMessage('*', () => { /* Ignore unrecognized commands, including hull state forgery. */ });
    this.setSimulationInterval(elapsed => {
      this.sinceSnapshot += elapsed;
      if (!this.paused && this.stage === 'playing' && !this.sim.complete) {
        this.debt += Math.min(elapsed / 1000, 0.25);
        let steps = 0;
        while (this.debt >= DT && steps < 5) {
          for (const member of this.members.values()) {
            if (!member.connected || !member.row) continue;
            const action = Date.now() - member.lastRowAt < 1000 ? member.row : { forward: 0, turn: 0 };
            const target = member.stroke.sampleAction(action, member.seat, this.sim.tick * DT);
            this.sim.accept(member.seat, { seq: member.row.seq, ...target }, action);
          }
          const resetId = this.sim.resetId;
          this.sim.step();
          if (this.sim.resetId !== resetId) this.clearRowing();
          this.debt -= DT; steps++;
        }
        if (this.debt >= DT) { this.droppedSteps += Math.floor(this.debt / DT); this.debt %= DT; }
      } else this.debt = 0;
      this.persistVoyage();
      if (this.sinceSnapshot >= 50) { this.sinceSnapshot %= 50; this.sendSnapshot(); }
    }, DT * 1000);
  }

  onAuth(_client: Client, options: Record<string, unknown>) {
    if (options.protocol !== PROTOCOL_VERSION || options.physics !== PHYSICS_VERSION) {
      throw new Error('Game version changed. Reload this page to join.');
    }
    return true;
  }

  get paused() {
    return this.mode === 'expedition' && this.stage === 'playing' && (this.members.size < 4 || [...this.members.values()].some(m => !m.connected));
  }

  onJoin(client: Client) {
    const occupied = new Set([...this.members.values()].map(m => m.seat));
    const seat = [0, 1, 2, 3].find(i => !occupied.has(i));
    if (seat === undefined) throw new Error('This boat already has four paddlers.');
    this.members.set(client.sessionId, { seat, connected: true, ready: false, lastReset: 0, stroke: new PaddleStroke(), lastRowAt: 0 });
    this.sim.setActive(seat, true);
    this.sendSeat(client);
    this.sendVoyage(client);
    this.sendSnapshot();
  }

  onDrop(client: Client) {
    const member = this.members.get(client.sessionId);
    if (member) { member.connected = false; member.disconnectedAt = Date.now(); this.sim.setActive(member.seat, false); }
    this.sim.releaseInputs();
    this.clearRowing();
    this.sendSnapshot();
    void this.allowReconnection(client, this.reconnectGrace).catch(()=>{ /* Grace expiry/shutdown is handled by the room lifecycle. */ });
  }

  onReconnect(client: Client) {
    const member = this.members.get(client.sessionId);
    if (member) { member.connected = true; member.disconnectedAt = undefined; this.sim.setActive(member.seat, true); }
    this.sendSeat(client);
    this.sendSnapshot();
  }

  onLeave(client: Client) {
    const member = this.members.get(client.sessionId);
    if (member) this.sim.setActive(member.seat, false);
    this.members.delete(client.sessionId);
    // A deliberately departed friend returns the crew to the dock for re-ready.
    if (this.mode === 'expedition') {
      this.stage = 'lobby';
      this.sim.reset();
      this.clearRowing();
      for (const m of this.members.values()) m.ready = false;
    }
    this.sendSnapshot();
  }

  sendSeat(client: Client) {
    client.send('seat', { seat: this.members.get(client.sessionId)?.seat, roomId: this.roomId });
  }

  private clearRowing() {
    for (const member of this.members.values()) { member.row = undefined; member.stroke = new PaddleStroke(); }
  }

  private sendVoyage(client?: Client) {
    if (!this.voyage) return;
    const message = { ...this.voyage, token: this.saveToken, available: !this.saveUnavailable, blocked:this.saveConflict };
    if (client) client.send('voyage', message); else this.broadcast('voyage', message);
  }

  private persistVoyage() {
    if (!this.saves || !this.voyage) return;
    const now = Date.now();
    if (this.saveUnavailable && now - this.lastSaveAttempt < 2000) return;
    try {
      if (this.voyage.checkpoint !== this.sim.checkpoint || this.voyage.finished !== this.sim.complete) {
        this.lastSaveAttempt = now;
        this.voyage = this.saves.save(this.voyage.id, this.roomId, this.voyage.revision, this.sim.checkpoint, this.sim.complete);
        this.saveUnavailable = false; this.sendVoyage();
      }
      if (now - this.lastHeartbeat > 10000) {
        this.lastHeartbeat = now; this.saves.heartbeat(this.voyage.id, this.roomId);
        if (this.saveUnavailable) { this.saveUnavailable = false; this.sendVoyage(); }
      }
    } catch (error) {
      this.lastSaveAttempt = now;
      if (error instanceof VoyageConflict) { this.saveConflict=true; this.stage = 'lobby'; this.sim.releaseInputs(); for (const m of this.members.values()) m.ready = false; }
      if (!this.saveUnavailable) { this.saveUnavailable = true; this.sendVoyage(); console.warn('Voyage persistence unavailable:', error instanceof Error ? error.message : 'storage error'); }
    }
  }

  snapshot(): Snapshot {
    const remaining = [...this.members.values()].filter(m => !m.connected)
      .map(m => this.reconnectGrace - (Date.now() - (m.disconnectedAt ?? Date.now())) / 1000);
    return {
      protocol: PROTOCOL_VERSION, physics: PHYSICS_VERSION, tick: this.sim.tick,
      position: { ...this.sim.hull.translation() }, rotation: { ...this.sim.hull.rotation() },
      velocity: { ...this.sim.hull.linvel() }, blades: this.sim.blades,
      ack: this.sim.paddles.map(p => p.intent.seq),
      crew: [...this.members.values()].map(({ seat, connected, ready }) => ({ seat, connected, ready })),
      checkpoint: this.sim.checkpoint, revision: this.sim.revision, resetId: this.sim.resetId,
      recoveryId: this.sim.recoveryId, recoveryReason: this.sim.recoveryReason,
      mode: this.mode, paused: this.paused, complete: this.sim.complete,
      reconnectSeconds: Math.max(0, Math.ceil(Math.min(this.reconnectGrace, ...remaining))),
      stage: this.stage, condition: this.sim.condition, wreckAge: this.sim.wreckTicks * DT,
      crashId: this.sim.crashId, obstacleId: this.sim.obstacleId,
      strokes: this.sim.strokes, droppedSteps: this.droppedSteps,
    };
  }

  sendSnapshot() { this.broadcast('snapshot', this.snapshot()); }
  onDispose() {
    if (this.saves && this.voyage) { this.persistVoyage(); try { this.saves.release(this.voyage.id, this.roomId); } catch { /* Never overwrite a different owner's lease. */ } }
    this.sim?.dispose();
  }
}
