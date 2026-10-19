import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server = await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}});
const errors=[],results=[];
const noRefraction = process.env.NO_REFRACTION === '1';
let browser;
try {
  await server.listen();
  browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:960}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text())});
  const views=process.env.NATURE_ONLY ? ['shore','trees','grass','shore&low'] : ['crew','underside','spikes','log','vortex','vortex&low','wreck','gorge','rapids','timber','narrows','finish','waterwheel','shore','trees','grass','shore&low'];
  for (const view of views) {
    await page.goto(`http://127.0.0.1:5174/tests/graphics.html?view=${view}${noRefraction?'&noRefraction':''}`);
    await page.waitForFunction(()=>Number(document.body.dataset.frames)>35);
    const name=view.replace('&','-');
    await page.screenshot({path:`evidence/render-${name}.png`});
    const stats=JSON.parse(await page.locator('canvas').getAttribute('data-render-info'));
    assert(Number(await page.locator('body').getAttribute('data-sweeper-error'))<1e-8);
    assert(Math.abs(Number(await page.locator('body').getAttribute('data-wheel-error')))<1e-8);
    // Main view + Water reflection are existing passes; the measured complete
    // high-detail frame is 706 calls after transmission is narrowed to bed only.
    assert(stats.calls<800,JSON.stringify(stats));
    // info.autoReset used to erase the parent shadow count inside Water's
    // nested reflection render. These are now complete frame totals. Measured
    // The heaviest authored log frame measures 6.03m triangles; this leaves
    // a modest regression margin while separately capping transmission work.
    assert(stats.triangles<6500000,`Full color/reflection/shadow/capture frame exceeds measured fixture budget for ${view}: ${JSON.stringify(stats)}`);
    assert(stats.captureCalls<100&&stats.captureTriangles<100000,'Transmission must exclude the expensive above-water forest and crew');
    assert(stats.captureSize[0]<=1280&&stats.captureSize[1]<=960);
    assert(stats.refraction===(!view.includes('low')&&!noRefraction));
    results.push({view,stats});
  }
  const high=results.find(result=>result.view==='shore'),low=results.find(result=>result.view==='shore&low');
  console.log(JSON.stringify({natureHigh:high?.stats,natureLow:low?.stats}));
  assert(high&&low&&low.stats.triangles<high.stats.triangles*.8,`Lower Graphics must reduce foliage geometry: ${JSON.stringify({high,low})}`);
  await page.goto('http://127.0.0.1:5174/tests/audio.html');
  await page.waitForFunction(()=>document.body.dataset.result || document.body.dataset.error);
  assert.equal(await page.locator('body').getAttribute('data-error'),null);
  const audio=JSON.parse(await page.locator('body').getAttribute('data-result'));
  assert(audio.audible.rms>.001 && audio.audible.peak<1 && audio.audible.left>audio.audible.right,'Audio must render bounded stereo event output');
  assert(audio.muted.peak<.00001,'Muted output must be silent');
  const titleViews=[];
  for(const [width,height] of [[1440,960],[907,510],[480,900]]){
    await page.setViewportSize({width,height});
    await page.goto(process.env.GAME_URL ?? 'http://localhost:2570');
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.boatBounds);
    await page.waitForTimeout(250);
    const play=page.getByRole('button',{name:'Play with Friends',exact:true});
    assert(await play.isVisible());
    assert.equal(await page.getByRole('button',{name:'Practice',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Controls',exact:true}).count(),0);
    assert.equal(await page.locator('.title-eyebrow,.tagline,.title-footer,.title-location').count(),0);
    const rect=await play.boundingBox(); assert(rect && rect.x>=0 && rect.y>=0 && rect.y+rect.height<height);
    await page.screenshot({path:`evidence/title-${width}x${height}.png`});
    titleViews.push({width,height,playButton:rect});
  }
  assert.deepEqual(errors,[]);
  await writeFile('evidence/graphics.json',JSON.stringify({result:'PASS',fixture:true,humanPlaytest:false,browser:browser.version(),results,titleViews,audio,errors},null,2));
  console.log(JSON.stringify({result:'PASS',results,errors},null,2));
}finally{await browser?.close();await server.close()}
