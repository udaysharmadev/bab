import {createServer} from 'vite';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}}),errors=[];let browser;
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:960}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID_/.test(m.text()))errors.push(m.text());});
 await page.goto('http://127.0.0.1:5174/tests/animation.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');
 const effects=await page.evaluate(()=>window.checkEffects());
 assert(effects.active.ripples>0&&effects.active.ripples<=32);assert(effects.steady.ripples>0&&effects.steady.ripples<=32);
 assert(effects.active.particles<=100&&effects.steady.particles<=100);assert.equal(effects.active.geometries,effects.steady.geometries);
 assert.equal(effects.sharedGeometries,1);assert.equal(effects.disposedSharedGeometry,0);
 for(const state of [effects.stale,effects.paused,effects.reset,effects.title,...effects.gated]){assert.equal(state.ripples,0,JSON.stringify(state));assert.equal(state.particles,0,JSON.stringify(state));}
 assert(effects.beforeReset>0);
 const poses=[];
 for(const [name,time,action] of [['catch',.5,1],['pull',.95,1],['recovery',1.45,1],['reverse',.95,-1]]){
  const result=await page.evaluate(args=>window.showCrew(args),{time,action});assert(result.stats.calls<800&&result.stats.triangles<6500000);
  await page.screenshot({path:`evidence/crew-${name}.png`});poses.push({name,...result});
 }
 assert.deepEqual(errors,[]);const evidence={result:'PASS',fixture:true,humanPlaytest:false,effects,poses,errors};await writeFile('evidence/animation.json',JSON.stringify(evidence,null,2));
 console.log(JSON.stringify({result:'PASS',effects,poses:poses.length,errors},null,2));
}finally{await browser?.close();await server.close();}
