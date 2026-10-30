import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTracker,renderTracker,renderDashboard} from '../scripts/tracker.mjs';
const source = () => JSON.parse(readFileSync(new URL('../docs/PRODUCTION_TRACKER.json',import.meta.url),'utf8'));

test('Production tracker rejects fabricated completion, missing evidence and dependency cycles',()=>{
  const current=source();
  assert.equal(validateTracker(current),2+current.items.filter(item=>item.status==='ACCEPTED').length*2);
  const fabricate=source(); fabricate.items[0].status='ACCEPTED';
  assert.throws(()=>validateTracker(fabricate),/acceptance requires/);
  const missing=source(); missing.items[0].evidence.push('evidence/nonexistent-review.json');
  assert.throws(()=>validateTracker(missing),/missing or unsafe evidence/);
  const cycle=source(); cycle.items[0].dependsOn=['F02'];
  assert.throws(()=>validateTracker(cycle),/dependency cycle/);
  const premature=source(); Object.assign(premature.items[1],{status:'ACCEPTED',reviewer:'QA',acceptedAt:'2026-10-20'});
  assert.throws(()=>validateTracker(premature),/dependency F01 is not accepted/);
  const duplicate=source(); duplicate.items[1].id='F01';
  assert.throws(()=>validateTracker(duplicate),/Duplicate/);
  assert.equal(renderTracker(source()),renderTracker(source()),'Report generation must be stable');
  const malicious=source();malicious.items[0].title='<script>alert(1)</script>';
  assert(!renderDashboard(malicious).includes('<script>alert(1)</script>'),'Dashboard text must be escaped');
  assert.match(renderTracker(current),/Historical ledger below/);
  assert.match(renderDashboard(current),/id="direction-change"/);
  const unsafeDirection=source();unsafeDirection.directionChange.document='../outside.md';
  assert.throws(()=>validateTracker(unsafeDirection),/existing safe document/);
  const missingDirection=source();missingDirection.directionChange.document='docs/missing-design.md';
  assert.throws(()=>validateTracker(missingDirection),/existing safe document/);
  const escapedDirection=source();escapedDirection.directionChange.title='<script>direction()</script>';
  assert(!renderDashboard(escapedDirection).includes('<script>direction()</script>'));
  const missingPhase=source();missingPhase.directionChange.phases.pop();assert.throws(()=>validateTracker(missingPhase),/five explicit R0–R4/);
  assert.equal((renderDashboard(current).match(/class="reboot-phase"/g)??[]).length,5);
});

test('Delivery phases cannot skip prerequisites or turn local verification into production acceptance',()=>{
  const jump=source();jump.deliveryPhases[2].engineeringState='ACTIVE';
  assert.throws(()=>validateTracker(jump),/previous engineering phase is not verified/);
  const incomplete=source();incomplete.deliveryPhases[0].engineeringState='VERIFIED';incomplete.deliveryPhases[0].checks[0].status='PENDING';
  assert.throws(()=>validateTracker(incomplete),/pending checks/);
  const noEvidence=source();noEvidence.deliveryPhases[0].checks[0].evidence=[];
  assert.throws(()=>validateTracker(noEvidence),/passing phase check needs evidence/);
  const unsigned=source();unsigned.deliveryPhases[0].productionGate='ACCEPTED';
  assert.throws(()=>validateTracker(unsigned),/production gate requires explicit review/);
});
