import {confirmName} from './support/name.mjs';
import {fork} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@colyseus/sdk';
import {chromium} from 'playwright';

const base='http://127.0.0.1:2585',checks=[],errors=[],members=[],layouts=[];
const server=fork('build/server.mjs',[],{env:{...process.env,PORT:'2585',BOAT_SAVE_DB:':memory:',BOAT_DIST_DIR:'dist'},silent:true});
let output='',browser,health;
server.stdout.on('data',data=>output+=data);server.stderr.on('data',data=>output+=data);
try{
  for(let tries=0;tries<100;tries++){
    try{health=await fetch(base+'/health').then(response=>response.json());break;}catch{await delay(50);}
  }
  assert(health,'Isolated built server did not start: '+output);
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:480,height:900},hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
  await page.addInitScript(()=>{localStorage.setItem('bad-at-boating-name','River Tester');
    window.testPad={connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});
  });
  const tips=()=>page.locator('canvas').getAttribute('data-dock-paddles').then(JSON.parse);
  const authority=()=>page.evaluate(()=>Object.fromEntries(['tick','position','rotation','blades','ack','strokes','resetId'].map(key=>[key,document.body.dataset[key]])));
  const wet=()=>page.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.dockPaddles)[0][1]<-.2);
  const raised=()=>page.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.dockPaddles)[0][1]>.61);
  const stationary=async expected=>{assert.deepEqual(await authority(),expected);};
  await page.goto(base);await page.getByRole('button',{name:'Play with Friends',exact:true}).click();
  await page.waitForFunction(()=>document.body.dataset.stage==='lobby'&&!!document.querySelector('canvas').dataset.dockPaddles);
  await confirmName(page);
  const ids=await page.locator('[id]').evaluateAll(elements=>elements.map(el=>el.id));assert.equal(new Set(ids).size,ids.length,'Page IDs must be unique');
  const initial=await authority(),rest=await tips();
  await page.keyboard.down('ArrowUp');await wet();
  const moving=await tips();assert.notDeepEqual(moving[0],rest[0]);assert.deepEqual(moving.slice(1),rest.slice(1));
  await stationary(initial);assert.match(await page.locator('#dock-hint').textContent(),/Bow · Port/);
  await page.screenshot({path:'evidence/onboarding-dock-portrait.png'});
  await page.keyboard.up('ArrowUp');await raised();
  checks.push('Own rendered paddle catches and recovers at the dock; other three paddles, authority tick/pose/blades/acks/strokes/reset remain unchanged');

  await page.keyboard.down('ArrowUp');await wet();await page.locator('#menu-button').click();await raised();
  await page.locator('#resume').click();
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',key:'ArrowUp',repeat:true,bubbles:true})));
  await delay(1200);assert.equal((await tips())[0][1],.62);
  await page.keyboard.up('ArrowUp');await page.keyboard.down('ArrowUp');await wet();await page.keyboard.up('ArrowUp');await raised();
  checks.push('Menu clears the preview; a held keyboard auto-repeat cannot reactivate it; a fresh press can');

  await page.locator('#menu-button').click();await page.locator('#show-controls').click();
  await page.locator('[data-bind=forward]').click();await page.keyboard.press('i');
  assert.match(await page.locator('#settings-controls-note').textContent(),/Hold I\/↑/);
  await page.getByRole('button',{name:'Close controls',exact:true}).click();
  assert.match(await page.locator('#paddle-controls-note').textContent(),/Hold I\/↑ forward/);
  await page.keyboard.down('w');await delay(1000);assert.equal((await tips())[0][1],.62);await page.keyboard.up('w');
  await page.keyboard.down('i');await wet();await page.keyboard.up('i');await raised();
  checks.push('Remapped key rows at the dock, replaced default stays inactive and waiting-dock guidance reflects the mapping');

  await page.evaluate(()=>{window.testPad.axes=[0,-1];});await wet();
  await page.locator('#menu-button').click();await raised();await page.locator('#resume').click();
  await delay(1200);assert.equal((await tips())[0][1],.62);
  await page.evaluate(()=>{window.testPad.axes=[0,0];});await delay(150);
  await page.evaluate(()=>{window.testPad.axes=[0,-1];});await wet();
  await page.evaluate(()=>{window.testPad.axes=[0,0];});await raised();
  checks.push('Standard Gamepad API rehearses the assigned paddle and requires neutral after release (simulated hardware)');

  const touch=await page.context().newCDPSession(page),button=await page.locator('#touch-controls [data-key=KeyW]').boundingBox();
  assert(button,'Touch controls must be visible at the waiting dock');
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});await wet();
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await raised();
  for(const viewport of [{width:480,height:900},{width:390,height:700},{width:907,height:510},{width:640,height:400},{width:1440,height:960}]){
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const layout=await page.evaluate(()=>{
      const lobby=document.querySelector('#lobby').getBoundingClientRect(),touch=document.querySelector('#touch-controls').getBoundingClientRect();
      return {lobby:{top:lobby.top,bottom:lobby.bottom,right:lobby.right},touch:{top:touch.top,bottom:touch.bottom},height:innerHeight,width:innerWidth,bounds:JSON.parse(document.querySelector('canvas').dataset.boatBounds)};
    });
    assert(layout.lobby.top>=0&&layout.touch.bottom<=layout.height&&layout.lobby.bottom<=layout.touch.top,JSON.stringify(layout));
    if(viewport.width>viewport.height)assert(layout.bounds.left*layout.width>layout.lobby.right+8,'The whole boat/paddle envelope must stay beside the waiting card: '+JSON.stringify(layout));
    else assert(layout.bounds.bottom*layout.height<layout.lobby.top,'The boat/paddles must stay above the portrait waiting card: '+JSON.stringify(layout));
    layouts.push({...viewport,...layout});
    await page.screenshot({path:`evidence/onboarding-dock-${viewport.width}.png`});
  }
  await page.setViewportSize({width:480,height:900});await stationary(initial);
  checks.push('Real touch press/release drives local rehearsal; portrait and short touch layouts keep lobby/actions and touch controls separate');

  await page.keyboard.down('ArrowUp');await wet();
  await page.locator('canvas').evaluate(canvas=>{window.contextLoss=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');window.contextLoss.loseContext();});
  await page.locator('#graphics-recovery').waitFor({state:'visible'});await page.keyboard.up('ArrowUp');
  await page.evaluate(()=>window.contextLoss.restoreContext());await page.locator('#graphics-recovery').waitFor({state:'hidden'});await raised();
  await page.keyboard.down('ArrowUp');await wet();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await raised();
  await page.keyboard.up('ArrowUp');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await stationary(initial);
  checks.push('Native WebGL loss/restoration and blur release the dock preview without changing the authority');

  const sdk=new Client(base.replace(/^http/,'ws')),invite=new URL(page.url()).searchParams.get('crew');
  let peerSnapshot;
  for(let i=0;i<3;i++){
    const member=await sdk.joinById(invite,{protocol:health.protocol,physics:health.physics,mode:'friends'});
    member.onMessage('seat',()=>{});member.onMessage('voyage',()=>{});member.onMessage('snapshot',snapshot=>{peerSnapshot=snapshot;});members.push(member);
  }
  await page.waitForFunction(()=>document.querySelectorAll('.crew-seat.connected').length===4);
  const fullDock=await authority();
  for(const key of ['tick','position','rotation','ack','strokes','resetId'])assert.equal(fullDock[key],initial[key]);
  assert.deepEqual(JSON.parse(fullDock.blades).map(({x,y,z})=>[x,y,z]),rest,'Joining enables seats but must not move their blades');
  members.forEach(member=>member.send('ready',true));
  await page.keyboard.down('ArrowUp');await wet();await page.locator('#ready').click();
  await page.locator('#lobby-countdown').waitFor({state:'visible'});await raised();
  assert.match(await page.locator('#dock-hint').textContent(),/Release your controls/);
  members[0].send('ready',false);await page.locator('#lobby-countdown').waitFor({state:'hidden'});
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',key:'ArrowUp',repeat:true,bubbles:true})));
  await delay(1000);assert.equal((await tips())[0][1],.62);await stationary(fullDock);
  assert.equal(peerSnapshot.tick,0);assert(peerSnapshot.strokes.every(value=>value===0));assert(peerSnapshot.ack.every(value=>value===0));
  await page.keyboard.up('ArrowUp');await page.keyboard.down('ArrowUp');await wet();
  members[0].send('ready',true);await page.locator('#lobby-countdown').waitFor({state:'visible'});await raised();
  await page.waitForFunction(()=>document.body.dataset.stage==='playing');
  await delay(1800);assert.equal(await page.locator('body').getAttribute('data-strokes'),'0');
  assert.equal(await page.locator('canvas').getAttribute('data-dock-paddles'),null);
  assert(await page.locator('#lobby').isHidden());assert(await page.locator('#dock-hint').isHidden());
  await page.keyboard.up('ArrowUp');await page.keyboard.down('ArrowUp');
  await page.waitForFunction(()=>Number(document.body.dataset.strokes)>=1);await page.keyboard.up('ArrowUp');
  checks.push('Four-ready countdown cancels rehearsal; cancel/restart and launch do not leak held input; a fresh in-game press produces an authoritative stroke');
  assert.deepEqual(errors,[]);
  const result={result:'PASS',generatedUTC:new Date().toISOString(),protocol:health.protocol,physics:health.physics,browser:browser.version(),checks,layouts,frozenDock:initial,errors,scope:'Automated built-client local rehearsal and lifecycle checks. Does not teach/measure hull response or substitute for genuine newcomer/physical-device acceptance; genuine newcomer/device acceptance remains open.'};
  await writeFile('evidence/onboarding.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(error){await writeFile('evidence/onboarding.json',JSON.stringify({result:'FAIL',error:String(error),checks,errors,serverOutput:output},null,2)+'\n');throw error;}
finally{await browser?.close();await Promise.allSettled(members.map(member=>{member.reconnection.enabled=false;return member.leave();}));server.kill('SIGTERM');}
