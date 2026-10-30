import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

const url=process.env.GAME_URL??'http://localhost:2571/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],views=[],checks=[];
const context=await browser.newContext();
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const sizes=[[1440,900],[1920,1080],[1280,900],[703,857],[390,844],[320,568],[768,1024],[907,510],[667,375],[568,320]];
try {
  await page.goto(url);
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.titleFit);
  for(const [width,height] of sizes) {
    await page.setViewportSize({width,height});await page.waitForTimeout(250);
    const layout=await page.evaluate(()=>{
      const rect=id=>document.querySelector(id).getBoundingClientRect().toJSON();
      return {brand:rect('.title-brand'),stage:rect('#title-stage'),actions:rect('.title-actions'),
        fit:JSON.parse(document.querySelector('canvas').dataset.titleFit),
        scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight};
    });
    for(const key of ['brand','stage','actions']) {
      const r=layout[key];assert(r.width>0&&r.height>0,`${width}x${height} empty ${key}`);
      assert(r.left>=-1&&r.right<=width+1&&r.top>=-1&&r.bottom<=height+1,`${width}x${height} clipped ${key}`);
    }
    const {fit,stage,brand,actions}=layout;
    assert(fit.left>=stage.left&&fit.right<=stage.right&&fit.top>=stage.top&&fit.bottom<=stage.bottom,`Raft outside stage ${width}x${height}`);
    const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    assert(!overlap(fit,brand)&&!overlap(fit,actions),`Raft overlaps menu ${width}x${height}`);
    assert((fit.right-fit.left)>Math.min(stage.width,stage.height)*.65,`Raft too small ${width}x${height}`);
    assert(layout.scrollWidth<=width&&layout.scrollHeight<=height,`Page scrolls ${width}x${height}`);
    const image=`evidence/fan-landing-${width}x${height}.png`;await page.screenshot({path:image});
    views.push({width,height,...layout,image});
  }
  checks.push('10 desktop, phone, tablet and short-landscape layouts: brand/actions fit, actual initial raft silhouette fits its stage, no menu overlap or page overflow');
  await page.setViewportSize({width:703,height:857});await page.waitForTimeout(250);
  const before=await page.screenshot();await page.waitForTimeout(450);const after=await page.screenshot();
  assert(!before.equals(after),'Title scene must animate');
  checks.push('Actual title pixels change with animated water, raft and fanning crew');
  const metrics=await page.evaluate(()=>({calls:Number(document.body.dataset.drawCalls),triangles:Number(document.body.dataset.triangles)}));
  assert(metrics.calls>0&&metrics.calls<150&&metrics.triangles<250000,JSON.stringify(metrics));
  await page.locator('#play-friends').focus();await page.keyboard.press('Enter');
  assert(await page.locator('#name-dialog').isVisible());assert(await page.locator('#player-name').evaluate(el=>el===document.activeElement));
  await page.locator('#cancel-name').click();assert(await page.locator('#title-screen').isVisible());
  await page.locator('#practice').click();assert(await page.locator('#name-dialog').isVisible());
  await page.locator('#player-name').fill('Landing Pilot');await page.locator('#name-submit').click();
  await page.waitForFunction(()=>document.body.dataset.stage==='playing');
  assert(!(await page.locator('#title-screen').isVisible()));
  assert.equal(await page.locator('.crew-label.mine').textContent(),'You');
  const gameBounds=JSON.parse(await page.locator('canvas').getAttribute('data-raft-bounds'));
  assert(gameBounds.left>0&&gameBounds.right<1&&gameBounds.top>0&&gameBounds.bottom<1,'Title camera offset must clear on joining');
  await page.screenshot({path:'evidence/fan-landing-to-game.png'});
  await page.locator('#menu-button').click();await page.locator('#leave').click();
  await page.waitForFunction(()=>!new URLSearchParams(location.search).has('raft')&&document.querySelector('#title-screen')?.hidden===false);
  await page.locator('#play-friends').click();assert.equal(await page.locator('#player-name').inputValue(),'Landing Pilot');
  assert(await page.locator('#name-dialog').isVisible());await page.locator('#cancel-name').click();
  checks.push('Keyboard Enter opens focused name confirmation; practice also asks for name; joining clears title framing; leaving restores title; remembered name still needs confirmation');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.titleFit);await page.waitForTimeout(250);
  const still=await page.screenshot();await page.waitForTimeout(350);
  assert(still.equals(await page.screenshot()),'Reduced-motion title should be still');
  checks.push('Reduced-motion preference freezes decorative title animation');
  assert.deepEqual(errors,[]);
  const result={result:'PASS',browser:browser.version(),checks,views,metrics,errors};
  await writeFile('evidence/fan-landing.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:result.result,browser:result.browser,checks,views:views.length,metrics,errors},null,2));
}catch(error){await page.screenshot({path:'evidence/fan-landing-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();}
