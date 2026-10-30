import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

const server=await createServer({server:{host:'127.0.0.1',port:5178,strictPort:true}});
const checks=[],errors=[];let browser;
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
 await page.goto('http://127.0.0.1:5178/tests/graphics.html?view=log');
 await page.waitForFunction(()=>Number(document.body.dataset.frames)>20);
 const wakes=[];
 for(const [name,velocity,expected]of [
  ['drift',{x:0,y:0,z:.12},[0,0]],['forward',{x:0,y:0,z:3.12},[0,1]],
  ['reverse',{x:0,y:0,z:-2.88},[0,-1]],['sideways',{x:3,y:0,z:.12},[1,0]],
 ]){
  const result=await page.evaluate(velocity=>{
   const scene=window.scene,previous=scene.snapshot;
   scene.setSnapshot({...previous,tick:600,position:{x:0,y:.08,z:0},rotation:{x:0,y:0,z:0,w:1},velocity,paused:false,resetId:previous.resetId+1,blades:previous.blades.map(b=>({...b,force:0,immersion:0,state:'AIR'}))});
   scene.render(.016,10);
   return {speed:scene.water.material.uniforms.boatSpeed.value,direction:scene.water.material.uniforms.boatDirection.value.toArray(),velocity:scene.snapshot.velocity};
  },velocity);
  assert.deepEqual(result.velocity,velocity,'Presentation must never change authority velocity');
  if(name==='drift')assert(result.speed<1e-10,'Passive motion with the water creates no powered wake');
  else{assert(Math.abs(result.speed-3)<1e-10);assert(result.direction.every((v,i)=>Math.abs(v-expected[i])<1e-10));}
  await page.screenshot({path:`evidence/water-wake-${name}.png`});wakes.push({name,...result});
  checks.push(`${name}: actual scene derives water-relative wake direction/strength without modifying the snapshot`);
 }
 const lifecycle=await page.evaluate(()=>{
  const scene=window.scene,signature=()=>JSON.stringify(scene.vortexTracers.map(p=>p.toArray()));
  const locate=(z,paused)=>{const previous=scene.snapshot;scene.setSnapshot({...previous,tick:720,position:{x:0,y:.08,z},velocity:{x:0,y:0,z:0},paused,resetId:previous.resetId+1});scene.render(.016,12);};
  locate(106,true);const paused=signature();for(let i=0;i<5;i++)scene.render(.016,12+i*.016);
  const frozen=signature()===paused;
  locate(378,false);const hidden=signature(),version=scene.vortexFoam.instanceMatrix.version;
  for(let i=0;i<10;i++)scene.render(.016,12+i*.016);
  const skipped=!scene.vortexFoam.visible&&signature()===hidden&&scene.vortexFoam.instanceMatrix.version===version;
  locate(106,false);
  const reentered=scene.vortexFoam.visible&&signature()!==hidden&&scene.vortexFoam.instanceMatrix.version>version;
  return {frozen,skipped,reentered,finite:scene.vortexTracers.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))};
 });
 assert(lifecycle.frozen);checks.push('Paused visible whirlpool tracers remain frozen');
 assert(lifecycle.skipped);checks.push('Offscreen whirlpool skips all tracer advection and instance-buffer uploads');
 assert(lifecycle.reentered&&lifecycle.finite);checks.push('Visible re-entry resumes finite current-driven tracers');
 assert.deepEqual(errors,[]);
 const report={result:'PASS',fixture:true,humanPlaytest:false,browser:browser.version(),checks,wakes,lifecycle,errors};
 await writeFile('evidence/water-effects.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await server.close();}
