import {confirmName} from './support/name.mjs';
import {fork} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {bedHeight} from '../src/shared/bathymetry.ts';
import {localToWorld} from '../src/shared/protocol.ts';
const base='http://127.0.0.1:2591',pages=[],errors=[],checks=[],trace=[];
const server=fork('tests/support/bathymetry-server.ts',[],{execArgv:['--import','tsx'],env:{...process.env,PORT:'2591',BOAT_SAVE_DB:':memory:',BOAT_DIST_DIR:'dist'},silent:true});
let browser,ready=false,output='',health;
server.stdout.on('data',v=>output+=v);server.stderr.on('data',v=>output+=v);server.on('message',m=>{if(m?.ready)ready=true;});
async function until(check,timeout=15000){const start=Date.now();while(!await check()){assert(Date.now()-start<timeout,'QA wait timed out: '+output);await delay(150);}}
const data=page=>page.evaluate(()=>({tick:Number(document.body.dataset.tick),reset:Number(document.body.dataset.resetId),recovery:Number(document.body.dataset.recoveryId),condition:document.body.dataset.condition,position:JSON.parse(document.body.dataset.position),rotation:JSON.parse(document.body.dataset.rotation),blades:JSON.parse(document.body.dataset.blades)}));
try{
 await until(()=>ready||server.exitCode!==null);assert(ready);health=await fetch(base+'/health').then(r=>r.json());browser=await chromium.launch({channel:'chrome',headless:true});let invite;
 for(let seat=0;seat<4;seat++){
  const page=await browser.newPage({viewport:seat?{width:640,height:400}:{width:1280,height:900}});pages.push(page);
  await page.addInitScript(()=>{localStorage.setItem('bad-at-boating-name','River Tester');const frame=requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>frame(()=>setTimeout(()=>callback(performance.now()),50));});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID_/.test(m.text()))errors.push(m.text());});
  await page.goto(invite??base);if(!seat){await page.getByRole('button',{name:'Play with Friends',exact:true}).click();await page.waitForFunction(()=>document.body.dataset.seat==='0');invite=page.url();}
  await page.waitForFunction(seat=>document.body.dataset.seat===String(seat),seat);await confirmName(page);
  if(seat){await page.locator('#menu-button').click();await page.getByLabel('Lower graphics').check();await page.locator('#resume').click();}
 }
 for(const page of pages)await page.locator('#ready').click();await Promise.all(pages.map(p=>p.waitForFunction(()=>document.body.dataset.stage==='playing')));
 const pose=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Pose timeout')),5000);server.once('message',m=>{clearTimeout(t);resolve(m);});server.send({room:new URL(invite).searchParams.get('crew')});});assert(pose.approach);
 await Promise.all(pages.map(p=>p.waitForFunction(id=>Number(document.body.dataset.resetId)===id,pose.resetId)));await delay(1200);
 const entry=await data(pages[0]);assert(entry.position.x<-10);assert.equal(entry.condition,'afloat');assert.equal(entry.recovery,0);
 await pages[0].screenshot({path:'evidence/bathymetry-approach.png'});checks.push('Four rendered clients receive one QA-authored sandbar approach under normal authority water/current; High/Low rendering has no browser errors');
 await Promise.all(pages.map(p=>p.keyboard.down('s')));const begin=Date.now();let exit;
 await until(async()=>{
  exit=await data(pages[0]);assert.equal(exit.reset,pose.resetId);assert.equal(exit.recovery,0);assert.equal(exit.condition,'afloat');assert(exit.blades.every(b=>Number.isFinite(b.force)&&b.force<=420.001));
  const clearance=Math.min(...[-.72,.72].flatMap(x=>[-1.55,1.55].map(z=>{const p=localToWorld({x,y:-.25,z},exit.position,exit.rotation);return p.y-bedHeight(p.x,p.z);})));
  trace.push({tick:exit.tick,position:exit.position,clearance});return clearance>=.8;
 },70000);
 await Promise.all(pages.map(p=>p.keyboard.up('s')));assert(exit.tick>entry.tick);checks.push('Four actual held S keys clear the bed beneath the full keel with bounded force and no reset, recovery teleport or wreck');
 await pages[0].screenshot({path:'evidence/bathymetry-exit.png'});
 await delay(600);const peers=await Promise.all(pages.map(data));assert(peers.every(p=>p.reset===pose.resetId&&p.recovery===0&&p.condition==='afloat'));checks.push('All four rendered peers retain the same reset/recovery/condition after the escape');assert.deepEqual(errors,[]);
 await writeFile('evidence/bathymetry-browser.json',JSON.stringify({result:'PASS',physics:health.physics,checks,errors,entry,exit,escapeWallSeconds:(Date.now()-begin)/1000,trace,humanPlaytest:false,scope:'Four actual Chrome clients,High+Low,normal live authority and keyboard input; initial pose set once through QA-only parent IPC. Not device/FPS/Internet acceptance.'},null,2)+'\n');console.log('PASS:3 four-browser shallow-water groups');
}finally{
 for(const p of pages){await p.keyboard.up('s').catch(()=>{});await p.locator('#menu-button').click({timeout:500}).catch(()=>{});await p.locator('#leave').click({timeout:500}).catch(()=>{});}
 await browser?.close();server.kill('SIGTERM');await delay(200);
}
