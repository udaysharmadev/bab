import {fork} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {Client} from '@colyseus/sdk';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:2618',errors=[],poses=[],peers=[];
const server=fork('tests/support/fan-server.ts',[],{execArgv:['--import','tsx'],env:{...process.env,PORT:'2618',BOAT_SAVE_DB:':memory:',BOAT_DIST_DIR:process.env.BOAT_DIST_DIR??'dist'},silent:true});
let ready=false,output='',browser;
server.on('message',m=>{if(m?.ready)ready=true;});server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
async function until(fn){const t=Date.now();while(!fn()){assert(Date.now()-t<10000,output);await delay(25);}}
try {
  await until(()=>ready);browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base);await page.locator('#play-friends').click();await page.locator('#player-name').fill('Uday');await page.locator('#name-submit').click();
  await page.waitForFunction(()=>document.body.dataset.stage==='lobby');const room=new URL(page.url()).searchParams.get('raft');assert(room);
  const sdk=new Client(base.replace('http','ws')),options={protocol:1,physics:'fan-raft-0.2',world:'toy-bend-1',mode:'friends'};
  for(const name of ['Mira','Kabir','Anya']){const r=await sdk.joinById(room,{...options,name});r.onMessage('seat',()=>{});r.onMessage('snapshot',()=>{});r.send('ready',true);peers.push(r);}
  await page.locator('#ready').click();await page.waitForFunction(()=>document.body.dataset.stage==='playing');
  for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:907,height:510}]) {
    await page.setViewportSize(viewport);
    for(const [label,z,offset] of [['launch',2,0],['teeth',46,0],['checkpoint',73,0],['sweeper',88,3.5],['home',130,-1.2],['finish',150,0]]) {
      const ack=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Pose acknowledgement timeout')),5000);function receive(m){if(m?.z===z){clearTimeout(timer);server.off('message',receive);resolve(m);}}server.on('message',receive);});
      server.send({room,z,offset});const pose=await ack;
      await page.waitForFunction(id=>Number(document.body.dataset.resetId)===id,pose.resetId);await page.waitForTimeout(350);
      await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));
      const frame=await page.evaluate(()=>({condition:document.body.dataset.condition,bounds:JSON.parse(document.querySelector('canvas').dataset.raftBounds),calls:Number(document.body.dataset.drawCalls),triangles:Number(document.body.dataset.triangles),scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
      assert.equal(frame.condition,'afloat');assert(frame.bounds.left>.01&&frame.bounds.right<.99&&frame.bounds.top>.06&&frame.bounds.bottom<.97,JSON.stringify({label,viewport,...frame}));
      assert(frame.scrollWidth<=frame.width);assert(frame.calls<150&&frame.triangles<250000);
      poses.push({label,z,offset,viewport,...frame});await page.screenshot({path:`evidence/fan-route-${label}-${viewport.width}.png`});
    }
  }
  await page.locator('#menu-button').click();await page.locator('#low-graphics').check();await page.locator('#resume').click();await page.waitForTimeout(1100);
  await page.screenshot({path:'evidence/fan-route-low.png'});assert.deepEqual(errors,[]);
  const result={result:'PASS',browser:browser.version(),poses,errors,scope:'18 authored IPC poses across desktop, portrait and landscape; four real socket seats, one renderer. Not a continuous human route or device FPS test.'};
  await writeFile('evidence/fan-route.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:'PASS',views:poses.length,errors}));
}catch(error){await writeFile('evidence/fan-route-failure.json',JSON.stringify({error:String(error),poses,errors,output},null,2)+'\n');throw error;}
finally{await browser?.close();await Promise.allSettled(peers.map(r=>{r.reconnection.enabled=false;return r.leave();}));server.kill('SIGTERM');}
