import {createServer} from 'vite';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}}),results=[],errors=[];let browser;
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
 for(const low of [false,true]){
  await page.goto(`http://127.0.0.1:5174/tests/graphics.html?view=crew${low?'&low':''}`);await page.waitForFunction(()=>Number(document.body.dataset.frames)>=45);
  await page.screenshot({path:`evidence/blade-${low?'low':'high'}.png`});
  const result=await page.evaluate(async()=>{
   const T=await import('/node_modules/three/build/three.module.js'),{PADDLE_CORES,paddleBladeRotation}=await import('/src/shared/paddle-blade.ts'),{localToWorld}=await import('/src/shared/protocol.ts'),s=window.scene;
   let poses=0,vertexChecks=0,maxError=0,maxNaiveTwistError=0;
   const original=s.boat.quaternion.clone();
   for(let seat=0;seat<4;seat++)for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const heel of [-.4,0,.4])for(const dip of [-.32,.1,.62]){
    s.boat.quaternion.setFromEuler(new T.Euler(0,yaw,heel,'YXZ'));
    const tip={x:(seat%2?1:-1)*1.45,y:dip,z:(seat<2?.95:-.95)+.3};s.posePaddle(seat,tip);s.boat.updateMatrixWorld(true);
    const worldTip=new T.Vector3(tip.x,tip.y,tip.z).applyMatrix4(s.boat.matrixWorld),q=paddleBladeRotation(seat,tip,s.boat.quaternion);
    for(const core of PADDLE_CORES)for(let i=0;i<core.vertices.length;i+=3){
     const v={x:core.vertices[i],y:core.vertices[i+1],z:core.vertices[i+2]},physical=localToWorld(v,worldTip,q),visible=new T.Vector3(v.x,v.y,v.z).applyMatrix4(s.paddles[seat].blade.matrixWorld);
     maxError=Math.max(maxError,visible.distanceTo(new T.Vector3(physical.x,physical.y,physical.z)));vertexChecks++;
    }
    const handle=new T.Vector3((seat%2?1:-1)*.65,.97,(seat<2?.95:-.95)+.03).applyMatrix4(s.boat.matrixWorld);
    const naive=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),worldTip.clone().sub(handle).normalize());
    maxNaiveTwistError=Math.max(maxNaiveTwistError,1-Math.abs(naive.dot(new T.Quaternion(q.x,q.y,q.z,q.w))));poses++;
   }
   s.boat.quaternion.copy(original);return {poses,vertexChecks,maxError,maxNaiveTwistError};
  });
  assert.equal(result.poses,144);assert(result.maxError<1e-6,'Physical flat blade must match real mesh including hull twist');assert(result.maxNaiveTwistError>.1,'Negative control must expose world-axis-only pose error');results.push({quality:low?'Low':'High',...result});
 }
 assert.deepEqual(errors,[]);await writeFile('evidence/blade-browser.json',JSON.stringify({result:'PASS',results,errors,scope:'Native mesh/core pose agreement, High/Low; independent Three matrix transforms vs authority quaternion math. Human fairness and arbitrary rotational CCD remain open.'},null,2)+'\n');console.log(JSON.stringify({result:'PASS',results}));
}finally{await browser?.close();await server.close();}
