import {chromium} from 'playwright';
import {Client} from '@colyseus/sdk';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.GAME_URL??'http://localhost:2569';
const browser=await chromium.launch({channel:'chrome',headless:true});
const anchors=[],errors=[],checks=[];
const seat=3;
try{
 const sdk=new Client(base.replace(/^http/,'ws'));
 const options={protocol:3,physics:'basin-0.5',mode:'friends'};
 function track(member){member.onMessage('snapshot',()=>{});member.onMessage('seat',()=>{});member.onMessage('voyage',()=>{});anchors.push(member);return member;}
 const anchor=track(await sdk.create('boat',options));
 for(let i=1;i<3;i++)track(await sdk.joinById(anchor.roomId,options));
 const page=await browser.newPage({viewport:{width:960,height:720}});page.on('pageerror',e=>errors.push(e.message));
 const data=name=>page.locator('body').getAttribute(`data-${name}`);
 const blades=()=>data('blades').then(JSON.parse);
 const strokes=()=>data('strokes').then(Number);
 async function reset(){
  const old=await data('reset-id');
  await page.getByRole('button',{name:'Open game menu'}).click();
  await page.getByRole('button',{name:'Return to Checkpoint',exact:true}).click();
  await page.waitForFunction(old=>document.body.dataset.resetId!==old,old);
  await page.waitForTimeout(300);
 }
 async function hold(key,ms=3800){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(300);}
 async function repeats(name,key,focus=async()=>{}){
  await focus();const a=await blades(),count=await strokes();
  await hold(key);const b=await blades(),caught=await strokes()-count;
  const otherSeatsUnchanged=a.every((p,i)=>i===seat||Math.abs(p.x-b[i].x)<.001&&Math.abs(p.z-b[i].z)<.001);
  checks.push({name,caught,otherSeatsUnchanged,pass:caught>=2&&otherSeatsUnchanged});
 }
 await page.goto(`${base}/?crew=${anchor.roomId}`);await page.waitForFunction(()=>document.body.dataset.seat==='3'&&document.body.dataset.stage==='lobby');
 await page.getByRole('button',{name:'Open game menu'}).click();await page.getByLabel('Lower graphics').check();await page.getByRole('button',{name:'Back to the River'}).click();
 for(const member of anchors)member.send('ready',true);
 await page.getByRole('button',{name:'Ready to Row',exact:true}).click();
 await page.waitForFunction(()=>document.body.dataset.stage==='playing');
 checks.push({name:'four-ready launch focuses game surface',pass:await page.locator('canvas').evaluate(el=>document.activeElement===el)});
 for(const key of ['w','s','a','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']){
  await reset();await repeats(`hold ${key} repeats complete strokes`,key,key==='ArrowUp'?()=>page.locator('#menu-button').focus():async()=>{});
  const position=JSON.parse(await data('position')),q=JSON.parse(await data('rotation'));
  const yaw=Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z));
  const expected=(key==='w'||key==='ArrowUp')?position.z>.2:(key==='s'||key==='ArrowDown')?position.z<-.2:(key==='a'||key==='ArrowLeft')?yaw<-.1:yaw>.1;
  checks.push({name:`${key} requested physical direction`,z:position.z,yaw,pass:expected});
 }
 await reset();let count=await strokes();
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'W',code:'',bubbles:true})));
 await page.waitForTimeout(3800);
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keyup',{key:'W',code:'',bubbles:true})));
 checks.push({name:'uppercase key-only W repeats strokes',pass:await strokes()-count>=2});
 await reset();await page.keyboard.down('w');await page.keyboard.down('ArrowUp');await page.keyboard.up('w');count=await strokes();
 await page.waitForTimeout(3800);await page.keyboard.up('ArrowUp');
 checks.push({name:'releasing W leaves held Up alias rowing',pass:await strokes()-count>=2});
 await reset();count=await strokes();await page.keyboard.down('w');await hold('s',1800);await page.keyboard.up('w');
 checks.push({name:'opposite forward/reverse keys cancel',pass:await strokes()===count});
 await page.getByRole('button',{name:'Open game menu'}).click();count=await strokes();await hold('w',1800);
 checks.push({name:'open dialog blocks rowing',pass:await strokes()===count});
 await page.getByRole('button',{name:'Back to the River'}).click();await repeats('resume restores continuous rowing','w');
 await page.reload();await page.waitForFunction(()=>document.body.dataset.seat==='3');await repeats('reload retains seat and repeating arrows','ArrowUp');
 await page.keyboard.down('w');await page.waitForTimeout(800);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('w');await page.waitForTimeout(350);
 checks.push({name:'blur lifts blade and cancels held action',pass:(await blades())[seat].immersion===0});
 count=await strokes();await page.waitForTimeout(1900);checks.push({name:'no new catches after release',pass:await strokes()===count});
 await page.screenshot({path:'evidence/controls-fixed.png'});
 assert.deepEqual(errors,[]);
 const result={result:checks.every(c=>c.pass)?'PASS':'FAIL',mode:'friends',seat,checks,errors};console.log(JSON.stringify(result,null,2));
 await writeFile('evidence/controls-after.json',JSON.stringify(result,null,2));
 assert.equal(result.result,'PASS');
}finally{await browser.close();for(const member of anchors)await member.leave();}
