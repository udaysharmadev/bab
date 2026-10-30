import {confirmName} from './support/name.mjs';
import {chromium} from 'playwright';
import {Client} from '@colyseus/sdk';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

const base=process.env.GAME_URL??'http://localhost:2571';
const health=await fetch(`${base}/health`).then(response=>response.json());
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});
const members=[],checks=[],errors=[];
const page=await browser.newPage({viewport:{width:960,height:720}});
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error'||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(message.text()))errors.push(message.text());});
await page.addInitScript(()=>{localStorage.setItem('bad-at-boating-name','River Tester');
  window.testPad={connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
  Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});
});
const count=()=>page.locator('body').getAttribute('data-strokes').then(Number);
async function stroke(action) {
  const before=await count(); await action();
  await page.waitForFunction(before=>Number(document.body.dataset.strokes)>before,before);
}
async function controls() {
  await page.locator('#menu-button').click(); await page.locator('#show-controls').click();
}
async function key(action,key) {
  await page.locator(`[data-bind=${action}]`).click(); await page.keyboard.press(key);
}
try {
  const sdk=new Client(base.replace(/^http/,'ws'));
  const options={protocol:health.protocol,physics:health.physics,mode:'friends'};
  for(let i=0;i<3;i++) {
    const member=i?await sdk.joinById(members[0].roomId,options):await sdk.create('boat',options);
    for(const type of ['seat','snapshot','voyage'])member.onMessage(type,()=>{});
    members.push(member);
  }
  await page.goto(`${base}/?crew=${members[0].roomId}`);
  await page.waitForFunction(()=>document.body.dataset.seat==='3');
  await confirmName(page);
  await page.locator('#menu-button').click();
  await page.getByLabel('Lower graphics').check(); await page.getByLabel('Gentler camera').check();
  await page.locator('#show-controls').click();
  await key('forward','i'); await key('reverse','k'); await key('left','j'); await key('right','l');
  await key('left','i'); assert.match(await page.locator('#binding-message').textContent(),/already assigned/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-bind=left]').textContent(),'J');
  await page.getByRole('button',{name:'Close controls',exact:true}).click();
  await page.reload(); await page.waitForFunction(()=>document.body.dataset.seat==='3');
  await page.locator('#menu-button').click();
  assert(await page.getByLabel('Lower graphics').isChecked()); assert(await page.getByLabel('Gentler camera').isChecked());
  await page.locator('#show-controls').click(); assert.equal(await page.locator('[data-bind=forward]').textContent(),'I');
  checks.push('Unique remapped keys and graphics/camera preferences persist across reload');
  await page.getByRole('button',{name:'Close controls',exact:true}).click();
  members.forEach(member=>member.send('ready',true)); await page.locator('#ready').click();
  await page.waitForFunction(()=>document.body.dataset.stage==='playing');
  await stroke(()=>page.keyboard.down('i')); await page.keyboard.up('i');
  let before=await count(); await page.keyboard.down('w'); await page.waitForTimeout(1800); await page.keyboard.up('w');
  assert.equal(await count(),before); checks.push('Remapped I rows the real assigned paddle; replaced W remains inactive');
  await stroke(()=>page.keyboard.down('ArrowUp')); await page.keyboard.up('ArrowUp');
  checks.push('Arrow controls remain available after remapping');
  await page.waitForTimeout(250);
  await stroke(()=>page.evaluate(()=>{window.testPad.axes=[0,-1];}));
  await page.evaluate(()=>{window.testPad.buttons[9].pressed=true;});
  await page.locator('#settings-dialog').waitFor({state:'visible'});
  await page.evaluate(()=>{window.testPad.buttons[9].pressed=false;});
  await page.waitForTimeout(250); before=await count();
  await page.locator('#resume').click(); await page.waitForTimeout(1800);
  assert.equal(await count(),before,'Controller held through menu cannot restart rowing');
  await page.evaluate(()=>{window.testPad.axes=[0,0];}); await page.waitForTimeout(200);
  await stroke(()=>page.evaluate(()=>{window.testPad.axes=[0,-1];}));
  await page.evaluate(()=>{window.testPad.axes=[0,0];});
  checks.push('Standard controller API drives real paddle and requires neutral after menu release (simulated hardware)');
  for(const low of [true,false]) {
    await page.locator('#menu-button').click(); await page.getByLabel('Lower graphics').setChecked(low); await page.locator('#resume').click();
    await page.keyboard.down('i'); await page.waitForTimeout(500);
    const supported=await page.locator('canvas').evaluate(canvas=>{
      const extension=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
      if(!extension)return false; window.contextLoss=extension; extension.loseContext(); return true;
    });
    assert(supported,'Chrome fixture requires native context-loss extension');
    await page.locator('#graphics-recovery').waitFor({state:'visible'});
    await page.keyboard.up('i'); await page.waitForTimeout(350); before=await count();
    await page.waitForTimeout(1800); assert.equal(await count(),before);
    await page.evaluate(()=>window.contextLoss.restoreContext());
    await page.locator('#graphics-recovery').waitFor({state:'hidden'});
    await stroke(()=>page.keyboard.down('i')); await page.keyboard.up('i');
    const info=JSON.parse(await page.locator('canvas').getAttribute('data-render-info'));
    assert.equal(info.refraction,!low,'Water capture must resume at the same quality after context restoration');
    checks.push(`${low?'Low':'High'}: native WebGL loss releases input, restores rendering/water and allows subsequent rowing`);
  }
  await controls(); await page.locator('#restore-keys').click();
  assert.equal(await page.locator('[data-bind=forward]').textContent(),'W');
  await page.getByRole('button',{name:'Close controls',exact:true}).click();
  await stroke(()=>page.keyboard.down('w')); await page.keyboard.up('w');
  checks.push('Restoring WASD takes effect immediately without a new crew');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'evidence/accessibility-playing.png'});
  const result={result:'PASS',base,protocol:health.protocol,physics:health.physics,automated:true,humanPlaytest:false,controller:'Browser Gamepad API fixture; physical controller acceptance pending',checks,errors};
  await writeFile('evidence/accessibility.json',JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result,null,2));
} finally {
  await browser.close(); await Promise.allSettled(members.map(member=>{member.reconnection.enabled=false;return member.leave();}));
}
