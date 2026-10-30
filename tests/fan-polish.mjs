import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const url=process.env.GAME_URL??'http://localhost:2572/';
const until=fn=>page.waitForFunction(fn,null,{timeout:12000});
try {
  await page.goto(url);await page.locator('#play-friends').waitFor();await page.keyboard.press('Tab');
  assert(await page.locator('#play-friends').evaluate(el=>el===document.activeElement),'Keyboard menu starts at the primary action, not the decorative canvas');
  await page.locator('#practice').click();await page.locator('#player-name').fill('Fan Student');await page.locator('#name-submit').click();
  await until(()=>document.body.dataset.stage==='playing'&&document.body.dataset.lessonStep==='0');
  assert(await page.locator('#lesson').isVisible());assert.equal(await page.locator('#fan-feedback').textContent(),'Ready');
  await page.keyboard.down('Space');await until(()=>document.body.dataset.fanFeedback==='push');
  await page.screenshot({path:'evidence/fan-polish-stroke.png'});await page.keyboard.up('Space');
  await until(()=>document.body.dataset.lessonStep==='1');
  await until(()=>document.body.dataset.fanFeedback==='coast');
  await page.keyboard.down('KeyD');await page.waitForTimeout(500);await page.keyboard.up('KeyD');
  await until(()=>JSON.parse(document.body.dataset.fans)[2].slide>.15);
  await page.keyboard.down('Space');await until(()=>document.body.dataset.lessonStep==='2');await page.keyboard.up('Space');
  await until(()=>document.body.dataset.lessonStep==='3');
  assert.equal(await page.locator('#fan-feedback').textContent(),'Ready');
  assert((await page.locator('#lesson').textContent()).includes('You’ve got it'));
  checks.push('Actual owned Space stroke → visible push/recovery/glide, A/D offset powered stroke → released settled rest completes all practice steps');
  await page.screenshot({path:'evidence/fan-polish-lesson-complete.png'});
  await page.locator('#menu-button').click();assert(!(await page.locator('#play-hint').isVisible()));assert(!(await page.locator('#lesson').isVisible()));
  await page.locator('#reset').click();
  await until(()=>document.body.dataset.lessonStep==='0');
  await page.waitForTimeout(500);assert.equal(await page.getAttribute('body','data-lesson-step'),'0','Retained flap counters must not skip the lesson after retry');
  assert((await page.evaluate(()=>JSON.parse(document.body.dataset.fans)[2].strokes))>=2);
  checks.push('Menu hides control/lesson overlays; checkpoint retry resets the lesson without mistaking prior flap counts for new input');
  const layouts=[];
  for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:907,height:510}]) {
  await page.setViewportSize(viewport);await page.waitForTimeout(300);
  const layout=await page.evaluate(()=>{
    const rect=id=>document.querySelector(id).getBoundingClientRect().toJSON();
    return {hud:rect('#run-hud'),lesson:rect('#lesson'),controls:rect('#play-hint'),raft:JSON.parse(document.querySelector('canvas').dataset.raftBounds)};
  });
  assert(layout.lesson.top>=layout.hud.bottom+4);assert(layout.controls.bottom<=viewport.height);
  const b={left:layout.raft.left*viewport.width,right:layout.raft.right*viewport.width,top:layout.raft.top*viewport.height,bottom:layout.raft.bottom*viewport.height};
  const overlaps=(a,c)=>a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top;
  assert(!overlaps(layout.controls,b),`Controls must not cover the raft at ${viewport.width}x${viewport.height}`);
  assert(!overlaps(layout.controls,layout.hud),'Feedback must not cover the HUD');
  await page.screenshot({path:`evidence/fan-polish-practice-${viewport.width}.png`});layouts.push({viewport,...layout});
  }
  checks.push('Touch-enabled desktop, phone and short landscape: lesson below HUD; feedback does not cover the projected raft or HUD');
  await page.locator('#menu-button').click();await page.locator('#low-graphics').check();await page.locator('#resume').click();await page.waitForTimeout(1100);
  await page.screenshot({path:'evidence/fan-polish-practice-low.png'});assert.deepEqual(errors,[]);
  const result={result:'PASS',browser:browser.version(),checks,layouts,errors};
  await writeFile('evidence/fan-polish-native.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(error){await page.screenshot({path:'evidence/fan-polish-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();}
