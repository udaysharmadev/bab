import {createServer} from 'vite';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}});let browser;const errors=[],results=[],bounds=[];
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 for(const [width,height] of [[1440,960],[480,900]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5174/tests/camera.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');
  for(const z of [0,156,190,210,227,290,310,345,380,407,419,456,470,500,535,546,585,598,630,664,710,729,810,870,950,1030,1100,1230,1390])for(const reverse of [false,true]){
   const result=await page.evaluate(args=>window.checkCamera(args),{z,reverse});results.push({width,height,z,reverse,...result});
   assert(result.bounds.left>.04&&result.bounds.right<.96&&result.bounds.top>.06&&result.bounds.bottom<.91,JSON.stringify(results.at(-1)));
   assert.deepEqual(result.up,[0,1,0]);assert.equal(result.blocked.length,0,JSON.stringify(results.at(-1)));
  }
  for(const x of [-4.5,4.5])for(const reverse of [false,true])for(const gentle of [false,true]){
   const result=await page.evaluate(args=>window.checkCamera(args),{z:566,x,reverse,roll:.35,gentle});results.push({width,height,z:566,x,reverse,gentle,...result});
   assert(result.bounds.left>.02&&result.bounds.right<.98&&result.bounds.top>.04&&result.bounds.bottom<.94,JSON.stringify(results.at(-1)));
   assert.equal(result.blocked.length,0,JSON.stringify(results.at(-1)));
  }
  for(const z of [371,378,385,392])for(const x of [-9,-6,-3])for(const reverse of [false,true]){
   const result=await page.evaluate(args=>window.checkCamera(args),{z,x,reverse});results.push({width,height,z,x,reverse,...result});
   assert(result.bounds.left>.02&&result.bounds.right<.98&&result.bounds.top>.04&&result.bounds.bottom<.94,JSON.stringify(results.at(-1)));
   assert.equal(result.blocked.length,0,JSON.stringify(results.at(-1)));
  }
  for(const z of [310,456,566,870,1030,1390]){await page.evaluate(args=>window.checkCamera(args),{z,low:false});await page.screenshot({path:`evidence/camera-${z}-${width}.png`});}
  const work=await page.evaluate(()=>window.boundsWork);assert(work.vertices>0&&work.rays>0&&work.hits>0,JSON.stringify(work));
  assert(work.bounded.triangles<work.baseline.triangles,'Static bounds must actually reduce triangle work');bounds.push({width,height,...work});
 }
 assert.deepEqual(errors,[]);await writeFile('evidence/camera.json',JSON.stringify({result:'PASS',fixture:true,humanPlaytest:false,browser:browser.version(),results,bounds,errors},null,2));
 console.log(JSON.stringify({result:'PASS',cases:results.length,bounds,errors}));
}finally{await browser?.close();await server.close()}
