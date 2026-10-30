import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {VoyageStore,VoyageConflict,validSaveToken} from '../src/server/voyages';
import {PHYSICS_VERSION} from '../src/shared/protocol';

test('Canonical checkpoint persists across database reopen; stale revisions and duplicate rooms cannot overwrite it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'boat-save-'));const path=join(dir,'voyages.sqlite');
 let db=new VoyageStore(path);
 try{
  const first=db.claim('crew-a');assert(validSaveToken(first.token));
  assert.throws(()=>db.claim('crew-b',first.token),VoyageConflict);
  const saved=db.save(first.voyage.id,'crew-a',0,4,false);assert.equal(saved.revision,1);
  assert.throws(()=>db.save(saved.id,'crew-a',0,1,false),VoyageConflict);
  assert.throws(()=>db.save(saved.id,'crew-a',1,99,false));
  db.release(saved.id,'crew-a');db.close();db=new VoyageStore(path);
  const resumed=db.claim('crew-b',first.token);assert.equal(resumed.voyage.checkpoint,4);
  assert.equal(resumed.voyage.id,saved.id);assert.equal(resumed.voyage.revision,1);
  assert.throws(()=>db.claim('bad','../secrets'));
  assert.throws(()=>db.claim('bad','a'.repeat(43)),/not be found/);
  const complete=db.save(saved.id,'crew-b',1,8,true);assert.equal(complete.finished,true);
  db.release(saved.id,'crew-b');
  assert.throws(()=>db.claim('crew-c',first.token),/voyage is finished/,'Opening a completed recovery code must not erase its completion');
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});

test('Lease takeover invalidates the old writer while heartbeat prevents premature duplicate resume',()=>{
 let now=1000;const db=new VoyageStore(':memory:',()=>now);
 try{
  const a=db.claim('a');now+=30000;db.heartbeat(a.voyage.id,'a');now+=30000;
  assert.throws(()=>db.claim('b',a.token),VoyageConflict);
  now+=46000;const b=db.claim('b',a.token);
  assert.throws(()=>db.save(a.voyage.id,'a',0,3,false),VoyageConflict);
  assert.throws(()=>db.heartbeat(a.voyage.id,'a'),VoyageConflict);
  assert.equal(db.save(b.voyage.id,'b',0,2,false).checkpoint,2);
 }finally{db.close();}
});

for(const previous of ['basin-0.5','basin-0.6','basin-0.7','basin-0.8','basin-0.9','basin-0.10','basin-0.11','basin-0.12']) test(`Reviewed ${previous} canonical saves migrate atomically, preserving checkpoint, token and revision`,()=>{
 assert.equal(PHYSICS_VERSION,'basin-0.13','Review this migration test before another physics-version change');
 const dir=mkdtempSync(join(tmpdir(),'boat-migration-')),path=join(dir,'voyages.sqlite');
 const store=new VoyageStore(path),inspect=new DatabaseSync(path);
 try{
  const original=store.claim('old-crew');
  const saved=store.save(original.voyage.id,'old-crew',0,7,false);
  inspect.prepare('UPDATE voyages SET physics=? WHERE id=?').run(previous,saved.id);
  const before=()=>inspect.prepare('SELECT * FROM voyages WHERE id=?').get(saved.id)!;
  const active=before();
  assert.throws(()=>store.claim('new-crew',original.token),VoyageConflict);
  assert.deepEqual(before(),active,'Rejected active-crew claim cannot migrate or modify the record');
  store.release(saved.id,'old-crew');
  const resumed=store.claim('new-crew',original.token);
  assert.deepEqual(resumed.voyage,saved);
  assert.equal(resumed.token,original.token);
  assert.equal(before().physics,PHYSICS_VERSION);
  assert.equal(store.save(saved.id,'new-crew',saved.revision,8,false).checkpoint,8);
  store.release(saved.id,'new-crew');
  for(const [field,value] of [['physics','basin-0.4'],['physics','future-version'],['world','unknown-world']] as const){
   inspect.prepare('UPDATE voyages SET physics=?,world=? WHERE id=?').run(PHYSICS_VERSION,'waterworks-1',saved.id);
   inspect.prepare(`UPDATE voyages SET ${field}=? WHERE id=?`).run(value,saved.id);
   const incompatible=before();
   assert.throws(()=>store.claim('incompatible',original.token),/different game version/);
   assert.deepEqual(before(),incompatible,'Rejected version must retain every saved field');
  }
  inspect.prepare('UPDATE voyages SET physics=?,world=?,finished=1 WHERE id=?').run(previous,'waterworks-1',saved.id);
  const finished=before();
  assert.throws(()=>store.claim('finished',original.token),/voyage is finished/);
  assert.deepEqual(before(),finished,'A finished prior-version save cannot be migrated into a new run');
 }finally{inspect.close();store.close();rmSync(dir,{recursive:true,force:true});}
});
