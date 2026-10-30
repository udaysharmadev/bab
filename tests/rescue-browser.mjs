import {confirmName} from './support/name.mjs';
import {fork} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base='http://127.0.0.1:2586',pages=[],errors=[],checks=[],trace=[],held=[];
const server=fork('tests/support/rescue-server.ts',[],{execArgv:['--import','tsx'],env:{...process.env,PORT:'2586',BOAT_SAVE_DB:':memory:',BOAT_DIST_DIR:'dist'},silent:true});
let browser,ready=false,output='',health;
server.stdout.on('data',data=>output+=data);server.stderr.on('data',data=>output+=data);
server.on('message',message=>{if(message?.ready)ready=true;});
const until=async(check,timeout=15000)=>{const start=Date.now();while(!await check()){assert(Date.now()-start<timeout,'QA wait timed out: '+output);await delay(40);}};
const data=page=>page.evaluate(()=>({tick:Number(document.body.dataset.tick),resetId:Number(document.body.dataset.resetId),position:JSON.parse(document.body.dataset.position),rotation:JSON.parse(document.body.dataset.rotation),condition:document.body.dataset.condition,paused:document.body.dataset.paused,strokes:Number(document.body.dataset.strokes),recovery:Number(document.body.dataset.recoveryId),blades:JSON.parse(document.body.dataset.blades)}));
async function controls(keys){
  await Promise.all(pages.map(async(page,index)=>{
    held[index]??=new Set();
    for(const key of held[index])if(!keys.includes(key))await page.keyboard.up(key);
    for(const key of keys)if(!held[index].has(key))await page.keyboard.down(key);
    held[index]=new Set(keys);
  }));
}
try{
  await until(()=>ready||server.exitCode!==null);assert(ready,output);
  health=await fetch(base+'/health').then(response=>response.json());
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});let invite;
  for(let seat=0;seat<4;seat++){
    const page=await browser.newPage({viewport:seat?{width:640,height:400}:{width:1280,height:900}});pages.push(page);page.setDefaultTimeout(15000);
    // Cap fixture render load: this measures socket/scene integration, not FPS.
    await page.addInitScript(()=>{localStorage.setItem('bad-at-boating-name','River Tester');const frame=requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>frame(()=>setTimeout(()=>callback(performance.now()),50));});
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
    await page.goto(invite??base);
    if(!seat){await page.getByRole('button',{name:'Play with Friends',exact:true}).click();await page.waitForFunction(()=>document.body.dataset.seat==='0');invite=page.url();}
    await page.waitForFunction(seat=>document.body.dataset.seat===String(seat),seat);
    await confirmName(page);
    if(seat){await page.locator('#menu-button').click();await page.getByLabel('Lower graphics').check();await page.locator('#resume').click();}
  }
  for(const page of pages)await page.locator('#ready').click();
  await Promise.all(pages.map(page=>page.waitForFunction(()=>document.body.dataset.stage==='playing')));
  const room=new URL(invite).searchParams.get('crew');
  const pose=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Approach setup timed out')),5000);
    server.once('message',message=>{clearTimeout(timer);resolve(message);});server.send({room});
  });
  assert(pose.approach);
  await Promise.all(pages.map(page=>page.waitForFunction(reset=>Number(document.body.dataset.resetId)===reset,pose.resetId)));
  await pages[0].waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Recovery eddy.'));
  await delay(600);assert.match(await pages[0].locator('#toast').textContent(),/^Recovery eddy\./,'A later durable-save acknowledgement must not replace encounter guidance');
  await delay(6000);const approach=await data(pages[0]);
  assert(approach.position.x<-7&&approach.position.z>373&&approach.position.z<381);
  assert.equal(approach.strokes,0);assert.equal(approach.condition,'afloat');assert.equal(approach.recovery,0);
  await pages[0].screenshot({path:'evidence/rescue-approach.png'});
  checks.push('Four rendered clients enter from one IPC-authored approach; ordinary authority current slows/deflects the unpowered hull without reset');

  await pages[3].route('**/assets/*.js',async route=>{await delay(2500);await route.continue();});
  const reload=pages[3].reload();
  await pages[0].waitForFunction(()=>document.body.dataset.paused==='true');
  await delay(150);const paused=await data(pages[0]),foam=await pages[0].locator('canvas').getAttribute('data-rescue-flow');
  await delay(600);assert.equal((await data(pages[0])).tick,paused.tick);assert.equal(await pages[0].locator('canvas').getAttribute('data-rescue-flow'),foam);
  await reload;await pages[3].unroute('**/assets/*.js');
  await pages[3].waitForFunction(()=>document.body.dataset.seat==='3'&&document.body.dataset.stage==='playing'&&document.body.dataset.paused==='false');
  assert.equal((await data(pages[0])).resetId,pose.resetId);
  checks.push('Delayed-script native reload pauses both physics and eddy foam, then reconnects the fourth seat without checkpoint relocation');

  // Test crew selects ONLY real held keys. No position/velocity writes occur
  // after approach setup. This automation is not a human fairness study.
  const start=Date.now();let lastHeading,lastAt=Date.now(),lastLogged=0,success=false,maxForce=0;
  while(Date.now()-start<100000){
    const state=await data(pages[0]),p=state.position,q=state.rotation;
    assert.equal(state.condition,'afloat');assert.equal(state.resetId,pose.resetId);assert.equal(state.recovery,0);
    maxForce=Math.max(maxForce,...state.blades.map(blade=>blade.force));assert(maxForce<=420.001);
    const yaw=Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.x*q.x));
    const now=Date.now(),angular=lastHeading===undefined?0:Math.atan2(Math.sin(yaw-lastHeading),Math.cos(yaw-lastHeading))/((now-lastAt)/1000);
    const heading=Math.atan2(-p.x,394-p.z)-yaw,error=Math.atan2(Math.sin(heading),Math.cos(heading)),steering=error-angular*.8;
    const keys=[];if(Math.abs(error)<.5)keys.push('ArrowUp');if(Math.abs(steering)>.22)keys.push(steering>0?'ArrowLeft':'ArrowRight');
    if(now-lastLogged>1800){trace.push({seconds:(now-start)/1000,...state,keys});lastLogged=now;}
    if(Math.abs(p.x)<1.5&&p.z>391){success=true;break;}
    await controls(keys);lastHeading=yaw;lastAt=now;await delay(450);
  }
  await controls([]);assert(success,'Automated crew did not rejoin downstream: '+JSON.stringify(trace.at(-1)));
  const clients=await Promise.all(pages.map(page=>data(page)));
  for(const state of clients){assert.equal(state.condition,'afloat');assert.equal(state.resetId,pose.resetId);assert.equal(state.recovery,0);assert(state.strokes>0);assert(Math.abs(state.position.x)<2&&state.position.z>390);}
  await pages[0].screenshot({path:'evidence/rescue-rejoin.png'});
  checks.push('Four held-key paddles rejoin downstream; each seat records strokes, force stays capped, no crash/recovery teleport');

  for(const page of pages.slice(0,3)){await page.locator('#menu-button').click();await page.locator('#reset').click();}
  await pages[0].waitForFunction(old=>Number(document.body.dataset.resetId)>old,pose.resetId);
  const reset=await data(pages[0]);assert(Math.abs(reset.position.x)<.02&&Math.abs(reset.position.z-380)<1);
  checks.push('Ordinary three-seat checkpoint vote returns the crew to the unchanged canonical380m bay');
  assert.deepEqual(errors,[]);
  const result={result:'PASS',generatedUTC:new Date().toISOString(),protocol:health.protocol,physics:health.physics,browser:browser.version(),clients:4,checks,approach,exit:clients,maxForce,trace,errors,scope:'Automated browser/socket/current integration from one IPC-authored approach, native reload and real held-key steering. Not continuous human traversal, physical-device or FPS acceptance.'};
  await writeFile('evidence/rescue-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:result.result,physics:health.physics,clients:4,checks,seconds:(Date.now()-start)/1000,errors}));
}catch(error){await writeFile('evidence/rescue-browser.json',JSON.stringify({result:'FAIL',error:String(error),checks,trace,errors,serverOutput:output},null,2)+'\n');throw error;}
finally{await browser?.close();server.kill('SIGTERM');}
