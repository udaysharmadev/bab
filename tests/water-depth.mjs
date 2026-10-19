import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}});let browser;const errors=[];
const difference=(a,b)=>Math.max(...a.flatMap((v,i)=>Array.isArray(v)?v.map((n,j)=>Math.abs(n-b[i][j])):Math.abs(v-b[i])));
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:960,height:720}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(m.text()))errors.push(m.text())});
 await page.goto('http://127.0.0.1:5174/tests/water-depth.html');await page.waitForFunction(()=>document.body.dataset.result,{},{timeout:60000});
 const result=JSON.parse(await page.locator('body').getAttribute('data-result'));console.log(JSON.stringify({result,errors},null,2));
 assert(difference(result.shallowRed,result.shallowBlue)>20,'High water must transmit the actual submerged color');
 assert(result.shallowRed[0]>result.deepRed[0]+10,'Greater submerged depth must absorb more red light');
 assert(difference(result.lowRed,result.lowBlue)<=2,'Low must keep its independent analytic fallback');
 assert(difference(result.magentaOutside,result.cyanOutside)<=2,'Above-water foreground must not leak into refracted neighboring pixels');
 assert(difference(result.foregroundWater,result.foregroundDry)<=2,'Opaque foreground remains unaffected by water');
 assert(result.lowSkipsCapture&&result.restored,'Low must skip the pass; capture must restore renderer/camera state');
 assert(Math.max(...result.textureCounts)-Math.min(...result.textureCounts)<=1,'Quality toggles must not leak capture textures');
 assert(result.captureSize[0]<=1280&&result.captureSize[1]<=960);
 assert.deepEqual(errors,[]);await page.screenshot({path:'evidence/water-depth-fixture.png'});
 await writeFile('evidence/water-depth.json',JSON.stringify({result:'PASS',fixture:true,humanPlaytest:false,browser:browser.version(),optics:result,errors},null,2));
 console.log('Water depth/refraction: PASS');
}finally{await browser?.close();await server.close();}
