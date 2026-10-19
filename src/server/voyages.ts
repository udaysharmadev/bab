import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PHYSICS_VERSION } from '../shared/protocol';
import { CHECKPOINTS } from '../shared/world';

export const WORLD_VERSION = 'waterworks-1';
const boot = randomUUID();
const leaseMs = 45000;
export class VoyageConflict extends Error {}
export type Voyage = { id: string; checkpoint: number; revision: number; finished: boolean; savedAt: number };
export const validSaveToken = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
function checkpointValid(value: unknown): value is number { return Number.isInteger(value) && Number(value) >= 0 && Number(value) < CHECKPOINTS.length; }
function record(row: Record<string, unknown>): Voyage {
  if (typeof row.id !== 'string' || !checkpointValid(row.checkpoint) || !Number.isSafeInteger(row.revision)
    || !Number.isSafeInteger(row.saved_at) || ![0, 1].includes(Number(row.finished))) throw new Error('Saved voyage is damaged. Start a new voyage; existing save was retained.');
  if (row.world !== WORLD_VERSION || row.physics !== PHYSICS_VERSION) throw new Error('Saved voyage belongs to a different game version. Existing save was retained.');
  return { id: row.id, checkpoint: Number(row.checkpoint), revision: Number(row.revision), finished: row.finished === 1, savedAt: Number(row.saved_at) };
}
function processAlive(pid: number) {
  try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
}

export class VoyageStore {
  private db: DatabaseSync;
  constructor(path: string, private now = Date.now) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS voyages (
        id TEXT PRIMARY KEY, credential_hash TEXT UNIQUE NOT NULL,
        world TEXT NOT NULL, physics TEXT NOT NULL,
        checkpoint INTEGER NOT NULL CHECK(checkpoint>=0), revision INTEGER NOT NULL CHECK(revision>=0),
        finished INTEGER NOT NULL CHECK(finished IN (0,1)), saved_at INTEGER NOT NULL,
        lease_owner TEXT, lease_pid INTEGER, lease_until INTEGER NOT NULL DEFAULT 0
      );`);
  }
  claim(room: string, credential?: string): { voyage: Voyage; token: string } {
    if (credential !== undefined && !validSaveToken(credential)) throw new Error('Invalid voyage recovery code.');
    const token = credential ?? randomBytes(32).toString('base64url'), owner = `${boot}:${room}`, now = this.now();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      let row = this.db.prepare('SELECT * FROM voyages WHERE credential_hash=?').get(digest(token));
      if (!row && credential) throw new Error('This saved voyage could not be found.');
      if (!row) {
        const id = randomUUID();
        this.db.prepare('INSERT INTO voyages VALUES (?,?,?,?,0,0,0,?,NULL,NULL,0)').run(id, digest(token), WORLD_VERSION, PHYSICS_VERSION, now);
        row = this.db.prepare('SELECT * FROM voyages WHERE id=?').get(id)!;
      }
      const voyage = record(row);
      // A finished run must not be reopened as an unfinished checkpoint by
      // reset(). The title already offers a fresh voyage after completion.
      if (voyage.finished) throw new Error('This voyage is finished. Start a new voyage from Play with Friends.');
      const previousOwner = String(row.lease_owner ?? ''), pid = Number(row.lease_pid);
      const oldBootSamePid = pid === process.pid && !previousOwner.startsWith(`${boot}:`);
      if (previousOwner && previousOwner !== owner && Number(row.lease_until) > now && !oldBootSamePid && processAlive(pid))
        throw new VoyageConflict('This voyage is already active in another crew. Join that crew or wait for it to close.');
      this.db.prepare('UPDATE voyages SET lease_owner=?,lease_pid=?,lease_until=? WHERE id=?').run(owner, process.pid, now + leaseMs, voyage.id);
      this.db.exec('COMMIT'); return { voyage, token };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  save(id: string, room: string, revision: number, checkpoint: number, finished: boolean): Voyage {
    if (!checkpointValid(checkpoint) || !Number.isSafeInteger(revision) || revision < 0 || typeof finished !== 'boolean') throw new Error('Invalid canonical save.');
    const now = this.now();
    const changed = this.db.prepare(`UPDATE voyages SET checkpoint=?,finished=?,revision=revision+1,saved_at=?,lease_until=?
      WHERE id=? AND revision=? AND lease_owner=?`).run(checkpoint, Number(finished), now, now + leaseMs, id, revision, `${boot}:${room}`);
    if (changed.changes !== 1) throw new VoyageConflict('Save revision or active crew changed; stale progress was not written.');
    return record(this.db.prepare('SELECT * FROM voyages WHERE id=?').get(id)!);
  }
  heartbeat(id: string, room: string) {
    const changed = this.db.prepare('UPDATE voyages SET lease_until=? WHERE id=? AND lease_owner=?').run(this.now() + leaseMs, id, `${boot}:${room}`);
    if (changed.changes !== 1) throw new VoyageConflict('This saved voyage moved to another crew.');
  }
  release(id: string, room: string) { this.db.prepare('UPDATE voyages SET lease_owner=NULL,lease_pid=NULL,lease_until=0 WHERE id=? AND lease_owner=?').run(id, `${boot}:${room}`); }
  close() { this.db.close(); }
}
let shared: VoyageStore | undefined;
export function voyageStore() { return shared ??= new VoyageStore(process.env.BOAT_SAVE_DB ?? resolve('data/voyages.sqlite')); }
