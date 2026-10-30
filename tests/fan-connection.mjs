import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.GAME_URL??'http://localhost:2571/',checks=[],errors=[];
const stale={game:'Bad at Boating',protocol:3,physics:'basin-0.5',world:'waterworks-1',status:'ready'};
const context=await browser.newContext({viewport:{width:1000,height:800}}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
let health='legacy',matchmaking=0,race=false;
await context.route('**/health',route=>{
  if(health==='healthy')return route.continue();
  return route.fulfill({status:health==='unavailable'?503:200,contentType:'application/json',body:health==='malformed'?'<html>':JSON.stringify(stale)});
});
await context.route('**/matchmake/**',route=>{
  matchmaking++;
  if(race)return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:4212,error:'provided room name "fan-raft" not defined'})});
  return route.continue();
});
async function submit(expected){
  await page.locator('#name-submit').click();await page.waitForFunction(text=>document.querySelector('#name-message').textContent.includes(text)&&!document.querySelector('#name-submit').disabled,expected);
  assert(await page.locator('#name-dialog').isVisible());assert(await page.locator('#name-submit').isEnabled());
  assert.equal(await page.locator('#player-name').inputValue(),'Uday');assert(!(await page.locator('#notice').isVisible()));
  assert(!(await page.locator('#name-message').textContent()).includes('fan-raft'));
}
try {
  await page.goto(base);await page.locator('#play-friends').click();await page.locator('#player-name').fill('Uday');
  await submit('being updated');assert.equal(matchmaking,0);
  await page.screenshot({path:'evidence/fan-deploy-stale.png'});
  health='unavailable';await submit('Could not reach');assert.equal(matchmaking,0);
  health='malformed';await submit('Could not reach');assert.equal(matchmaking,0);
  checks.push('Legacy protocol3/no-fan health,503 and malformed JSON: no room request; clear accessible message, retained name and working retry');
  health='healthy';race=true;await submit('being updated');assert.equal(matchmaking,1);race=false;
  checks.push('Worker switches between health and matchmaking: raw room-not-defined error is translated');
  await page.locator('#name-submit').click();await page.waitForFunction(()=>document.body.dataset.stage==='lobby');
  assert.equal(await page.locator('.crew-label.mine').textContent(),'You');assert.equal(await page.locator('#ready').textContent(),'Ready');
  const invite=page.url();await page.screenshot({path:'evidence/fan-deploy-joined.png'});
  checks.push('Same form/name retries successfully into a real fan room after server recovery');
  const guestContext=await browser.newContext(),guest=await guestContext.newPage();let guestMatchmaking=0;
  guest.on('pageerror',e=>errors.push(e.message));
  await guestContext.route('**/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stale)}));
  guest.on('request',r=>{if(r.url().includes('/matchmake/'))guestMatchmaking++;});
  await guest.goto(invite);await guest.locator('#player-name').fill('Mira');await guest.locator('#name-submit').click();
  await guest.waitForFunction(()=>document.querySelector('#name-message').textContent.includes('being updated'));assert.equal(guestMatchmaking,0);
  await guestContext.unroute('**/health');await guest.locator('#name-submit').click();await guest.waitForFunction(()=>document.body.dataset.stage==='lobby');
  await page.waitForFunction(()=>document.querySelector('#crew-count').textContent==='2 / 4 aboard');
  assert((await page.locator('#crew-labels').textContent()).includes('Mira'));await guestContext.close();
  checks.push('Invite join uses the same preflight guard, then joins the actual crew on retry');
  await page.locator('#menu-button').click();await page.locator('#leave').click();
  await page.locator('#practice').waitFor();health='legacy';await page.locator('#practice').click();await page.locator('#player-name').fill('Uday');
  const before=matchmaking;await submit('being updated');assert.equal(matchmaking,before);health='healthy';
  await page.locator('#name-submit').click();await page.waitForFunction(()=>document.body.dataset.stage==='playing');
  checks.push('Solo practice also rejects stale backend and recovers to actual gameplay');
  const saved=await page.evaluate(()=>sessionStorage.getItem('fan-raft-session')),seat=await page.getAttribute('body','data-seat');
  const requestCount=matchmaking;health='legacy';await page.reload();
  await page.waitForFunction(()=>document.querySelector('#menu-message').textContent.includes('Reload this page to rejoin.'));
  assert.equal(matchmaking,requestCount);assert.equal(await page.evaluate(()=>sessionStorage.getItem('fan-raft-session')),saved);
  assert(!(await page.locator('#name-dialog').isVisible()));
  health='healthy';await page.reload();await page.waitForFunction(()=>document.body.dataset.stage==='playing');
  assert.equal(await page.getAttribute('body','data-seat'),seat);assert(!(await page.locator('#name-dialog').isVisible()));
  checks.push('Stale health during reload preserves the reconnect token; a later healthy reload restores the reserved seat without a duplicate join/name prompt');
  assert.deepEqual(errors,[]);
  const result={result:'PASS',browser:browser.version(),checks,errors,scope:'Native request interception reproduces the exact observed public health mismatch; healthy recovery uses the real local authority. Not a public rollout.'};
  await writeFile('evidence/fan-deploy-browser.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}catch(e){await page.screenshot({path:'evidence/fan-deploy-failure.png'}).catch(()=>{});throw e;}
finally{await browser.close();}
