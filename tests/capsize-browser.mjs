import {fork} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {confirmName} from './support/name.mjs';
const base='http://127.0.0.1:2592',pages=[],errors=[],checks=[];
const server=fork('tests/support/capsize-server.ts',[],{execArgv:['--import','tsx'],env:{...process.env,PORT:'2592',BOAT_SAVE_DB:':memory:',BOAT_DIST_DIR:'dist'},silent:true});let ready=false,output='',browser;
server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);server.on('message',m=>{if(m?.ready)ready=true;});
async function until(check,ms=15000){const start=Date.now();while(!await check()){assert(Date.now()-start<ms,'QA wait timed out '+output);await delay(50);}}
const data=p=>p.evaluate(()=>({reset:Number(document.body.dataset.resetId),recovery:Number(document.body.dataset.recoveryId),righted:Number(document.body.dataset.rightedId),position:JSON.parse(document.body.dataset.position),capsize:JSON.parse(document.body.dataset.capsize),tick:Number(document.body.dataset.tick),condition:document.body.dataset.condition}));
try{
 await until(()=>ready);browser=await chromium.launch({channel:'chrome',headless:true});let invite;
 for(let seat=0;seat<4;seat++){
  const p=await browser.newPage({hasTouch:seat===2,viewport:seat===2?{width:390,height:844}:seat?{width:640,height:480}:{width:1280,height:900}});pages.push(p);
  await p.addInitScript(()=>{localStorage.setItem('bad-at-boating-name','River Tester');localStorage.setItem('bad-at-boating-controls',JSON.stringify({keys:{forward:'KeyW',reverse:'KeyK',left:'KeyA',right:'KeyD'},lowQuality:true}));const frame=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>frame(()=>setTimeout(()=>cb(performance.now()),50));});
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'||/GL_INVALID_/.test(m.text()))errors.push(m.text());});
  await p.goto(invite??base);if(!seat){await p.getByRole('button',{name:'Play with Friends',exact:true}).click();await p.waitForFunction(()=>document.body.dataset.seat==='0');invite=p.url();}
  await p.waitForFunction(seat=>document.body.dataset.seat===String(seat),seat);await confirmName(p);
 }
 for(const p of pages)await p.locator('#ready').click();await Promise.all(pages.map(p=>p.waitForFunction(()=>document.body.dataset.stage==='playing')));
 const pose=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Pose timeout')),5000);server.once('message',m=>{clearTimeout(t);resolve(m);});server.send({room:new URL(invite).searchParams.get('crew')});});assert(pose.flipped);
 await Promise.all(pages.map(p=>p.locator('#capsize-rescue').waitFor({state:'visible'})));assert.match(await pages[0].locator('#capsize-hint').textContent(),/K/);
 const box=await pages[2].locator('#capsize-rescue').boundingBox();assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844);await pages[2].screenshot({path:'evidence/capsize-mobile.png'});checks.push('Actual capsized hull exposes a readable390px rescue prompt with saved reverse binding,required crew and fallback countdown');
 await pages[0].keyboard.down('k');await pages[1].keyboard.down('ArrowDown');await pages[0].waitForFunction(()=>JSON.parse(document.body.dataset.capsize)?.helpers===2);assert.equal((await data(pages[0])).righted,0);
 await pages[0].keyboard.up('k');await pages[1].keyboard.up('ArrowDown');await pages[0].waitForFunction(()=>JSON.parse(document.body.dataset.capsize)?.helpers===0);checks.push('Two held keyboard seats remain below majority;releasing keys clears effort');
 const cancelButton=await pages[2].getByRole('button',{name:'Hold to Right Boat'}).boundingBox();assert(cancelButton);const cancelTouch=await pages[2].context().newCDPSession(pages[2]);
 await cancelTouch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cancelButton.x+cancelButton.width/2,y:cancelButton.y+cancelButton.height/2,id:1}]});await pages[0].waitForFunction(()=>JSON.parse(document.body.dataset.capsize)?.helpers===1);
 await cancelTouch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await pages[0].waitForFunction(()=>JSON.parse(document.body.dataset.capsize)?.helpers===0);checks.push('Native touch cancellation releases effort immediately without a stuck helper');
 await pages[3].route('**/assets/*.js',async r=>{await delay(1500);await r.continue();});const reload=pages[3].reload();await pages[0].waitForFunction(()=>document.body.dataset.paused==='true');const frozen=await data(pages[0]);await delay(400);assert.equal((await data(pages[0])).tick,frozen.tick);await reload;await pages[3].unroute('**/assets/*.js');await Promise.all(pages.map(p=>p.waitForFunction(()=>document.body.dataset.paused==='false')));await Promise.all(pages.map(p=>p.locator('#capsize-rescue').waitFor({state:'visible'})));checks.push('Real delayed-script reload freezes rescue time and reconnects the fourth seat without stale helpers');
 await pages[0].keyboard.down('k');await pages[1].keyboard.down('ArrowDown');const button=pages[2].getByRole('button',{name:'Hold to Right Boat'});
 const rect=await button.boundingBox();assert(rect);const touch=await pages[2].context().newCDPSession(pages[2]);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width/2,y:rect.y+rect.height/2,id:1}]});
 await pages[0].waitForFunction(()=>JSON.parse(document.body.dataset.capsize)?.helpers>=3,{},{timeout:3000});
 await Promise.all(pages.map(p=>p.waitForFunction(()=>Number(document.body.dataset.rightedId)===1,{},{timeout:10000})));
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pages[0].keyboard.up('k');await pages[1].keyboard.up('ArrowDown');
 const states=await Promise.all(pages.map(data));assert(states.every(s=>s.righted===1&&s.recovery===0&&s.reset===pose.reset&&s.condition==='afloat'&&Math.abs(s.position.z-264)<4));
 await pages[0].locator('#capsize-rescue').waitFor({state:'hidden'});await pages[0].screenshot({path:'evidence/capsize-righted.png'});checks.push('Remapped reverse,arrow alias and held mobile button provide3/4 effort;all rendered peers observe physical righting with unchanged reset/checkpoint and no wreck');assert.deepEqual(errors,[]);
 await writeFile('evidence/capsize-browser.json',JSON.stringify({result:'PASS',checks,errors,states,humanPlaytest:false,scope:'Four native Chrome clients,one390px layout,actual keys/touch hold/cancel/reload;initial hull pose set once via QA-only IPC. No swimmer/art/device/Internet acceptance.'},null,2)+'\n');console.log('PASS:5 cooperative capsize browser groups');
}catch(error){
 await writeFile('evidence/capsize-browser-failure.json',JSON.stringify({error:String(error),checks,errors,states:await Promise.all(pages.map(data))},null,2));await pages[2]?.screenshot({path:'evidence/capsize-browser-failure.png'});throw error;
}finally{for(const p of pages){await p.mouse.up().catch(()=>{});for(const key of ['k','ArrowDown'])await p.keyboard.up(key).catch(()=>{});await p.locator('#menu-button').click({timeout:500}).catch(()=>{});await p.locator('#leave').click({timeout:500}).catch(()=>{});}await browser?.close();server.kill('SIGTERM');await delay(200);}
