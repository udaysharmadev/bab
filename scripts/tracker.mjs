import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'docs/PRODUCTION_TRACKER.json');
const report = resolve(root, 'docs/PRODUCTION_TRACKER.md');
const dashboard = resolve(root, 'docs/PRODUCTION_TRACKER.html');
const statuses = ['BACKLOG', 'IMPLEMENTING', 'IN_TEST', 'BLOCKED', 'ACCEPTED'];

export function validateTracker(tracker, pathExists = path => existsSync(resolve(root, path))) {
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  if (tracker.directionChange) {
    const direction=tracker.directionChange;
    require(typeof direction.title==='string'&&direction.title.trim()&&typeof direction.summary==='string'&&direction.summary.trim(), 'Direction change requires a title and summary');
    require(typeof direction.document==='string'&&!direction.document.startsWith('/')&&!direction.document.split('/').includes('..')&&pathExists(direction.document), 'Direction change requires an existing safe document');
    if(direction.phases)require(Array.isArray(direction.phases)&&direction.phases.length===5&&direction.phases.every((p,i)=>p.id===`R${i}`&&['title','status','remaining'].every(k=>typeof p[k]==='string'&&p[k].trim())), 'Redesign requires five explicit R0–R4 phase records');
  }
  require(Array.isArray(tracker.deliveryPhases)&&tracker.deliveryPhases.length===5,'Five delivery phases are required');
  let activePhases=0;
  for(const [index,phase] of tracker.deliveryPhases.entries()){
    require(phase.id===`M${index+1}`&&typeof phase.title==='string'&&typeof phase.acceptance==='string'&&typeof phase.remaining==='string',`Invalid delivery phase ${index+1}`);
    require(['NOT_STARTED','ACTIVE','VERIFIED'].includes(phase.engineeringState)&&['OPEN','ACCEPTED'].includes(phase.productionGate),`${phase.id}: invalid phase state`);
    require(Array.isArray(phase.checks)&&phase.checks.length>0,`${phase.id}: phase checklist required`);
    if(phase.engineeringState==='ACTIVE')activePhases++;
    if(index>0&&phase.engineeringState!=='NOT_STARTED')require(tracker.deliveryPhases[index-1].engineeringState==='VERIFIED',`${phase.id}: previous engineering phase is not verified`);
    for(const check of phase.checks){
      require(typeof check.id==='string'&&typeof check.title==='string'&&['PENDING','PASS'].includes(check.status)&&Array.isArray(check.evidence),`${phase.id}: invalid checklist record`);
      for(const path of check.evidence)require(typeof path==='string'&&!path.startsWith('/')&&!path.split('/').includes('..')&&pathExists(path),`${check.id}: missing or unsafe evidence`);
      if(check.status==='PASS')require(check.evidence.length>0,`${check.id}: passing phase check needs evidence`);
    }
    if(phase.engineeringState==='VERIFIED')require(phase.checks.every(check=>check.status==='PASS'),`${phase.id}: engineering phase has pending checks`);
    if(phase.productionGate==='ACCEPTED')require(phase.engineeringState==='VERIFIED'&&typeof phase.reviewer==='string'&&phase.reviewer.trim()&&typeof phase.acceptedAt==='string'&&!Number.isNaN(Date.parse(phase.acceptedAt)),`${phase.id}: production gate requires explicit review`);
  }
  require(activePhases<=1,'Only one engineering phase can be active');
  require(tracker.baselinePoints === 2 && tracker.targetPoints === 100, 'Preserve the approved 2/100 baseline');
  require(Array.isArray(tracker.items) && tracker.items.length === 49, 'Expected all 49 production deliverables');
  require(Array.isArray(tracker.catalogue) && tracker.catalogue.length === 90, 'Expected 80 obstacle concepts and 10 signature encounters');
  const expected=Object.entries({F:3,P:6,G:6,N:5,V:5,A:2,R:14,Q:4,L:4}).flatMap(([prefix,count])=>Array.from({length:count},(_,i)=>`${prefix}${String(i+1).padStart(2,'0')}`));
  const entries=[...tracker.items,...tracker.catalogue];
  const items = new Map();
  for (const item of entries) {
    require(typeof item.id === 'string' && /^(?:[A-Z]\d{2}|OB-\d{3}|SP-\d{2})$/.test(item.id) && !items.has(item.id), `Duplicate or invalid ID: ${item.id}`);
    items.set(item.id, item);
    require(item.points === (item.kind==='catalogue'?0:2), `${item.id}: deliverables have two scope points; catalogue entries are unweighted`);
    for (const field of ['title','phase','owner','source','acceptance','remaining','updated']) require(typeof item[field] === 'string' && item[field].trim(), `${item.id}: missing ${field}`);
    require(statuses.includes(item.status), `${item.id}: invalid status`);
    require(Array.isArray(item.dependsOn) && Array.isArray(item.evidence), `${item.id}: missing dependencies/evidence`);
    require(!Number.isNaN(Date.parse(item.updated)), `${item.id}: invalid update date`);
    for (const path of item.evidence) require(typeof path === 'string' && !path.startsWith('/') && !path.split('/').includes('..') && pathExists(path), `${item.id}: missing or unsafe evidence ${path}`);
    if (item.status === 'ACCEPTED') require(item.evidence.length > 0 && typeof item.reviewer === 'string' && item.reviewer.trim() && typeof item.acceptedAt === 'string' && !Number.isNaN(Date.parse(item.acceptedAt)), `${item.id}: acceptance requires evidence, reviewer and date`);
  }
  require(expected.every(id=>items.has(id)), 'A production deliverable is missing');
  for(const [prefix,count,digits] of [['OB',80,3],['SP',10,2]])for(let i=1;i<=count;i++)require(items.has(`${prefix}-${String(i).padStart(digits,'0')}`), `Missing ${prefix} content concept ${i}`);
  require(new Set(tracker.items.map(item=>item.phase.slice(0,2))).size===13,'All13 production phases must be tracked');
  require(tracker.items.filter(item=>/^R\d{2}$/.test(item.id)).every(item=>typeof item.designCard==='string'&&item.designCard.trim()),'Every region needs its source design card');
  require(tracker.baselinePoints + tracker.items.reduce((n,item)=>n+item.points,0) === tracker.targetPoints, 'Scope weights must total 100');
  const visited = new Set(), active = new Set();
  function visit(item) {
    require(!active.has(item.id), `${item.id}: dependency cycle`);
    if (visited.has(item.id)) return;
    active.add(item.id);
    for (const id of item.dependsOn) {
      require(items.has(id), `${item.id}: unknown dependency ${id}`);
      const dependency = items.get(id);
      if (item.status === 'ACCEPTED') require(dependency.status === 'ACCEPTED', `${item.id}: dependency ${id} is not accepted`);
      visit(dependency);
    }
    active.delete(item.id); visited.add(item.id);
  }
  entries.forEach(visit);
  return tracker.baselinePoints + tracker.items.filter(item=>item.status === 'ACCEPTED').reduce((n,item)=>n+item.points,0);
}

export function renderTracker(tracker) {
  const points = validateTracker(tracker);
  const cell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
  const counts = statuses.map(status=>`${status}: ${tracker.items.filter(item=>item.status===status).length}`).join(' · ');
  const lines = [
    '# Bad at Boating — complete production tracker', '',
    `Updated ${tracker.updated}. Source: [PRODUCTION_TRACKER.json](PRODUCTION_TRACKER.json). Plan: [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md).`, '',
    ...(tracker.directionChange ? [`## ${cell(tracker.directionChange.title)}`, '', cell(tracker.directionChange.summary), '', `[Current redesign and R0–R4 checklist](../${tracker.directionChange.document})`, '', '| Current phase | State | Remaining |', '|---|---|---|', ...(tracker.directionChange.phases??[]).map(p=>`| ${p.id} — ${cell(p.title)} | ${cell(p.status)} | ${cell(p.remaining)} |`), '', '**Historical ledger below:** its scope points and engineering checks describe the legacy prototype.', ''] : []),
    `**Accepted scope: ${points}/100 points**, including the owner's 2-point inherited baseline. This is accepted scope, not measured game quality or time remaining. Code progress cannot certify AAA quality or zero possible glitches.`, '', counts, '',
    'Each item earns two points only when its entire acceptance gate is evidenced and reviewed. IN_TEST means implementation or partial evidence exists. Human, hardware and operational gates stay open until observed.', '',
    tracker.directionChange ? '## Legacy phased execution' : '## Phased execution', '',
    'Engineering verification and production acceptance are separate. An observed local benchmark does not close human/device/release gates.', '',
    '| Phase | Engineering | Production gate | Checklist | Remaining |',
    '|---|---|---|---|---|',
    ...tracker.deliveryPhases.map(phase=>`| ${phase.id} — ${cell(phase.title)} | ${phase.engineeringState} | ${phase.productionGate} | ${phase.checks.filter(check=>check.status==='PASS').length}/${phase.checks.length} verified | ${cell(phase.remaining)} |`), '',
    '## Production deliverables', '',
    '| ID | Phase / owner | Deliverable | Status | Dependencies | Acceptance gate | Evidence | Remaining |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const item of tracker.items) lines.push(`| ${item.id} | ${cell(item.phase)} / ${cell(item.owner)} | ${cell(item.title)} | ${item.status} | ${item.dependsOn.join(', ') || '—'} | ${cell(item.acceptance)} | ${item.evidence.map(path=>`[${path}](../${path})`).join(', ') || 'None yet'} | ${cell(item.remaining)} |`);
  lines.push('', '## Region design cards', '');
  for(const item of tracker.items.filter(item=>item.designCard))lines.push(`### ${item.id} — ${item.title}`,'',item.designCard,'');
  lines.push('## Obstacle and signature encounter catalogue','','The original 80 challenge concepts and 10 signature encounters are tracked individually below. These are unweighted content tasks under the production deliverables; listing them does not make them playable or accepted. Original proposed recovery behavior is reconciled with the latest marked lethal-contact rule during authoring.','','| ID | Concept | Status | Prerequisite | Acceptance | Evidence / remaining |','|---|---|---|---|---|---|');
  for(const item of tracker.catalogue)lines.push(`| ${item.id} | ${cell(item.title)} | ${item.status} | ${item.dependsOn.join(', ')} | ${cell(item.acceptance)} | ${item.evidence.map(path=>`[${path}](../${path})`).join(', ')} ${cell(item.remaining)} |`);
  lines.push('', 'The original T001–T030 inventory remains in [PRD_PROGRESS.md](PRD_PROGRESS.md). Detailed subsystem audits: [physics](PHYSICS_AUDIT.md), [graphics](GRAPHICS_AUDIT.md), [multiplayer](MULTIPLAYER_AUDIT.md). No region is accepted by naming or reusing a rendering fixture. See [PLAYTEST_KIT.md](PLAYTEST_KIT.md) for the human gate.', '', 'Regenerate with `npm run tracker`. Verify with `npm run tracker:check`.', '');
  return lines.join('\n');
}

export function renderDashboard(tracker) {
  const points=validateTracker(tracker);
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const entries=[...tracker.items,...tracker.catalogue];
  const phases=[...new Set(entries.map(item=>item.phase))].sort();
  const direction=tracker.directionChange;
  const directionNote=direction?`<aside id="direction-change" aria-label="Current game direction" style="border:2px solid #efc583;border-radius:12px;padding:24px;margin-bottom:28px"><h2>${escape(direction.title)}</h2><p>${escape(direction.summary)}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:20px 0">${(direction.phases??[]).map(p=>`<section class="reboot-phase" style="border:1px solid #405763;border-radius:10px;padding:14px"><small>${escape(p.id)} · ${escape(p.status)}</small><h3 style="margin:8px 0">${escape(p.title)}</h3><p>${escape(p.remaining)}</p></section>`).join('')}</div><a href="../${encodeURI(direction.document)}">Current redesign, concept and R0–R4 checklist</a></aside>`:'';
  const delivery=tracker.deliveryPhases.map(phase=>`<section class="delivery-phase" data-engineering="${phase.engineeringState}"><small>${phase.id} · ${phase.engineeringState}</small><h3>${escape(phase.title)}</h3><p>${phase.checks.filter(check=>check.status==='PASS').length}/${phase.checks.length} engineering checks verified<br>Production gate: <strong>${phase.productionGate}</strong></p><details><summary>Checklist and exit gate</summary><p>${escape(phase.acceptance)}</p><ul>${phase.checks.map(check=>`<li>${check.status}: ${escape(check.title)}${check.evidence.map(path=>` · <a href="../${encodeURI(path)}">evidence</a>`).join('')}</li>`).join('')}</ul><p>${escape(phase.remaining)}</p></details></section>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bad at Boating · Production</title>
<style>:root{color-scheme:dark;font:15px/1.6 system-ui;background:#101d24;color:#dbe5e8}*{box-sizing:border-box}body{max-width:1200px;margin:auto;padding:40px 24px}h1{font-size:clamp(30px,5vw,52px);letter-spacing:-2px;margin:0}h2{font-size:19px;margin:0}p{max-width:85ch;color:#a9bfc7}a{color:#9ed9c7}header{border-bottom:1px solid #31434d;padding-bottom:24px}small{color:#9db3be}.metrics{display:flex;flex-wrap:wrap;gap:30px;margin:24px 0}.metrics b{display:block;font-size:30px;color:#efc583}.delivery-phases{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:14px;margin:24px 0}.delivery-phase{padding:18px;border:1px solid #344852;border-radius:10px;background:#172730}.delivery-phase[data-engineering=ACTIVE]{border-color:#efc583}.delivery-phase[data-engineering=VERIFIED]{border-color:#5aa98d}.delivery-phase h3{font-size:18px;margin:6px 0}.delivery-phase p{font-size:13px}.delivery-phase li{font-size:12px}.filters{display:flex;flex-wrap:wrap;gap:12px;margin:25px 0;position:sticky;top:0;background:#101d24;padding:15px 0;z-index:1}label{display:grid;gap:4px;font-size:12px;color:#a9bfc7}input,select{background:#1a2a34;color:#eaf0f3;border:1px solid #405763;border-radius:7px;padding:10px;font:inherit}input{width:min(380px,80vw)}article{border:1px solid #344852;background:#172730;border-radius:10px;padding:22px;margin:14px 0}article p{margin:12px 0}.top{display:flex;justify-content:space-between;gap:15px;align-items:start}.status{font-size:11px;letter-spacing:1px;white-space:nowrap;border-radius:20px;padding:5px 10px;background:#334957;color:#c9dce5}.status.IN_TEST{background:#54452c;color:#ffe1a5}.status.ACCEPTED{background:#244c40;color:#b7f0d4}details{border-top:1px solid #344852;padding-top:10px}summary{cursor:pointer;color:#a9d4ce}ul{padding-left:20px}li{overflow-wrap:anywhere}.empty{display:none}footer{padding:30px 0;color:#a9bfc7}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible,a:focus-visible{outline:2px solid #efc583;outline-offset:4px}[hidden]{display:none!important}</style>
${directionNote}<header><small>BAD AT BOATING / PRODUCTION CONTROL · ${escape(tracker.updated)}</small><h1>${direction?'Legacy prototype ledger.':'From prototype to complete voyage.'}</h1><p>${direction?'Historical physics, graphics, multiplayer and region scope for the paddle prototype. Use the current redesign above for the new fan raft phases.':'A complete delivery map for physics, graphics, four-player play and all fourteen regions. Progress requires recorded evidence and review.'}</p><div class="metrics"><div><b>${points}/100</b>accepted scope points</div><div><b>${tracker.items.length} + ${tracker.catalogue.length}</b>deliverables + content tasks</div><div><b>${tracker.items.filter(item=>item.status==='IN_TEST').length}</b>with partial implementation</div><div><b>${tracker.items.filter(item=>/^R\d/.test(item.id)&&item.status==='ACCEPTED').length}/14</b>accepted regions</div></div><p>The owner's inherited baseline is 2 points. Each accepted deliverable adds 2. This is a scope ledger; it does not measure visual quality or promise zero possible glitches.</p><a href="PRODUCTION_PLAN.md">Development plan</a> · <a href="PRODUCTION_TRACKER.md">Full ledger</a> · <a href="PLAYTEST_KIT.md">Human study</a></header>
<h2 style="margin-top:28px">${direction?'Legacy delivery phases':'Delivery phases'}</h2><p>${direction?'These are the historical engineering phases. Their verification does not certify the fan raft redesign.':'Work moves through these five engineering phases. Production gates remain separate and require their full acceptance evidence.'}</p><section id="delivery-phases" class="delivery-phases" aria-label="Delivery phases">${delivery}</section>
<form class="filters" onsubmit="return false"><label>Search<input id="search" type="search" placeholder="Water, recovery, R03…"></label><label>Phase<select id="phase"><option value="">All phases</option>${phases.map(phase=>`<option>${escape(phase)}</option>`).join('')}</select></label><label>Status<select id="status"><option value="">All statuses</option>${statuses.map(status=>`<option>${status}</option>`).join('')}</select></label></form><p id="count" role="status"></p><main>${entries.map(item=>`<article data-phase="${escape(item.phase)}" data-status="${item.status}"><div class="top"><div><small>${item.id} · ${escape(item.phase)} · ${escape(item.owner)}</small><h2>${escape(item.title)}</h2></div><span class="status ${item.status}">${item.status}</span></div><p><strong>To accept:</strong> ${escape(item.acceptance)}</p><p><strong>Remaining:</strong> ${escape(item.remaining)}</p><details><summary>Evidence, dependencies and source</summary><p>Depends on: ${escape(item.dependsOn.join(', ')||'No prerequisite')} · Scope: ${item.points} points${item.kind==='catalogue'?' (content task under a deliverable)':''}</p><p>${escape(item.source)}</p>${item.designCard?`<p>${escape(item.designCard)}</p>`:""}<ul>${item.evidence.map(path=>`<li><a href="../${encodeURI(path)}">${escape(path)}</a></li>`).join('')||'<li>No evidence yet.</li>'}</ul></details></article>`).join('')}</main><p id="empty" hidden>No matching deliverables. Change a filter to see more.</p><footer>Generated from PRODUCTION_TRACKER.json. Update the source and run npm run tracker. IN_TEST means partial evidence; human, hardware and release gates remain open.</footer>
<script>const items=[...document.querySelectorAll('article')],search=document.querySelector('#search'),phase=document.querySelector('#phase'),status=document.querySelector('#status');function filter(){let shown=0;for(const item of items){const match=(!phase.value||item.dataset.phase===phase.value)&&(!status.value||item.dataset.status===status.value)&&item.textContent.toLowerCase().includes(search.value.toLowerCase());item.hidden=!match;if(match)shown++;}document.querySelector('#count').textContent=shown+' of '+items.length+' work items';document.querySelector('#empty').hidden=shown>0;}for(const el of [search,phase,status])el.addEventListener('input',filter);filter();</script></html>\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tracker = JSON.parse(readFileSync(source, 'utf8'));
  const output = renderTracker(tracker), html=renderDashboard(tracker), points = validateTracker(tracker);
  if (process.argv.includes('--check')) {
    if (!existsSync(report) || readFileSync(report,'utf8') !== output) throw new Error('Tracker report is stale. Run npm run tracker.');
    if (!existsSync(dashboard) || readFileSync(dashboard,'utf8') !== html) throw new Error('Tracker dashboard is stale. Run npm run tracker.');
  } else { writeFileSync(report, output); writeFileSync(dashboard, html); }
  console.log(`PASS: ${tracker.items.length} deliverables + ${tracker.catalogue.length} content tasks, ${points}/100 accepted scope points; dependency/evidence/report checks passed.`);
}
