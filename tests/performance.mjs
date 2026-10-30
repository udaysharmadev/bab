import {createServer} from 'vite';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {cpus,platform,arch,release,totalmem} from 'node:os';
import assert from 'node:assert/strict';

const foliageExperiment=process.env.PERF_FOLIAGE_EXPERIMENT;
assert(!foliageExperiment||['lambert','phong'].includes(foliageExperiment),'PERF_FOLIAGE_EXPERIMENT must be lambert or phong');
const frames=Number(process.env.PERF_FRAMES??180);
assert(Number.isInteger(frames)&&frames>=60&&frames<=1200,'PERF_FRAMES must be60–1200');
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}});
const cases=[],errors=[];let browser;
try {
  await server.listen();browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
  for(const view of ['crew','trees','rapids','rescue'])for(const low of [false,true]) {
    await page.goto(`http://127.0.0.1:5174/tests/graphics.html?view=${view}${low?'&low':''}`);
    await page.waitForFunction(()=>Number(document.body.dataset.frames)>=45);
    await page.evaluate(async foliageExperiment=>{
      const T=await import('/node_modules/three/build/three.module.js'),s=window.scene;
      if(foliageExperiment)for(const [key,roughness] of [['leaves',.92],['undergrowth',1]]){
        const old=s.nature[key],options={color:'#ffffff',vertexColors:true,side:T.DoubleSide};
        const material=foliageExperiment==='lambert'?new T.MeshLambertMaterial(options):new T.MeshPhongMaterial({...options,shininess:0,specular:0x000000});
        s.scene.traverse(object=>{if(object.material===old)object.material=material;});s.nature[key]=material;old.dispose();
      }
      // Equal display-frame warmup after selecting either material; synchronous
      // draws alone can leave compilation/GPU work queued into the capture.
      await new Promise(resolve=>{let frames=0;function warm(){if(++frames>=60)resolve();else requestAnimationFrame(warm);}requestAnimationFrame(warm);});
    },foliageExperiment);
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');await cdp.send('Performance.enable');
    const before=await cdp.send('Performance.getMetrics');
    const result=await page.evaluate(async frames=>{
      const scene=window.scene,gl=scene.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
      const render=scene.render.bind(scene),updateWater=scene.water.update,capture=scene.water.capture,followCamera=scene.followCamera,reflection=scene.water.onBeforeRender;
      const cpu=[],waterCpu=[],cameraCpu=[],captureCpu=[],reflectionCpu=[],intervals=[],gpu=[],pending=[];let previous,completed=0,cooldown=0,discarded=0,skipped=0,snapshots=0,nextSnapshot=0,measuring=false;
      const start=performance.now();
      const firstTick=Math.ceil(scene.time*60),initialWaterVersion=scene.water.geometry.getAttribute('position').version;
      const timed=(method,owner,values)=>function(...args){const begin=performance.now();try{return method.apply(owner,args);}finally{if(measuring)values.push(performance.now()-begin);}};
      scene.water.update=timed(updateWater,scene.water,waterCpu);scene.water.capture=timed(capture,scene.water,captureCpu);
      scene.followCamera=timed(followCamera,scene,cameraCpu);scene.water.onBeforeRender=timed(reflection,scene.water,reflectionCpu);
      const restore=()=>{scene.render=render;scene.water.update=updateWater;scene.water.capture=capture;scene.followCamera=followCamera;scene.water.onBeforeRender=reflection;};
      const stats=values=>{
        if(!values.length)return null;
        const sorted=values.slice().sort((a,b)=>a-b);
        return {samples:values.length,p50:sorted[Math.floor((sorted.length-1)*.5)],p95:sorted[Math.ceil((sorted.length-1)*.95)],max:sorted.at(-1)};
      };
      const gpuInfo={vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),timerAvailable:!!ext};
      const measured=await new Promise((resolve,reject)=>{
        function poll(){
          const disjoint=ext&&gl.getParameter(ext.GPU_DISJOINT_EXT);
          for(let i=pending.length-1;i>=0;i--){
            const query=pending[i];
            if(disjoint){gl.deleteQuery(query);pending.splice(i,1);discarded++;}
            else if(gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){gpu.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);pending.splice(i,1);}
          }
        }
        scene.render=(dt,now)=>{
          try {
            poll();
            if(completed>=frames){
              render(dt,now);
              if(pending.length&&++cooldown<60)return;
              for(const query of pending){gl.deleteQuery(query);discarded++;}pending.length=0;
              restore();resolve({cpuRenderMs:stats(cpu),cpuWaterUpdateMs:stats(waterCpu),cpuCameraMs:stats(cameraCpu),cpuCaptureMs:stats(captureCpu),cpuReflectionMs:stats(reflectionCpu),frameIntervalMs:stats(intervals),gpuRenderMs:stats(gpu),snapshotUpdates:snapshots,waterGeometryUpdates:scene.water.geometry.getAttribute('position').version-initialWaterVersion,gpuQueriesDiscarded:discarded,gpuQueriesSkipped:skipped,seconds:(performance.now()-start)/1000});return;
            }
            // A frozen graphics pose stops updating the water after warmup.
            // Emulate20Hz snapshot delivery so waves, movers and effects keep
            // their real rendering workload while the authored camera stays fixed.
            if(now>=nextSnapshot){scene.setSnapshot({...scene.snapshot,tick:firstTick+Math.floor((performance.now()-start)*.06)});nextSnapshot=now+.05;snapshots++;}
            if(previous!==undefined)intervals.push(now*1000-previous);previous=now*1000;
            let query;
            if(ext&&pending.length<8){query=gl.createQuery();if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);}else if(ext)skipped++;
            const begin=performance.now();measuring=true;
            try {render(dt,now);}finally{measuring=false;cpu.push(performance.now()-begin);if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query);}}
            completed++;
          } catch(error){for(const query of pending)gl.deleteQuery(query);restore();reject(error);}
        };
      });
      return {...measured,gpu:gpuInfo,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},render:JSON.parse(scene.renderer.domElement.dataset.renderInfo),browser: navigator.userAgent};
    },frames);
    const after=await cdp.send('Performance.getMetrics');await cdp.detach();
    const metrics=value=>Object.fromEntries(value.metrics.filter(metric=>['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','JSEventListeners'].includes(metric.name)).map(metric=>[metric.name,metric.value]));
    assert.equal(result.cpuRenderMs.samples,frames);assert.equal(result.frameIntervalMs.samples,frames-1);
    assert(result.snapshotUpdates>0&&result.waterGeometryUpdates>0,'Profile must include advancing water geometry, not a frozen screenshot');
    for(const measure of [result.cpuRenderMs,result.cpuWaterUpdateMs,result.cpuCameraMs,result.cpuCaptureMs,result.cpuReflectionMs,result.frameIntervalMs,result.gpuRenderMs].filter(Boolean))assert([measure.p50,measure.p95,measure.max].every(Number.isFinite));
    const targets={cpuRenderP95Ms:4,gpuRenderP95Ms:10.5,frameIntervalP95Ms:16.67};
    const targetComparison={cpu:result.cpuRenderMs.p95<=4?'MEETS':'MISSES',gpu:result.gpuRenderMs?result.gpuRenderMs.p95<=10.5?'MEETS':'MISSES':'UNAVAILABLE',frameInterval:result.frameIntervalMs.p95<=16.67?'MEETS':'MISSES'};
    cases.push({view,quality:low?'Low':'High',...result,heapAndDomBefore:metrics(before),heapAndDomAfter:metrics(after),targets,targetComparison});
    if(view==='crew')await page.screenshot({path:`evidence/performance-${low?'low':'high'}.png`});
    console.log(JSON.stringify({view,quality:low?'Low':'High',cpuP95:result.cpuRenderMs.p95,frameP95:result.frameIntervalMs.p95,gpuP95:result.gpuRenderMs?.p95??null,targetComparison}));
  }
  assert.deepEqual(errors,[]);
  const result={result:'PASS',foliageLighting:foliageExperiment??'production Standard',date:new Date().toISOString(),browser:browser.version(),headless:true,snapshotHz:20,advancingClock:true,host:{platform:platform(),arch:arch(),osRelease:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,totalMemoryBytes:totalmem()},scope:'Local headless authored scene measurements at1080p with advancing20Hz snapshots/waves/effects, not a named consumer-device matrix, human gameplay or universal60FPS certification. PASS means measurement completed without render errors; target misses remain visible. CPU covers RiverScene.render only; GPU includes its color/reflection/shadow/capture work. Camera, water-update, capture and reflection CPU wall times are nested observations; their percentile values are not additive. Heap/DOM metrics are observations, not leak certification.',framesPerCase:frames,cases,errors};
  await writeFile(process.env.PERF_REPORT??'evidence/performance.json',JSON.stringify(result,null,2)+'\n');console.log(`PASS: ${cases.length} measured High/Low cases; inspect targetComparison for budget misses.`);
} catch(error){await writeFile(process.env.PERF_REPORT??'evidence/performance.json',JSON.stringify({result:'FAIL',date:new Date().toISOString(),error:String(error),cases,errors},null,2)+'\n');throw error;}
finally{await browser?.close();await server.close();}
