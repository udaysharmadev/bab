import {chromium} from 'playwright';
import {Client} from '@colyseus/sdk';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.GAME_URL??'http://localhost:2569';
const health=await fetch(`${base}/health`).then(reply=>reply.json());
assert.equal(health.protocol,4);
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});
const members=[],errors=[],checks=[];
const page=await browser.newPage({viewport:{width:640,height:480}});
// Keep a real native WebSocket open while withholding only application
// snapshots from the SDK. This exercises the client watchdog without a
// protocol-mocking socket or a browser offline/close event.
await page.addInitScript(()=>{
 const Socket=window.WebSocket;
 window.WebSocket=class extends Socket {
  constructor(url,protocols) {
   super(url,protocols);
   this.addEventListener('message',event=>{
    const bytes=event.data instanceof ArrayBuffer?new Uint8Array(event.data):undefined;
    if(window.__suppressSnapshots&&bytes?.[0]===13&&new TextDecoder().decode(bytes.subarray(0,30)).includes('snapshot'))event.stopImmediatePropagation();
   });
  }
 };
});
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')console.error(message.text());});
const data=name=>page.locator('body').getAttribute(`data-${name}`);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let connections=0;
page.on('websocket',()=>connections++);
try {
 const sdk=new Client(base.replace(/^http/,'ws'));
 const options={protocol:health.protocol,physics:health.physics,mode:'friends'};
 for(let i=0;i<3;i++) {
  const member=i===0?await sdk.create('boat',options):await sdk.joinById(members[0].roomId,options);
  members.push(member);
  for(const type of ['snapshot','seat','voyage'])member.onMessage(type,()=>{});
 }
 await page.goto(`${base}/?crew=${members[0].roomId}`);
 await page.waitForFunction(()=>document.body.dataset.seat==='3');
 await page.getByRole('button',{name:'Open game menu'}).click();
 await page.getByLabel('Lower graphics').check();
 await page.getByRole('button',{name:'Back to the River'}).click();
 members.forEach(member=>member.send('ready',true));
 await page.getByRole('button',{name:'Ready to Row',exact:true}).click();
 await page.waitForFunction(()=>document.body.dataset.stage==='playing');
 await page.keyboard.down('w');await wait(800);
 const tick=Number(await data('tick')),oldConnections=connections;
 await page.evaluate(()=>{window.__suppressSnapshots=true;});
 const deadline=Date.now()+12000;
 while(connections===oldConnections) {assert(Date.now()<deadline,'Silent WebSocket must trigger the snapshot watchdog');await wait(50);}
 await page.evaluate(()=>{window.__suppressSnapshots=false;});await page.keyboard.up('w');
 await page.waitForFunction(tick=>document.body.dataset.paused==='false'&&Number(document.body.dataset.tick)>tick&&document.getElementById('crew-waiting').hidden,tick);
 assert.equal(await data('seat'),'3');
 checks.push('Silent open WebSocket triggers watchdog reconnect and same-seat resume');
 await wait(400);const count=Number(await data('strokes'));await wait(1900);
 assert.equal(Number(await data('strokes')),count);
 checks.push('Held input from before interruption is released instead of replayed');
 await page.reload();await page.waitForFunction(()=>document.body.dataset.seat==='3'&&document.body.dataset.paused==='false');
 checks.push('Refresh after automatic reconnect uses the current token and retains the seat');
 const before=Number(await data('strokes'));
 await page.keyboard.down('w');await wait(3800);await page.keyboard.up('w');await wait(300);
 assert(Number(await data('strokes'))>=before+2);
 checks.push('WASD responds after watchdog recovery and refresh');
 assert.deepEqual(errors,[]);
 const result={result:'PASS',automated:true,humanPlaytest:false,base,connections,checks,errors};
 await mkdir('evidence',{recursive:true});await writeFile('evidence/reconnect.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
} catch(error) {
 console.error({connections,errors,seat:await data('seat'),message:await page.locator('#menu-message').textContent()});
 throw error;
} finally {
 await browser.close();
 await Promise.allSettled(members.map(member=>{member.reconnection.enabled=false;return member.leave();}));
}
