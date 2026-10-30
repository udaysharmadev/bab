import {createServer} from 'vite';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}}),results=[],errors=[];let browser;
try{
 await server.listen();browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
 for(const low of [false,true]){
  await page.goto(`http://127.0.0.1:5174/tests/graphics.html?view=crew${low?'&low':''}`);
  await page.waitForFunction(()=>Number(document.body.dataset.frames)>=45);
  const shafts=await page.evaluate(async()=>{
   const T=await import('/node_modules/three/build/three.module.js'),{PADDLE_SHAFT_RADIUS}=await import('/src/shared/protocol.ts'),s=window.scene;
   return s.paddles.map((p,i)=>{
    const side=i%2?1:-1,z=i<2?.95:-.95;
    const handle=new T.Vector3(side*.65,.97,z+.03).applyMatrix4(s.boat.matrixWorld);
    const tip=new T.Vector3(s.snapshot.blades[i].x,s.snapshot.blades[i].y,s.snapshot.blades[i].z).applyMatrix4(s.boat.matrixWorld);
    const {radiusTop,radiusBottom,radialSegments}=p.shaft.geometry.parameters,length=p.shaft.scale.y;
    let minFaceClearance=Infinity;
    for(let row=0;row<=16;row++){
      const y=-length/2+length*row/16,capCentre=Math.max(-length/2+PADDLE_SHAFT_RADIUS,Math.min(length/2-PADDLE_SHAFT_RADIUS,y));
      const radius=Math.sqrt(Math.max(0,PADDLE_SHAFT_RADIUS**2-(y-capCentre)**2));
      const visibleRadius=radiusBottom+(radiusTop-radiusBottom)*(y/length+.5);
      for(let angle=0;angle<48;angle++)for(let face=0;face<radialSegments;face++){
        const theta=angle*Math.PI*2/48,normal=(face+.5)*Math.PI*2/radialSegments;
        minFaceClearance=Math.min(minFaceClearance,visibleRadius*Math.cos(Math.PI/radialSegments)-radius*Math.cos(theta-normal));
      }
    }
    return {seat:i,contactRadius:PADDLE_SHAFT_RADIUS,minFaceClearance,analyticClearance:radiusTop*Math.cos(Math.PI/radialSegments)-PADDLE_SHAFT_RADIUS,faceChecks:17*48*radialSegments,handleError:handle.distanceTo(new T.Vector3(0,-.5,0).applyMatrix4(p.shaft.matrixWorld)),tipError:tip.distanceTo(new T.Vector3(0,.5,0).applyMatrix4(p.shaft.matrixWorld)),minRadius:p.shaft.geometry.parameters.radiusTop,maxRadius:p.shaft.geometry.parameters.radiusBottom};
   });
  });
  for(const s of shafts){assert(s.handleError<1e-7&&s.tipError<1e-7);assert(s.analyticClearance>=0);assert(s.minFaceClearance>=0,'Capsule must stay inside every actual polygon face');assert.equal(s.contactRadius,.022);assert.equal(s.minRadius,.025);assert.equal(s.maxRadius,.03);}
  results.push({quality:low?'Low':'High',shafts});await page.screenshot({path:`evidence/paddle-contact-${low?'low':'high'}.png`});
 }
 assert.deepEqual(errors,[]);await writeFile('evidence/paddle-contact-browser.json',JSON.stringify({result:'PASS',results,errors,scope:'Native High/Low shaft endpoints and conservative capsule radius agreement. Authority force/energy tested independently; no human handling acceptance.'},null,2)+'\n');console.log('PASS: 8 native shaft envelopes, High/Low');
}finally{await browser?.close();await server.close();}
