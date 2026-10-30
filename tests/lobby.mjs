import {fork} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base='http://127.0.0.1:2587',pages=[],checks=[],errors=[],layouts=[],longNameLayouts=[];
const server=fork('build/server.mjs',[],{env:{...process.env,PORT:'2587',BOAT_SAVE_DB:':memory:',BOAT_DIST_DIR:'dist'},silent:true});
let browser,health,output='';
server.stdout.on('data',data=>output+=data);server.stderr.on('data',data=>output+=data);
const names=['Uday','आदित्य','𐐀'.repeat(20),"O'Neil"];
const authority=page=>page.evaluate(()=>Object.fromEntries(['tick','position','rotation','blades','ack','strokes','resetId'].map(key=>[key,document.body.dataset[key]])));
try{
  for(let tries=0;tries<100;tries++){try{health=await fetch(base+'/health').then(response=>response.json());break;}catch{await delay(50);}}
  assert(health,output);browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});let invite;
  for(let seat=0;seat<4;seat++){
    const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});pages.push(page);page.setDefaultTimeout(15000);
    await page.addInitScript(()=>{const frame=requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>frame(()=>setTimeout(()=>callback(performance.now()),35));});
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
    if(seat<2)await page.addInitScript(()=>localStorage.setItem('bad-at-boating-name','Remembered Rower'));
    await page.goto(invite??base);
    if(!seat)await page.getByRole('button',{name:'Play with Friends',exact:true}).click();
    // Invite admission happens automatically, before the name form is used.
    await page.waitForFunction(seat=>document.body.dataset.stage==='lobby'&&document.body.dataset.seat===String(seat),seat);
    await page.getByRole('dialog',{name:'Your player name',exact:true}).waitFor({state:'visible'});
    assert(await page.locator('#ready').isDisabled());
    if(seat<2){
      assert.equal(await page.locator('#player-name').inputValue(),'Remembered Rower');
      await page.keyboard.press('Escape');assert(await page.locator('#name-dialog').isVisible());
    }
    if(!seat){
      invite=page.url();await page.getByLabel('Your name',{exact:true}).fill('<img onerror=x>');
      await page.getByRole('button',{name:'Continue',exact:true}).click();
      assert(await page.locator('#name-dialog').isVisible());
      await page.getByLabel('Your name',{exact:true}).fill('𐐀'.repeat(21));
      await page.getByRole('button',{name:'Continue',exact:true}).click();assert(await page.locator('#name-dialog').isVisible());
    }
    await page.getByLabel('Your name',{exact:true}).fill(names[seat]);await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.locator('#name-dialog').waitFor({state:'hidden'});
    await page.waitForFunction(()=>!document.querySelector('#ready').disabled);
    assert.equal(await page.locator('.crew-seat.mine .player-label').textContent(),'You');
    await page.locator('#ready').click();
    await page.waitForFunction(seat=>!document.querySelector('.crew-seat[data-seat="'+seat+'"] .ready-tick').hidden,seat);
    if(seat===0){assert.equal(await page.locator('body').getAttribute('data-stage'),'lobby');assert.equal(await page.locator('body').getAttribute('data-tick'),'0');await page.locator('#ready').click();}
    if(seat===3)await page.locator('#ready').click();
  }
  checks.push('Remembered names require explicit confirmation for both new hosts and invite joins; Ready stays disabled and Escape cannot skip confirmation');
  checks.push('Fresh invite URLs allocate seats directly, then collect valid names; markup/21-codepoint names are rejected, a 20-codepoint non-BMP name is accepted, and every client sees You on their own avatar');
  const host=pages[0];
  for(let seat=1;seat<4;seat++)assert.equal(await host.locator('.crew-seat[data-seat="'+seat+'"] .player-label').textContent(),names[seat]);
  assert.equal(await pages[1].locator('.crew-seat[data-seat="0"] .player-label').textContent(),'Uday');
  assert(await host.locator('.crew-seat[data-seat="1"] .ready-tick').isVisible());assert(await host.locator('.crew-seat.mine .ready-tick').isHidden());
  checks.push('Server names appear above crewmates and per-seat Ready ticks replicate; Ready works before all four seats fill and can be cancelled');
  const frozen=await authority(host),motion=()=>host.locator('canvas').getAttribute('data-dock-motion').then(JSON.parse);
  const before=await motion();await delay(1100);const after=await motion();
  assert(after.time>before.time+.5&&after.waterVersion>before.waterVersion);
  assert(Math.abs(after.position[1]-before.position[1])>.002||Math.abs(after.rotation[2]-before.rotation[2])>.001);
  assert.deepEqual(await authority(host),frozen);
  checks.push('Real water geometry and displayed hull heave/heel advance while authority tick/pose/blades/strokes stay unchanged');
  for(const viewport of [{width:1440,height:960},{width:907,height:510},{width:640,height:400},{width:480,height:900},{width:390,height:700}]){
    await host.setViewportSize(viewport);await delay(160);
    const layout=await host.evaluate(()=>{
      const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
      return {panel:rect(document.querySelector('#lobby')),labels:[...document.querySelectorAll('.crew-seat')].map(rect),bounds:JSON.parse(document.querySelector('canvas').dataset.boatBounds)};
    });
    for(const r of [layout.panel,...layout.labels])assert(r.left>=0&&r.right<=viewport.width&&r.top>=0&&r.bottom<=viewport.height,JSON.stringify({viewport,layout}));
    const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    for(let i=0;i<4;i++){assert(!overlaps(layout.labels[i],layout.panel),'Name overlaps invite panel');for(let j=0;j<i;j++)assert(!overlaps(layout.labels[i],layout.labels[j]),'Avatar name labels overlap: '+JSON.stringify({viewport,layout}));}
    layouts.push({...viewport,...layout});await host.screenshot({path:'evidence/lobby-'+viewport.width+'.png'});
  }
  checks.push('Five desktop/portrait/short layouts keep avatar names/ticks visible without overlapping one another or the compact invite panel');
  for(let seat=0;seat<4;seat++){
    const page=pages[seat];await page.locator('#menu-button').click();await page.locator('#edit-name').click();
    names[seat]='R'.repeat(19)+seat;
    await page.getByLabel('Your name',{exact:true}).fill(names[seat]);await page.getByRole('button',{name:'Continue',exact:true}).click();
  }
  await host.waitForFunction(()=>document.querySelector('.crew-seat[data-seat="3"] .player-label').textContent==='R'.repeat(19)+'3');
  for(const viewport of [{width:1440,height:960},{width:907,height:510},{width:640,height:400},{width:480,height:900},{width:390,height:700}]){
    await host.setViewportSize(viewport);await delay(160);
    const labels=await host.locator('.crew-seat').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
    for(let i=0;i<4;i++)for(let j=0;j<i;j++)assert(!(labels[i].left<labels[j].right&&labels[i].right>labels[j].left&&labels[i].top<labels[j].bottom&&labels[i].bottom>labels[j].top),'Maximum-length names overlap: '+JSON.stringify({viewport,labels}));
    longNameLayouts.push({...viewport,labels});
  }
  checks.push('All20-character handles can be changed through the menu and stay separated in all five layouts; labels preserve full accessible text/title');
  // A locally remembered rename must also be restored after a fresh reconnect
  // handshake, even if its earlier name packet did not reach the room.
  names[2]='Rejoined Rower';
  await pages[2].evaluate(name=>localStorage.setItem('bad-at-boating-name',name),names[2]);
  await pages[2].reload();await pages[2].waitForFunction(()=>document.body.dataset.seat==='2');
  assert(await pages[2].locator('#name-dialog').isHidden());
  await host.waitForFunction(name=>document.querySelector('.crew-seat[data-seat="2"] .player-label').textContent===name,names[2]);
  assert.equal(await host.locator('.crew-seat[data-seat="2"] .player-label').textContent(),names[2]);
  checks.push('Reload keeps the same seat without asking again and restores the remembered name after the actual reconnect handshake');
  // None of this can launch with only three ready.
  for(const page of pages)if(await page.locator('#ready').textContent()==='Not Ready')await page.locator('#ready').click();
  for(const page of pages.slice(0,3))await page.locator('#ready').click();
  await delay(350);assert.equal(await host.locator('body').getAttribute('data-stage'),'lobby');
  await pages[3].locator('#ready').click();await Promise.all(pages.map(page=>page.waitForFunction(()=>document.body.dataset.stage==='playing')));
  for(const page of pages){assert(await page.locator('#crew').isHidden());assert(await page.locator('#lobby').isHidden());}
  checks.push('Only all four Ready launch the boat; projected names and lobby controls leave the quiet playing view');
  assert.deepEqual(errors,[]);
  const result={result:'PASS',generatedUTC:new Date().toISOString(),protocol:health.protocol,physics:health.physics,browser:browser.version(),checks,layouts,longNameLayouts,motion:{before,after},authority:frozen,errors,scope:'Automated local four-browser name/invite/ready/layout and visual-motion checks. Physical lobby gameplay remains anchored; no human/device/production acceptance.'};
  await writeFile('evidence/lobby.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:'PASS',checks,layouts:layouts.length,errors}));
}catch(error){await writeFile('evidence/lobby.json',JSON.stringify({result:'FAIL',error:String(error),checks,layouts,errors,serverOutput:output},null,2)+'\n');throw error;}
finally{await browser?.close();server.kill('SIGTERM');}
