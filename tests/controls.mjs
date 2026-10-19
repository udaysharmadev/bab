import {chromium} from 'playwright';
import {PerspectiveCamera, Quaternion, Vector3} from 'three';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';

const base=process.env.GAME_URL??'http://localhost:2569';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});
const pages=[],errors=[],checks=[];
const data=(page,name)=>page.locator('body').getAttribute(`data-${name}`);
const blades=page=>data(page,'blades').then(JSON.parse);
const strokes=page=>data(page,'strokes').then(Number);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(name,pass,details={}) {
 checks.push({name,pass,...details});
 console.log(`${pass?'PASS':'FAIL'}: ${name}${pass?'':` ${JSON.stringify(details)}`}`);
}
// A numeric +yaw rotates toward screen LEFT in the +Z-facing chase camera.
function screenHeading(q) {
 const camera=new PerspectiveCamera(52,4/3,.1,400);
 camera.position.set(.9,6.5,-10.3);camera.lookAt(0,.3,2.5);camera.updateMatrixWorld();
 const neutral=new Vector3(0,0,1.9).project(camera);
 const bow=new Vector3(0,0,1.9).applyQuaternion(new Quaternion(q.x,q.y,q.z,q.w)).project(camera);
 return bow.x-neutral.x;
}
async function releaseAll() {
 await Promise.all(pages.map(page=>Promise.all(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].map(key=>page.keyboard.up(key)))));
}
async function reset() {
 await releaseAll();
 const old=await data(pages[0],'reset-id');
 await pages[0].getByRole('button',{name:'Open game menu'}).click();
 await pages[0].getByRole('button',{name:'Return to Checkpoint',exact:true}).click();
 for (const page of pages.slice(1,3)) await page.locator('#agree-reset').click();
 await Promise.all(pages.map(page=>page.waitForFunction(old=>document.body.dataset.resetId!==old,old)));
 await wait(300);
}
async function hold(players,keys,ms=3800) {
 const startTick=Number(await data(pages[0],'tick'));
 await Promise.all(players.flatMap(page=>keys.map(key=>page.keyboard.down(key))));
 await wait(ms);
 // The authoritative clock can slow under four-renderer machine contention.
 // Require the requested simulation duration rather than counting wall time.
 await pages[0].waitForFunction(({startTick,ticks})=>Number(document.body.dataset.tick)>=startTick+ticks,{startTick,ticks:Math.floor(ms*60/1000)});
 await Promise.all(players.flatMap(page=>keys.map(key=>page.keyboard.up(key))));
 await wait(350);
}
async function repeats(page,seat,key) {
 const before=await blades(page),count=await strokes(page);
 const ack=JSON.parse(await data(page,'ack'))[seat];
 await hold([page],[key]);
 const after=await blades(page),caught=await strokes(page)-count;
 const isolated=before.every((p,i)=>i===seat||(Math.abs(p.x-after[i].x)<.001&&Math.abs(p.z-after[i].z)<.001));
 check(`seat ${seat}: held ${key} repeats own paddle`,caught>=2&&isolated&&JSON.parse(await data(page,'ack'))[seat]>ack,{caught,isolated});
 const position=JSON.parse(await data(page,'position')),heading=screenHeading(JSON.parse(await data(page,'rotation')));
 const correct=key==='w'||key==='ArrowUp'?position.z>.2&&Math.abs(heading)<.02:key==='s'||key==='ArrowDown'?position.z<-.2&&Math.abs(heading)<.02:key==='a'||key==='ArrowLeft'?heading<-.02:heading>.02;
 check(`seat ${seat}: ${key} moves in the visible requested direction`,correct,{z:position.z,screenHeading:heading});
}
try {
 for(let seat=0;seat<4;seat++) {
  // Every page has an isolated browser context and real game client.
  const page=await browser.newPage({viewport:{width:640,height:480}});pages.push(page);
  page.setDefaultTimeout(15000);
  // Four clients share one test GPU; cap rendering near 15 FPS to verify that
  // the real keyboard/socket path works independently of render cadence.
  await page.addInitScript(()=>{
   const frame=window.requestAnimationFrame.bind(window);
   window.requestAnimationFrame=callback=>frame(()=>window.setTimeout(()=>callback(performance.now()),50));
  });
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(seat===0?base:pages[0].url());
  if(seat===0)await page.getByRole('button',{name:'Play with Friends',exact:true}).click();
  await page.waitForFunction(seat=>document.body.dataset.seat===String(seat)&&document.body.dataset.stage==='lobby',seat);
  await page.getByRole('button',{name:'Open game menu'}).click();
  await page.getByLabel('Lower graphics').check();
  await page.getByRole('button',{name:'Back to the River'}).click();
 }
 for(const page of pages)await page.getByRole('button',{name:'Ready to Row',exact:true}).click();
 await Promise.all(pages.map(page=>page.waitForFunction(()=>document.body.dataset.stage==='playing')));
 check('four-ready launch focuses all four game canvases',(await Promise.all(pages.map(page=>page.locator('canvas').evaluate(el=>document.activeElement===el)))).every(Boolean));
 await pages[3].context().setOffline(true);
 await pages[0].locator('#crew-waiting').waitFor({state:'visible'});
 const frozen=await data(pages[0],'tick');await wait(250);
 check('connection interruption pauses safely and explains the wait',await data(pages[0],'tick')===frozen&&(await pages[0].locator('#connection-message').textContent()).includes('crewmate'));
 await pages[3].context().setOffline(false);
 await Promise.all(pages.map(page=>page.waitForFunction(()=>document.body.dataset.paused==='false'&&document.getElementById('crew-waiting').hidden)));
 check('automatic reconnect recovers all four seats',await data(pages[3],'seat')==='3');
 for(let seat=0;seat<4;seat++)for(const key of ['w','s','a','d']) {
  await reset();await repeats(pages[seat],seat,key);
 }
 for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']) {
  await reset();
  if(key==='ArrowUp')await pages[3].locator('#menu-button').focus();
  await repeats(pages[3],3,key);
 }
 for(const key of ['w','s','a','d']) {
  await reset();const before=await Promise.all(pages.map(strokes));await hold(pages,[key]);
  const counts=(await Promise.all(pages.map(strokes))).map((count,i)=>count-before[i]);
  const position=JSON.parse(await data(pages[0],'position')),heading=screenHeading(JSON.parse(await data(pages[0],'rotation')));
  const correct=key==='w'?position.z>1:key==='s'?position.z< -1:key==='a'?heading<-.05:heading>.05;
  check(`all four players: simultaneous ${key}`,counts.every(count=>count>=2)&&correct,{strokes:counts,z:position.z,screenHeading:heading});
 }
 for(const turn of ['a','d']) {
  await reset();const before=await Promise.all(pages.map(strokes));await hold(pages,['w',turn]);
  const counts=(await Promise.all(pages.map(strokes))).map((count,i)=>count-before[i]),heading=screenHeading(JSON.parse(await data(pages[0],'rotation')));
  const outer=turn==='a'?[0,2]:[1,3],inner=turn==='a'?[1,3]:[0,2];
  check(`all four players: W+${turn.toUpperCase()} curves in requested direction`,outer.every(i=>counts[i]>=2)&&inner.every(i=>counts[i]===0)&&(turn==='a'?heading<-.02:heading>.02),{strokes:counts,screenHeading:heading});
 }
 const page=pages[3];
 await reset();let count=await strokes(page);
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'W',code:'',bubbles:true})));
 await wait(3800);
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keyup',{key:'W',code:'',bubbles:true})));
 check('uppercase key-only W repeats strokes',await strokes(page)-count>=2);
 await reset();await page.keyboard.down('w');await page.keyboard.down('ArrowUp');await page.keyboard.up('w');count=await strokes(page);
 await wait(3800);await page.keyboard.up('ArrowUp');
 check('releasing W leaves held Up alias rowing',await strokes(page)-count>=2);
 await reset();count=await strokes(page);await hold([page],['w','s'],1800);
 check('opposite keys cancel without a stroke',await strokes(page)===count);
 await page.getByRole('button',{name:'Open game menu'}).click();count=await strokes(page);await hold([page],['w'],1800);
 check('open dialog blocks rowing',await strokes(page)===count);
 await page.getByRole('button',{name:'Back to the River'}).click();await reset();await repeats(page,3,'w');
 for(let seat=0;seat<4;seat++) {
  await pages[seat].reload();
  await Promise.all(pages.map(p=>p.waitForFunction(()=>document.body.dataset.stage==='playing'&&document.body.dataset.seat!==undefined&&!document.querySelector('#crew-waiting:not([hidden])'))));
  check(`reload retains seat ${seat}`,await data(pages[seat],'seat')===String(seat));
  await reset();await repeats(pages[seat],seat,'w');
 }
 await reset();await page.keyboard.down('w');await wait(800);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('w');await wait(350);
 check('blur lifts blade and cancels held action',(await blades(page))[3].immersion===0);
 count=await strokes(page);await wait(1900);
 check('no new catches after release',await strokes(page)===count);
 await page.context().setOffline(true);
 await page.locator('#crew-waiting').waitFor({state:'visible'});
 await page.locator('#connection-leave').click();
 await page.getByRole('main',{name:'Main menu'}).waitFor();
 await page.context().setOffline(false);await wait(2500);
 check('Main Menu remains usable during interruption and old reconnect cannot hijack it',await page.getByRole('main',{name:'Main menu'}).isVisible());
 check('no browser errors',errors.length===0,{errors});
} catch(error) {
 check('browser scenario completed',false,{error:String(error)});
 throw error;
} finally {
 const result={result:checks.length>0&&checks.every(c=>c.pass)?'PASS':'FAIL',date:new Date().toISOString(),base,automated:true,humanPlaytest:false,renderFpsCap:15,holdClock:'server ticks, with minimum wall time',mode:'friends',seats:[0,1,2,3],checks,errors};
 await mkdir('evidence',{recursive:true});
 await writeFile('evidence/controls-after.json',JSON.stringify(result,null,2));
 for(const page of pages) {
  await page.getByRole('button',{name:'Open game menu'}).click({timeout:500}).catch(()=>{});
  await page.locator('#leave').click({timeout:500}).catch(()=>{});
 }
 await browser.close();
 console.log(`${result.result}: ${checks.filter(c=>c.pass).length}/${checks.length} four-player control checks`);
}
assert(checks.every(c=>c.pass),'Four-player control regression failed; see evidence/controls-after.json');
