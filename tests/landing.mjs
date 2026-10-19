import {createServer} from 'vite';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}});let browser;const errors=[],results=[];
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:960,height:720}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(m.text()))errors.push(m.text())});
 for(const low of [false,true]){
  await page.goto(`http://127.0.0.1:5174/tests/landing.html${low?'?low':''}`);await page.waitForFunction(()=>document.body.dataset.done==='true',{},{timeout:60000});
  const result=JSON.parse(await page.locator('canvas').getAttribute('data-regression'));results.push({low,...result});
  console.log(JSON.stringify({low,...result}));
  assert(result.legacyMax>15,'The fixture must reproduce the original water-over-floor bug');
  assert(result.phases.every(phase=>phase.maxDeckDifference<=2 && phase.stressDifference<=2 && Math.abs(phase.draft-.08)<1e-8),'Intact floor must remain dry even at the original intersecting draft');
  assert(result.phases.every(phase=>phase.exteriorDifference>15),'Water outside the hull must remain visible');
  await page.screenshot({path:`evidence/landing-dry-${low?'low':'high'}.png`});
 }
 assert.deepEqual(errors,[]);await writeFile('evidence/landing.json',JSON.stringify({result:'PASS',results,errors},null,2));
}finally{await browser?.close();await server.close();}
