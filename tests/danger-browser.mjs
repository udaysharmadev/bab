import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}});let browser;const results=[],errors=[];
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:960}});
 page.on('pageerror',e=>errors.push(e.message));
 for(const view of ['crew','spikes','log','boulders'])for(const low of [false,true]){
  await page.goto(`http://127.0.0.1:5174/tests/graphics.html?view=${view}${low?'&low':''}`);await page.waitForFunction(()=>Number(document.body.dataset.frames)>15);
  const result=await page.evaluate(async()=>{
   const world=await import('/src/shared/world.ts'),s=window.scene,checks=[];
   for(const phase of [3.725,27.5,119.999]){
    s.setSnapshot({...s.snapshot,hazardPhase:phase,paused:true});s.render(.016,8);
    const errors=s.sweepers.map((log,i)=>log.position.distanceTo(new log.position.constructor(...Object.values(world.sampleSweeper(s.snapshot.tick/60+phase,world.SWEEPERS[i])))));
    for(const [wheel,sample] of [[s.wheel,world.sampleWaterwheel],[s.wheel2,world.sampleWaterwheel2]]){const q=sample(s.snapshot.tick/60+phase);errors.push(Math.abs(1-Math.abs(wheel.quaternion.x*q.x+wheel.quaternion.w*q.w)));}
    checks.push({phase,maxError:Math.max(...errors)});
   }
   return {checks,stats:JSON.parse(s.renderer.domElement.dataset.renderInfo)};
  });
  assert(result.checks.every(c=>c.maxError<1e-7));
  await page.screenshot({path:`evidence/danger-${view}-${low?'low':'high'}.png`});results.push({view,low,...result});
 }
 assert.deepEqual(errors,[]);await writeFile('evidence/danger-browser.json',JSON.stringify({result:'PASS',results,errors,scope:'Eight native authored High/Low views and three mover phases each. Human instant-danger recognition remains a playtest gate.'},null,2));console.log('PASS:8 High/Low danger views;24 phased mover comparisons.');
}finally{await browser?.close();await server.close();}
