import {confirmName} from './support/name.mjs';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {Client} from '@colyseus/sdk';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const server=await createServer({server:{host:'127.0.0.1',port:5179,strictPort:true}});
const base=process.env.GAME_URL??'http://localhost:2571',checks=[],errors=[],members=[];
let browser;
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5179/tests/audio.html');
 await page.waitForFunction(()=>document.body.dataset.result||document.body.dataset.error);
 assert.equal(await page.locator('body').getAttribute('data-error'),null);
 const pcm=JSON.parse(await page.locator('body').getAttribute('data-result')),s=pcm.scenarios;
 assert(pcm.audible.rms>.001&&pcm.audible.peak<1&&pcm.audible.left>pcm.audible.right);
 assert.equal(pcm.muted.peak,0);
 for(const name of ['dock','drift','row','rapids','port','starboard']){
  assert(s[name].whole.rms>.0001&&s[name].whole.peak<1,`${name}: bounded audible PCM`);
  assert(s[name].whole.stereoDifference>.0001,`${name}: stereo field`);
  assert.deepEqual(s[name].resources,{ambientLayers:7,activeVoices:0});
 }
 assert(s.row.whole.rms>s.drift.whole.rms*1.1,'Relative hull wash adds audible energy');
 assert(s.rapids.whole.rms>s.drift.whole.rms*1.1,'Rapids differ from a quiet drift');
 assert(s.port.whole.left>s.port.whole.right*1.01,'Port brace is on the port speaker');
 assert(s.starboard.whole.right>s.starboard.whole.left*1.01,'Starboard brace is on the starboard speaker');
 assert(s.quiet.whole.rms<s.drift.whole.rms*.35&&s.quiet.whole.rms>s.drift.whole.rms*.15);
 checks.push('Actual stereo PCM: dock, drift, rowing, rapids and left/right immersed brace layers; volume scales output');
 for(const name of ['muted','paused','wreck','complete','inaudible','disabled','clear'])assert(s[name].tail.peak<.00001,`${name}: silence after bounded fade`);
 checks.push('Actual PCM silence after pause, wreck, completion, mute, menu/visibility gate and clear');
 assert(pcm.stress.peakVoices<=24&&pcm.stress.peakVoices>0);assert(pcm.stress.peak<1,JSON.stringify(pcm.stress));
 assert.deepEqual(pcm.stress.resources,{ambientLayers:7,activeVoices:0});
 checks.push('200 overlapping break requests stay within 24 voices, do not clip and release all ended source graphs');
 if(process.env.AUDIO_OFFLINE_ONLY!=='1'){
  await page.addInitScript(()=>{
   localStorage.setItem('bad-at-boating-name','Audio Tester');
   // Observe actual native output without changing the game's signal path.
   const Native=window.AudioContext;window.AudioContext=class extends Native{
    createWaveShaper(){const node=super.createWaveShaper();window.audioProbe=this.createAnalyser();node.connect(window.audioProbe);return node;}
   };
   window.audioRms=()=>{const a=window.audioProbe;if(!a)return 0;const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((sum,v)=>sum+v*v,0)/data.length);};
  });
  const health=await fetch(`${base}/health`).then(r=>r.json()),sdk=new Client(base.replace(/^http/,'ws'));
  const options={protocol:health.protocol,physics:health.physics,mode:'friends'};
  for(let i=0;i<3;i++){
   const room=i?await sdk.joinById(members[0].roomId,options):await sdk.create('boat',options);
   for(const type of ['seat','snapshot','voyage'])room.onMessage(type,()=>{});members.push(room);
  }
  await page.goto(`${base}/?crew=${members[0].roomId}`);await page.waitForFunction(()=>document.body.dataset.seat==='3');
  await confirmName(page);
  await page.locator('#ready').click();await page.waitForFunction(()=>document.body.dataset.audioState==='running'&&window.audioRms()>.0001);
  await page.locator('#menu-button').click();await page.waitForFunction(()=>window.audioRms()<.00001);
  await page.getByLabel('Sound effects').uncheck();
  await page.getByLabel('Sound volume').evaluate(input=>{input.value='.3';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#resume').click();await page.waitForFunction(()=>window.audioRms()<.00001);
  await page.reload();await page.waitForFunction(()=>document.body.dataset.seat==='3');
  await page.locator('#menu-button').click();
  assert.equal(await page.getByLabel('Sound effects').isChecked(),false);
  assert.equal(await page.getByLabel('Sound volume').inputValue(),'0.3');
  await page.getByLabel('Sound effects').check();await page.locator('#resume').click();
  await page.waitForFunction(()=>window.audioRms()>.0001);
  checks.push('Built game unlocks on a real gesture; menu silences native output and mute/volume persist across same-seat reload');
  members.forEach(room=>room.send('ready',true));await page.locator('#ready').click();
  await page.waitForFunction(()=>document.body.dataset.stage==='playing');
  await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');
  await page.waitForFunction(()=>Number(document.body.dataset.audioCues)>0&&window.audioRms()>.0001);
  await page.locator('#menu-button').click();await page.waitForFunction(()=>window.audioRms()<.00001);
  await page.locator('#resume').click();await page.waitForFunction(()=>window.audioRms()>.0001);
  checks.push('Real authority launch/rowing produces sound; playing menu fade and resume restore native output');
  const beforeVisibility=Number(await page.locator('body').getAttribute('data-audio-cues'));
  await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(()=>window.audioRms()<.00001);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>window.audioRms()>.0001);
  assert.equal(Number(await page.locator('body').getAttribute('data-audio-cues')),beforeVisibility);
  checks.push('Synthetic visibility transition exercises the built visibility gate and restores native output without replaying strokes');
  const token=members[0].reconnectionToken;members[0].reconnection.enabled=false;members[0].connection.close();
  await page.waitForFunction(()=>document.body.dataset.paused==='true'&&window.audioRms()<.00001);
  members[0]=await sdk.reconnect(token);for(const type of ['seat','snapshot','voyage'])members[0].onMessage(type,()=>{});
  await page.waitForFunction(()=>document.body.dataset.paused==='false'&&window.audioRms()>.0001);
  assert.equal(Number(await page.locator('body').getAttribute('data-audio-cues')),beforeVisibility);
  checks.push('Actual peer transport loss pauses and fades water output; same-seat reconnect resumes ambience');
 }
 assert.deepEqual(errors,[]);
 const report={result:'PASS',browser:browser.version(),automated:true,humanListening:false,base,checks,pcm,errors};
 await writeFile('evidence/audio.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await Promise.allSettled(members.map(room=>{room.reconnection.enabled=false;return room.leave();}));await server.close();}
