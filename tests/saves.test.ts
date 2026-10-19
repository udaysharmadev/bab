import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {VoyageStore,VoyageConflict,validSaveToken} from '../src/server/voyages';

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
