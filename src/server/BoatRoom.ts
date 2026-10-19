import { Room, type Client, type AuthContext } from '@colyseus/core';
import { BoatSimulation } from '../shared/simulation';
import { DT, PHYSICS_VERSION, PROTOCOL_VERSION, validateIntent, validateRowIntent, type Snapshot, type RowIntent } from '../shared/protocol';
import { PaddleStroke } from '../shared/rowing';
import { voyageStore, VoyageConflict, type Voyage, type VoyageStore } from './voyages';

type Member = { seat: number; connected: boolean; ready: boolean; lastReset: number; stroke: PaddleStroke; row?: RowIntent; lastRowAt: number; disconnectedAt?: number };

// Module-level per-IP connection rate limiter (S2).
// Tracks how many rooms each IP has created in the last 60 seconds.
const ipCreateLog = new Map<string, number[]>();
function checkIpRate(ip: string, limit = 8, windowMs = 60_000): void {
  const now = Date.now();
  const log = (ipCreateLog.get(ip) ?? []).filter(t => now - t < windowMs);
  if (log.length >= limit) throw new Error('Too many rooms created from this address. Please wait before trying again.');
  log.push(now);
  ipCreateLog.set(ip, log);
}
// Purge old entries periodically to prevent unbounded growth.
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, log] of ipCreateLog) { if (log.every(t => t < cutoff)) ipCreateLog.delete(ip); }
}, 60_000).unref?.();

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
  sincePersist = 0;
  droppedSteps = 0;
  private saves?: VoyageStore;
  private voyage?: Voyage;
  private saveToken = '';
  private lastSaveAttempt = 0;
  private lastHeartbeat = 0;
  private saveUnavailable = false;
  private saveConflict = false;
  private lastSharedReset = 0;
  // G2: Countdown before expedition launches (ms epoch, 0 = no countdown).
  private countdownUntil = 0;
  // G1: Reset votes — mid-run "Return to Checkpoint" requires majority consent.
  private resetVotes = new Set<string>();
  private resetVoteExpiry = 0;
  // Session time follows simulation ticks, excluding lobby/network pauses.
  private playStartedTick = 0;
  private finishTimeMs = 0;

  onCreate(options: Record<string, unknown>) {
    if(options.protocol!==PROTOCOL_VERSION || options.physics!==PHYSICS_VERSION)throw new Error('Game version changed. Reload this page to join.');
    this.setPrivate(true);
    this.sim = new BoatSimulation(options.mode === 'practice');
    this.mode = options.mode === 'practice' ? 'practice' : 'expedition';
    this.stage = this.mode === 'practice' ? 'playing' : 'lobby';
    if (this.mode === 'practice') this.maxClients = 1;
    if (this.mode === 'expedition') {
      this.saves = voyageStore();
      if (options.saveToken !== undefined && typeof options.saveToken !== 'string') throw new Error('Invalid voyage recovery code.');
      const claimed = this.saves.claim(this.roomId, options.saveToken as string | undefined);
      this.voyage = claimed.voyage; this.saveToken = claimed.token;
      this.sim.checkpoint = claimed.voyage.checkpoint; this.sim.revision = claimed.voyage.revision; this.sim.reset();
    }
    // Both input forms share the single sequence acknowledged in snapshots.
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
      if (!member?.connected || typeof value !== 'boolean' || this.stage !== 'lobby' || this.saveConflict) return;
      member.ready = value;
      if (this.members.size === 4 && [...this.members.values()].every(m => m.connected && m.ready)) {
        // G2: Begin 3-second countdown rather than instantly entering play.
        if (this.countdownUntil === 0) this.countdownUntil = Date.now() + 3000;
      } else {
        // If someone un-readies, cancel any running countdown.
        this.countdownUntil = 0;
      }
      this.sendSnapshot();
    });
    // G1: Reset during active play requires majority consent; sunk boat can reset immediately.
    this.onMessage('reset', (client, value: unknown) => {
      const member = this.members.get(client.sessionId);
      if (!member?.connected || this.paused || this.sim.complete || this.stage !== 'playing' || this.sim.condition === 'breaking' || Date.now() - this.lastSharedReset < 2000) return;
      if (value === false) {
        this.resetVotes.delete(client.sessionId);
        if (!this.resetVotes.size) this.resetVoteExpiry = 0;
        this.sendSnapshot(); return;
      }
      if (value !== undefined && value !== true) return;
      if (this.sim.condition !== 'afloat') {
        // Boat sunk — retry checkpoint immediately (any crew member can trigger).
        member.lastReset = this.lastSharedReset = Date.now();
        this.resetVotes.clear(); this.resetVoteExpiry = 0;
        this.sim.reset(); this.clearRowing(); this.sendSnapshot(); return;
      }
      // Afloat mid-run reset requires a majority vote within 15 seconds.
      const now = Date.now();
      if (now > this.resetVoteExpiry) { this.resetVotes.clear(); this.resetVoteExpiry = now + 15_000; }
      this.resetVotes.add(client.sessionId);
      // Remove stale votes from disconnected players.
      for (const id of this.resetVotes) { if (!this.members.get(id)?.connected) this.resetVotes.delete(id); }
      const connected = [...this.members.values()].filter(m => m.connected).length;
      const needed = Math.floor(connected / 2) + 1;
      if (this.resetVotes.size >= needed) {
        member.lastReset = this.lastSharedReset = now;
        this.resetVotes.clear(); this.resetVoteExpiry = 0;
        this.sim.reset(); this.clearRowing(); this.sendSnapshot(); return;
      }
      // Broadcast updated vote count so all players see progress.
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
      member.lastReset = this.lastSharedReset = Date.now();
      this.finishTimeMs = 0; this.playStartedTick = this.sim.tick;
      this.resetVotes.clear(); this.resetVoteExpiry = 0;
      this.sim.reset(true); this.clearRowing();
      if (this.mode === 'expedition') {
        this.stage = 'lobby'; this.countdownUntil = 0;
        for (const m of this.members.values()) m.ready = false;
      }
      this.persistVoyage(); this.sendSnapshot();
    });
    this.onMessage('*', () => { /* Ignore unrecognized commands, including hull state forgery. */ });
    this.setSimulationInterval(elapsed => {
      this.sinceSnapshot += elapsed;
      this.sincePersist += elapsed;
      // G2: Check if countdown has elapsed and transition to playing.
      if (this.countdownUntil > 0 && Date.now() >= this.countdownUntil) {
        this.countdownUntil = 0;
        if (this.stage === 'lobby' && !this.saveConflict && this.members.size === 4 && [...this.members.values()].every(m => m.connected && m.ready)) {
          this.stage = 'playing'; this.playStartedTick = this.sim.tick;
          this.sim.reset(); this.clearRowing();
          this.resetVotes.clear(); this.resetVoteExpiry = 0;
        }
      }
      // G1: Expire stale reset votes.
      if (this.resetVoteExpiry > 0 && Date.now() > this.resetVoteExpiry) {
        this.resetVotes.clear(); this.resetVoteExpiry = 0;
      }
      if (!this.paused && this.stage === 'playing' && !this.sim.complete) {
        const checkpoint = this.sim.checkpoint;
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
          if (this.sim.resetId !== resetId) { this.clearRowing(); this.resetVotes.clear(); this.resetVoteExpiry = 0; }
          this.debt -= DT; steps++;
        }
        if (this.debt >= DT) { this.droppedSteps += Math.floor(this.debt / DT); this.debt %= DT; }
        // F3: Record finish time the first moment complete is reached.
        if (this.sim.complete && this.finishTimeMs === 0) {
          this.finishTimeMs = (this.sim.tick - this.playStartedTick) * DT * 1000;
          this.resetVotes.clear(); this.resetVoteExpiry = 0;
        }
        // A checkpoint/finish is committed immediately, not on the next 1Hz
        // heartbeat. A process crash must not lose an acknowledged checkpoint.
        if (this.sim.checkpoint !== checkpoint || this.sim.complete) this.persistVoyage();
      } else this.debt = 0;
      // Persist at ~1 Hz to avoid calling SQLite on every simulation tick (P6).
      if (this.sincePersist >= 1000) { this.sincePersist %= 1000; this.persistVoyage(); }
      if (this.sinceSnapshot >= 50) { this.sinceSnapshot %= 50; this.sendSnapshot(); }
    }, DT * 1000);
  }

  static async onAuth(_token: string, options: Record<string, unknown>, context: AuthContext) {
    if (options.protocol !== PROTOCOL_VERSION || options.physics !== PHYSICS_VERSION) {
      throw new Error('Game version changed. Reload this page to join.');
    }
    const request: unknown = context.req;
    if (context.ip && request && typeof request === 'object' && 'url' in request && typeof request.url === 'string') {
      const path = new URL(request.url, 'http://localhost').pathname;
      if (/\/matchmake\/(create|joinOrCreate)\/boat\/?$/.test(path)) checkIpRate(context.ip);
    }
    return true;
  }

  get paused() {
    return this.mode === 'expedition' && this.stage === 'playing' && !this.sim.complete && (this.members.size < 4 || [...this.members.values()].some(m => !m.connected));
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
    if (member) {
      member.connected = false; member.disconnectedAt = Date.now();
      if (this.stage === 'lobby') member.ready = false;
      this.sim.setActive(member.seat, false);
    }
    // A dropped player's vote is no longer valid.
    this.resetVotes.clear(); this.resetVoteExpiry = 0;
    this.sim.releaseInputs();
    this.clearRowing();
    // Cancel countdown if a player drops during lobby countdown.
    this.countdownUntil = 0;
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
    this.resetVotes.clear(); this.resetVoteExpiry = 0;
    this.countdownUntil = 0;
    // A deliberately departed friend returns the crew to the dock for re-ready.
    if (this.mode === 'expedition' && !this.sim.complete) {
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
      if (error instanceof VoyageConflict) { this.saveConflict=true; this.stage = 'lobby'; this.countdownUntil = 0; this.sim.releaseInputs(); for (const m of this.members.values()) m.ready = false; }
      if (!this.saveUnavailable) { this.saveUnavailable = true; this.sendVoyage(); console.warn('Voyage persistence unavailable:', error instanceof Error ? error.message : 'storage error'); }
    }
  }

  snapshot(): Snapshot {
    const remaining = [...this.members.values()].filter(m => !m.connected)
      .map(m => this.reconnectGrace - (Date.now() - (m.disconnectedAt ?? Date.now())) / 1000);
    const connected = [...this.members.values()].filter(m => m.connected).length;
    const validResetVotes = [...this.resetVotes].filter(id => this.members.get(id)?.connected).length;
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
      countdownSeconds: this.countdownUntil > 0 ? Math.max(0, Math.ceil((this.countdownUntil - Date.now()) / 1000)) : undefined,
      finishTimeMs: this.finishTimeMs > 0 ? this.finishTimeMs : undefined,
      resetVotes: validResetVotes > 0 ? validResetVotes : undefined,
      resetVotesNeeded: validResetVotes > 0 ? Math.floor(connected / 2) + 1 : undefined,
      resetVoters: validResetVotes > 0 ? [...this.resetVotes].flatMap(id => { const member = this.members.get(id); return member?.connected ? [member.seat] : []; }) : undefined,
      resetVoteSeconds: validResetVotes > 0 ? Math.max(0, Math.ceil((this.resetVoteExpiry - Date.now()) / 1000)) : undefined,
    };
  }

  sendSnapshot() { this.broadcast('snapshot', this.snapshot()); }
  onDispose() {
    if (this.saves && this.voyage) { this.persistVoyage(); try { this.saves.release(this.voyage.id, this.roomId); } catch { /* Never overwrite a different owner's lease. */ } }
    this.sim?.dispose();
  }
}
