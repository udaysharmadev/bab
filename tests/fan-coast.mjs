import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const url=process.env.GAME_URL??'http://localhost:2571/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const position=()=>page.evaluate(()=>JSON.parse(document.body.dataset.position));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
try {
  await page.goto(url);await page.locator('#practice').click();await page.locator('#player-name').fill('Coast Check');await page.locator('#name-submit').click();
  await page.waitForFunction(()=>document.body.dataset.stage==='playing');
  const start=await position();await page.waitForTimeout(1200);assert(distance(start,await position())<.001,'No passive downstream engine');
  await page.keyboard.down('Space');await page.waitForTimeout(300);await page.keyboard.up('Space');
  const release=await position(),samples=[];
  for(let i=1;i<=65;i++) {await page.waitForTimeout(100);samples.push({seconds:i/10,position:await position()});}
  const end=samples.at(-1).position,coast=distance(release,end);
  assert(coast>.25&&coast<1.2,`Visible bounded coast after real keyup: ${coast}`);
  assert(distance(release,samples[4].position)>.08,'Release keeps visible inertia');
  assert(distance(samples[49].position,end)<.001,'Raft must stay at rest instead of drifting indefinitely');
  const fans=await page.evaluate(()=>JSON.parse(document.body.dataset.fans));assert.equal(fans[2].strokes,1);assert(fans.every(f=>f.power===0));
  assert.deepEqual(errors,[]);await page.screenshot({path:'evidence/fan-coast-rest.png'});
  const result={result:'PASS',browser:browser.version(),coastMetres:coast,lateDriftMetres:distance(samples[49].position,end),strokes:fans.map(f=>f.strokes),samples,errors,scope:'Actual browser Space press and keyup through the production room; no teleport or direct velocity change'};
  await writeFile('evidence/fan-coast-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,samples:samples.length},null,2));
}finally{await browser.close();}
