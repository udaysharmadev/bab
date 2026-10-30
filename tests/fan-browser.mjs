import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const url=process.env.GAME_URL??'http://localhost:5173';
const browser=await chromium.launch({channel:'chrome',headless:true});
const contexts=[],pages=[],errors=[],checks=[],metrics=[];
const names=['Uday','Mira','Kabir','Anya'];
async function until(page,fn,arg){await page.waitForFunction(fn,arg,{timeout:10000});}
const fans=page=>page.evaluate(()=>JSON.parse(document.body.dataset.fans??'[]'));
try {
  for(let i=0;i<4;i++) {
    const context=await browser.newContext({viewport:i===0?{width:1280,height:900}:i===3?{width:390,height:844}:{width:700,height:480},hasTouch:i===3});
    contexts.push(context);const page=await context.newPage();pages.push(page);page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  }
  await pages[0].goto(url);await pages[0].locator('canvas').waitFor();await pages[0].waitForTimeout(250);
  await pages[0].screenshot({path:'evidence/fan-title.png'});
  await pages[0].locator('#play-friends').click();assert(await pages[0].locator('#name-dialog').isVisible());
  await pages[0].locator('#player-name').fill(names[0]);await pages[0].locator('#name-submit').click();await until(pages[0],()=>document.body.dataset.stage==='lobby');
  const invite=pages[0].url();
  for(let i=1;i<4;i++) {
    await contexts[i].addInitScript(()=>localStorage.setItem('bad-at-boating-name','Remembered'));
    await pages[i].goto(invite);await pages[i].locator('#name-dialog').waitFor({state:'visible'});
    assert.equal(await pages[i].locator('#player-name').inputValue(),'Remembered');
    assert(!(await pages[i].locator('#lobby').isVisible()),'Invite cannot skip name confirmation');
    await pages[i].locator('#player-name').fill(names[i]);await pages[i].locator('#name-submit').click();
    await until(pages[i],()=>document.body.dataset.stage==='lobby');
  }
  await until(pages[0],()=>document.querySelector('#crew-count').textContent==='4 / 4 aboard');
  for(let i=0;i<4;i++) {
    assert.equal(await pages[i].locator('.crew-label.mine').textContent(),'You');
    for(let j=0;j<4;j++)if(j!==i)assert((await pages[i].locator('#crew-labels').textContent()).includes(names[j]));
    assert.equal(await pages[i].locator('#ready').textContent(),'Ready');
  }
  const waterClip={x:560,y:220,width:160,height:70};
  const waterBefore=await pages[0].screenshot({clip:waterClip});
  const boatBefore=await pages[0].locator('canvas').getAttribute('data-raft-bounds');
  await pages[0].waitForTimeout(450);
  const waterAfter=await pages[0].screenshot({clip:waterClip});
  const boatAfter=await pages[0].locator('canvas').getAttribute('data-raft-bounds');
  assert(!waterBefore.equals(waterAfter),'Lobby water pixels must animate while authority is anchored');
  assert.notEqual(boatBefore,boatAfter,'Rendered lobby raft must bob rather than remain frozen');
  await writeFile('evidence/fan-lobby-water-before.png',waterBefore);await writeFile('evidence/fan-lobby-water-after.png',waterAfter);
  await pages[0].screenshot({path:'evidence/fan-lobby.png'});await pages[3].screenshot({path:'evidence/fan-mobile-lobby.png'});
  checks.push('Four native clients: required invite-name confirmation, own You/other names, explicit unready lobby');
  checks.push('Anchored lobby still animates real water pixels and rendered raft bob');
  for(const page of pages)await page.locator('#ready').click();
  await until(pages[0],()=>document.querySelectorAll('.tick').length===4);
  for(const page of pages)await until(page,()=>document.body.dataset.stage==='playing');
  checks.push('Four explicit Ready ticks and countdown launch');
  await pages[0].keyboard.down('Space');await pages[0].waitForTimeout(1750);
  const after=await fans(pages[0]);assert(after[0].strokes>=2);assert(after.slice(1).every(f=>f.strokes===0));
  await pages[0].keyboard.down('KeyD');await pages[0].waitForTimeout(700);await pages[0].keyboard.up('KeyD');
  await until(pages[0],()=>JSON.parse(document.body.dataset.fans)[0].slide>.26);
  await pages[0].screenshot({path:'evidence/fan-playing.png'});
  await pages[0].keyboard.up('Space');await pages[0].waitForTimeout(1000);
  const released=(await fans(pages[0]))[0];assert.equal(released.power,0);
  await pages[0].waitForTimeout(800);assert.equal((await fans(pages[0]))[0].strokes,released.strokes);
  checks.push('Space repeats only the owned fan; D moves the player within bounds; release stops repeat');
  await pages[0].locator('#menu-button').click();await pages[0].locator('#settings-dialog p').first().click();await pages[0].keyboard.down('Space');await pages[0].waitForTimeout(800);await pages[0].keyboard.up('Space');
  assert.equal((await fans(pages[0]))[0].strokes,released.strokes);await pages[0].locator('#resume').click();
  checks.push('Game menu blocks fan input');
  const button=pages[3].locator('[data-control=Space]'),bounds=await button.boundingBox();assert(bounds);
  const cdp=await contexts[3].newCDPSession(pages[3]);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}]});
  await pages[3].waitForTimeout(1100);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await pages[3].waitForTimeout(700);const touch=(await fans(pages[3]))[3];assert(touch.strokes>=1);assert.equal(touch.power,0);
  await pages[3].screenshot({path:'evidence/fan-mobile-playing.png'});checks.push('Real Chrome touch hold operates its fan; native touch cancellation releases it');
  await contexts[3].route('**/assets/main-*.js',async route=>{await new Promise(resolve=>setTimeout(resolve,1400));await route.continue();});
  const reload=pages[3].reload({waitUntil:'domcontentloaded'});
  await until(pages[0],()=>document.body.dataset.paused==='true');const frozen=await pages[0].getAttribute('body','data-tick');
  await pages[0].waitForTimeout(350);assert.equal(await pages[0].getAttribute('body','data-tick'),frozen);
  await reload;await until(pages[3],()=>document.body.dataset.stage==='playing'&&document.body.dataset.paused==='false');
  await until(pages[0],()=>document.body.dataset.paused==='false');await contexts[3].unroute('**/assets/main-*.js');
  assert.equal(await pages[3].getAttribute('body','data-seat'),'3');assert(!(await pages[3].locator('#name-dialog').isVisible()));
  assert((await fans(pages[3])).every(f=>f.power===0));checks.push('Actual page reload pauses the shared raft, restores the same named seat, and resumes without held fans');
  for(let i=0;i<4;i++){await pages[i].waitForTimeout(300);metrics.push({viewport:pages[i].viewportSize(),calls:Number(await pages[i].getAttribute('body','data-draw-calls')),triangles:Number(await pages[i].getAttribute('body','data-triangles'))});}
  assert(metrics.every(m=>m.calls>0&&m.calls<150&&m.triangles<250000),JSON.stringify(metrics));
  checks.push('Recorded desktop/phone scene counters stay below 150 calls and 250k triangles (not a device FPS certification)');
  assert.deepEqual(errors,[]);
  const result={result:'PASS',browser:browser.version(),checks,metrics,errors};await writeFile('evidence/fan-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(error){await writeFile('evidence/fan-browser-failure.json',JSON.stringify({error:String(error),checks,metrics,errors},null,2)+'\n');for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:`evidence/fan-failure-${i}.png`}).catch(()=>{});throw error;}
finally{await browser.close();}
