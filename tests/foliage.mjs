import {createServer} from 'vite';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}}),results=[],errors=[];let browser;
try{
  await server.listen();browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
  for(const view of ['crew','trees','grass','rapids'])for(const low of [false,true]){
    await page.goto(`http://127.0.0.1:5174/tests/graphics.html?view=${view}${low?'&low':''}`);
    await page.waitForFunction(()=>Number(document.body.dataset.frames)>=45);
    const comparison=await page.evaluate(async()=>{
      const T=await import('/node_modules/three/build/three.module.js'),s=window.scene;
      s.setSnapshot({...s.snapshot,paused:true});s.clearStrokeEffects();
      const now=performance.now()/1000;
      const pairs=[['leaves',.92],['undergrowth',1]].map(([key,roughness])=>({key,current:new T.MeshLambertMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide}),prior:s.nature[key]}));
      for(const {current} of pairs){if(!current.isMeshLambertMaterial||!current.vertexColors||current.side!==T.DoubleSide||!current.fog)throw Error('Diffuse foliage contract');}
      const meshes=[];s.scene.traverse(o=>{if(pairs.some(p=>o.material===p.prior))meshes.push({mesh:o,geometry:o.geometry,matrices:o.instanceMatrix.array.slice(),colors:o.instanceColor?.array.slice()});});
      const draw=()=>{
        s.render(0,now);const gl=s.renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
        gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        return {pixels,stats:JSON.parse(s.renderer.domElement.dataset.renderInfo)};
      };
      for(const p of pairs)for(const {mesh} of meshes)if(mesh.material===p.prior)mesh.material=p.current;
      draw();const current=draw();
      for(const p of pairs)for(const {mesh} of meshes)if(mesh.material===p.current)mesh.material=p.prior;
      draw();const prior=draw();
      let delta=0,changed=0,large=0;
      for(let i=0;i<current.pixels.length;i+=4){let max=0;for(let c=0;c<3;c++){const d=Math.abs(current.pixels[i+c]-prior.pixels[i+c]);delta+=d;max=Math.max(max,d);}if(max>0)changed++;if(max>64)large++;}
      for(const p of pairs){for(const {mesh} of meshes)if(mesh.material===p.current)mesh.material=p.prior;p.current.dispose();}
      for(const {mesh,geometry,matrices,colors} of meshes){if(mesh.geometry!==geometry||mesh.instanceMatrix.array.some((v,i)=>v!==matrices[i])||mesh.instanceColor?.array.some((v,i)=>v!==colors[i]))throw Error('Foliage transforms/colours changed');}
      s.render(0,now);
      return {meshes:meshes.length,current:current.stats,prior:prior.stats,meanChannelDelta:delta/(current.pixels.length/4*3),changedPixelFraction:changed/(current.pixels.length/4),largeDeltaPixelFraction:large/(current.pixels.length/4)};
    });
    assert(comparison.meshes>0);if(view==='trees'||view==='grass')assert(comparison.changedPixelFraction>0,'Visible native foliage pixels must be compared');assert.equal(comparison.current.calls,comparison.prior.calls);assert.equal(comparison.current.triangles,comparison.prior.triangles);
    assert(comparison.meanChannelDelta<12,'Whole-frame mean colour change must remain bounded');assert(comparison.largeDeltaPixelFraction<.08,'Large colour changes must remain local');
    await page.screenshot({path:`evidence/foliage-${view}-${low?'low':'high'}.png`});results.push({view,quality:low?'Low':'High',...comparison});
  }
  assert.deepEqual(errors,[]);await writeFile('evidence/foliage.json',JSON.stringify({result:'PASS',results,errors,scope:'Rejected Lambert experiment versus retained production Standard material. Native diffuse foliage/material comparison at identical authored poses. Geometry/instance colours/shadows/fog retained; pixel differences bounded. Human art/device acceptance remains open.'},null,2)+'\n');
  console.log(`PASS: ${results.length} High/Low same-pose material comparisons`);
}finally{await browser?.close();await server.close();}
