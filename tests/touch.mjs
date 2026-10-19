import {chromium} from 'playwright';
import {Client} from '@colyseus/sdk';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.GAME_URL??'http://localhost:2569';
const health=await fetch(`${base}/health`).then(r=>r.json());
const browser=await chromium.launch({channel:'chrome',headless:true});
const crew=[],errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:480,height:900},hasTouch:true,isMobile:true});
 page.on('pageerror',e=>errors.push(e.message));
 const sdk=new Client(base.replace(/^http/,'ws'));const options={protocol:health.protocol,physics:health.physics,mode:'friends'};
 for(let i=0;i<3;i++){
  const r=i?await sdk.joinById(crew[0].roomId,options):await sdk.create('boat',options);crew.push(r);
  for(const type of ['seat','snapshot','voyage'])r.onMessage(type,()=>{});
 }
 await page.goto(`${base}/?crew=${crew[0].roomId}`);await page.waitForFunction(()=>document.body.dataset.seat==='3');
 assert.equal(await page.locator('#touch-controls').isVisible(),false);
 await page.locator('#menu-button').click();await page.getByLabel('Lower graphics').check();await page.locator('#resume').click();
 crew.forEach(r=>r.send('ready',true));await page.locator('#ready').click();await page.waitForFunction(()=>document.body.dataset.stage==='playing');
 const cdp=await page.context().newCDPSession(page);
 for(const key of ['KeyW','KeyA','KeyS','KeyD']){
  const box=await page.locator(`#touch-controls [data-key=${key}]`).boundingBox();assert(box);
  const before=Number(await page.locator('body').getAttribute('data-strokes'));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
  await page.waitForFunction(before=>Number(document.body.dataset.strokes)>=before+2,before);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(250);
  assert.equal(JSON.parse(await page.locator('body').getAttribute('data-blades'))[3].immersion,0);
  checks.push(`${key}: native held touch repeats strokes and releases blade`);
 }
 await page.locator('#menu-button').click();const count=Number(await page.locator('body').getAttribute('data-strokes'));
 await page.waitForTimeout(1800);assert.equal(Number(await page.locator('body').getAttribute('data-strokes')),count);
 checks.push('Menu releases touch input; lobby hides controls');
 assert.deepEqual(errors,[]);
 const result={result:'PASS',automated:true,humanPlaytest:false,base,checks,errors};
 await writeFile('evidence/touch.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();await Promise.allSettled(crew.map(r=>r.leave()));}
