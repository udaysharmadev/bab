import {confirmName} from './support/name.mjs';
import {fork} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base='http://127.0.0.1:2584',errors=[],poses=[],pages=[];
const server=fork('tests/support/bends-server.ts',[],{execArgv:['--import','tsx'],env:{...process.env,PORT:'2584',BOAT_SAVE_DB:':memory:',BOAT_DIST_DIR:'dist'},silent:true});
let output='',ready=false,browser;
server.stderr.on('data',data=>output+=data);server.stdout.on('data',data=>output+=data);
server.on('message',message=>{if(message?.ready)ready=true;});
const until=async check=>{const start=Date.now();while(!check()){assert(Date.now()-start<15000,'QA server wait timed out: '+output);await delay(25);}};
try{
  await until(()=>ready||server.exitCode!==null);assert(ready,output);
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});let invite;
  for(let seat=0;seat<4;seat++){
    const page=await browser.newPage({viewport:seat?{width:640,height:400}:{width:1280,height:900}});pages.push(page);page.setDefaultTimeout(15000);
    // Cap the four test renderers so this fixture measures the real socket/
    // scene integration without pretending to be a consumer frame-rate test.
    await page.addInitScript(()=>{localStorage.setItem('bad-at-boating-name','River Tester');const frame=requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>frame(()=>setTimeout(()=>callback(performance.now()),50));});
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
    await page.goto(invite??base);
    if(seat===0){await page.getByRole('button',{name:'Play with Friends',exact:true}).click();await page.waitForFunction(()=>document.body.dataset.seat==='0');invite=page.url();}
    await page.waitForFunction(seat=>document.body.dataset.seat===String(seat),seat);
    await confirmName(page);
    if(seat){await page.getByRole('button',{name:'Open game menu'}).click();await page.getByLabel('Lower graphics').check();await page.getByRole('button',{name:'Back to the River'}).click();}
  }
  for(const page of pages)await page.getByRole('button',{name:'Ready',exact:true}).click();
  await Promise.all(pages.map(page=>page.waitForFunction(()=>document.body.dataset.stage==='playing')));
  const room=new URL(invite).searchParams.get('crew');assert(room,'Expected a real crew invite');
  for(let bend=0;bend<5;bend++){
    const pose=await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{server.off('message',receive);reject(new Error('Pose acknowledgement timeout'));},5000);
      function receive(message){if(message?.bend===bend){clearTimeout(timeout);server.off('message',receive);resolve(message);}}
      server.on('message',receive);server.send({room,bend});
    });
    await Promise.all(pages.map(page=>page.waitForFunction(pose=>document.body.dataset.resetId===String(pose.resetId)&&document.querySelector('canvas')?.dataset.routeSection===pose.section,pose)));
    const clients=await Promise.all(pages.map(page=>page.evaluate(()=>({position:JSON.parse(document.body.dataset.position),condition:document.body.dataset.condition,resetId:Number(document.body.dataset.resetId),bounds:JSON.parse(document.querySelector('canvas').dataset.boatBounds),section:document.querySelector('canvas').dataset.routeSection}))));
    for(const client of clients){
      assert.equal(client.condition,'afloat');assert.equal(client.resetId,pose.resetId);assert.equal(client.section,pose.section);
      assert(Math.hypot(client.position.x-pose.x,client.position.z-pose.z)<1,'Authored pose must arrive through the authority snapshot');
      assert(client.bounds.left>.02&&client.bounds.right<.98&&client.bounds.top>.04&&client.bounds.bottom<.94,JSON.stringify(client));
    }
    poses.push({...pose,clients});await pages[0].screenshot({path:`evidence/bend-${pose.section}.png`});
  }
  const before=Number(await pages[0].locator('body').getAttribute('data-strokes'));
  await pages[0].keyboard.down('ArrowUp');
  await pages[0].waitForFunction(before=>Number(document.body.dataset.strokes)>=before+2,before);
  await pages[0].keyboard.up('ArrowUp');
  assert.equal(await pages[0].locator('body').getAttribute('data-condition'),'afloat');
  assert.deepEqual(errors,[]);
  const result={result:'PASS',protocol:7,physics:JSON.parse(await (await fetch(base+'/health')).text()).physics,browser:browser.version(),clients:4,poses,heldRowing:'PASS; at least2 acknowledged strokes after the final bend relocation',errors,scope:'Four real rendered clients at5 IPC-authored authority poses, plus real held input. Not a continuous human traversal or device/FPS acceptance.'};
  await writeFile('evidence/bends-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:'PASS',clients:4,authoredBendPoses:poses.length,heldRowing:'PASS',errors}));
}catch(error){await writeFile('evidence/bends-browser.json',JSON.stringify({result:'FAIL',error:String(error),poses,errors,serverOutput:output},null,2)+'\n');throw error;}
finally{await browser?.close();server.kill('SIGTERM');}
