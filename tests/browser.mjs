import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.GAME_URL ?? 'http://localhost:5173';
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const pages = [];
const errors = [];
const evidence = { date: new Date().toISOString(), base, automated: true, humanPlaytest: false, checks: [] };
await mkdir('evidence', { recursive: true });
async function newPage(viewport = { width: 1440, height: 960 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage(); pages.push(page);
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const text = message.text();
    if(message.type()==='warning'||message.type()==='error')console.log('Browser:',text.slice(0,250));
    // The final two assertions deliberately request full/expired crew URLs.
    // Their 522 responses are the expected protocol result and the title UI
    // must handle them; WebGL and every other console error still fail.
    if((message.type()==='error'&&!/server responded with a status of 522/.test(text))||/GL_INVALID_(?:OPERATION|ENUM|VALUE)/.test(text))errors.push(text);
  });
  return page;
}
const data = (page, name) => page.locator('body').getAttribute(`data-${name}`);
const blades = async page => JSON.parse(await data(page, 'blades'));
try {
  const first = await newPage(); await first.goto(base);
  await first.locator('canvas').waitFor();
  assert.equal(await first.getByRole('main', { name: 'Main menu' }).isVisible(), true);
  assert.equal(await data(first, 'seat'), null);
  assert.equal(await first.getByRole('button',{name:'Practice',exact:true}).count(),0);
  assert.equal(await first.getByRole('button',{name:'Controls',exact:true}).count(),0);
  await first.screenshot({ path: 'evidence/game-title.png' });
  evidence.checks.push('Main menu appears before a room is created; only Play with Friends and Join Crew are shown; extra title text/buttons are absent');
  await first.getByRole('button', { name: 'Play with Friends', exact: true }).click();
  await first.waitForFunction(() => document.body.dataset.stage === 'lobby' && document.body.dataset.seat === '0');
  const invite = first.url();
  const lobbyTick = await data(first, 'tick');
  await first.keyboard.down('ArrowDown'); await first.waitForTimeout(200); await first.keyboard.up('ArrowDown');
  assert.equal(await data(first, 'tick'), lobbyTick);
  assert.equal(await first.getByRole('button', { name: 'Ready to Row' }).isEnabled(), false);
  await first.screenshot({ path: 'evidence/game-lobby.png' });
  for (let i = 1; i < 4; i++) {
    const page = await newPage({width:640,height:400});
    if (i === 1) {
      await page.goto(base);
      await page.getByRole('button', { name: 'Join Crew', exact: true }).click();
      await page.getByLabel('Crew invite link or code').fill(invite);
      await page.getByRole('button', { name: 'Join Boat' }).click();
    } else await page.goto(invite);
    await page.waitForFunction(seat => document.body.dataset.seat === String(seat), i);
    await page.getByRole('button',{name:'Open game menu'}).click();
    await page.getByLabel('Lower graphics').check();
    await page.getByRole('button',{name:'Back to the River'}).click();
  }
  const crew = pages.slice(0, 4);
  await first.waitForFunction(() => document.querySelectorAll('.crew-seat.connected').length === 4);
  evidence.checks.push('Private crew is frozen safely at the dock; join form and invite links allocate four distinct seats');
  for (const page of crew.slice(0, 3)) await page.getByRole('button', { name: 'Ready to Row', exact: true }).click();
  assert.equal(await data(first, 'stage'), 'lobby');
  await crew[3].getByRole('button', { name: 'Ready to Row', exact: true }).click();
  await Promise.all(crew.map(page => page.waitForFunction(() => document.body.dataset.stage === 'playing')));
  assert.equal(await first.getByRole('button').count(), 1);
  evidence.checks.push('Four ready clients launch; ordinary gameplay shows only the small menu button');

  console.log('Four clients ready. Verifying own-seat input.');
  const initial = await blades(first);
  await first.mouse.move(400, 300); await first.mouse.down(); await first.mouse.move(700, 650, { steps: 12 }); await first.mouse.up();
  await first.waitForTimeout(200);
  const afterMouse = await blades(first);
  assert(afterMouse,`Crew disconnected during input check: ${await first.locator('#menu-message').textContent()} / code ${await data(first,'disconnect-code')}`);
  for (let i = 0; i < 4; i++) {
    assert(Math.abs(initial[i].x - afterMouse[i].x) < 0.001);
    assert(Math.abs(initial[i].z - afterMouse[i].z) < 0.001);
  }
  const oldStrokes=Number(await data(first,'strokes'));
  await first.keyboard.down('ArrowUp'); await first.waitForTimeout(4000); await first.keyboard.up('ArrowUp');
  await first.waitForFunction(old => Number(document.body.dataset.strokes) >= old+2,oldStrokes);
  const afterUp = await blades(first);
  for (let i = 1; i < 4; i++) assert(Math.abs(afterUp[i].z - initial[i].z) < 0.001);
  await first.screenshot({ path: 'evidence/game-playing.png' });
  evidence.checks.push('Mouse has no paddle effect; holding Up alone repeats at least two server-confirmed strokes on the local seat');

  const tick = Number(await data(first, 'tick'));
  await first.reload();
  await first.waitForFunction(old => document.body.dataset.seat === '0' && Number(document.body.dataset.tick) > old, tick);
  evidence.checks.push('Refresh rejoins the same crew and seat');
  await first.keyboard.press('Escape');
  await first.getByLabel('Sound effects',{exact:true}).uncheck();
  await first.waitForFunction(()=>document.body.dataset.audioEnabled==='false');
  await first.getByLabel('Sound effects',{exact:true}).check();
  await first.waitForFunction(()=>document.body.dataset.audioState==='running' && document.body.dataset.audioEnabled==='true');
  await first.getByLabel('Gentler camera').check(); await first.getByLabel('Lower graphics').check();
  await first.getByRole('button', { name: 'Return to Checkpoint', exact: true }).click();
  const layouts = [];
  for (const [width, height] of [[907, 510], [700, 982], [480, 900]]) {
    await first.setViewportSize({ width, height }); await first.waitForTimeout(150);
    await first.screenshot({ path: `evidence/game-${width}x${height}.png` });
    const bounds = JSON.parse(await first.locator('canvas').getAttribute('data-boat-bounds'));
    assert(bounds.left > 0.05 && bounds.right < 0.95 && bounds.top > 0.1 && bounds.bottom < 0.85, JSON.stringify({ width, height, bounds }));
    assert.equal(await first.getByRole('button').count(), 1);
    layouts.push({ width, height, bounds });
  }
  evidence.checks.push('Boat and paddles remain framed in landscape and portrait, with no permanent HUD panels');
  await first.setViewportSize({ width: 1440, height: 960 });

  // Drive the real boat into an authored rock using four real input streams.
  // No teleport, damage command or test-only game endpoint is used.
  let didBreak = false;
  const crashSignal = first.waitForFunction(() => ['breaking','sunk'].includes(document.body.dataset.condition), undefined, { timeout: 90000 }).then(() => { didBreak = true; }).catch(() => {});
  await Promise.all(crew.map(page => page.keyboard.down('w')));
  for (let cycle = 0; cycle < 65 && !didBreak; cycle++) {
    await Promise.race([first.waitForTimeout(1000), crashSignal]);
    if(['breaking','sunk'].includes(await data(first,'condition')))didBreak=true;
  }
  await Promise.all(crew.map(page=>page.keyboard.up('w')));
  assert(didBreak, `Expected physical rock collision; position=${await data(first, 'position')}`);
  const firstFailureCondition=await data(first,'condition');
  evidence.firstObservedFailure=firstFailureCondition;
  await first.screenshot({ path: `evidence/game-${firstFailureCondition}.png` });
  await Promise.all(crew.map(page => page.waitForFunction(() => document.body.dataset.condition === 'sunk')));
  const crashIds = await Promise.all(crew.map(page => data(page, 'crash-id')));
  assert.equal(new Set(crashIds).size, 1);
  await first.screenshot({ path: 'evidence/game-sunk.png' });
  console.log('Shared sink confirmed; checking refresh during failure.');
  await first.reload();
  await first.waitForFunction(() => document.body.dataset.seat === '0' && document.body.dataset.condition === 'sunk');
  console.log('Refresh retained the wreck; sending checkpoint retry.');
  await first.getByRole('button', { name: 'Retry Checkpoint', exact: true }).click();
  await first.waitForTimeout(200);
  console.log('Conditions after retry:', await Promise.all(crew.map(page => data(page, 'condition'))));
  await Promise.all(crew.map(page => page.waitForFunction(() => document.body.dataset.condition === 'afloat')));
  evidence.checks.push('Actual rock contact produces one shared break/sink event; refresh retains the wreck and one retry restores the crew checkpoint');

  const extra = await newPage(); await extra.goto(invite);
  await extra.getByRole('main', { name: 'Main menu' }).waitFor();
  await extra.waitForFunction(() => document.getElementById('menu-message').textContent.includes('Couldn’t join'));
  assert.equal(await data(extra, 'seat'), null);
  await extra.goto(`${base}/?crew=expiredBoat0`);
  await extra.waitForFunction(() => document.getElementById('menu-message').textContent.includes('Couldn’t join'));
  assert.equal(await data(extra, 'seat'), null);
  evidence.checks.push('Full/expired invites return an actionable title-menu error and never create an unrelated crew');
  evidence.seats = await Promise.all(crew.map(page => data(page, 'seat')));
  evidence.layouts = layouts; evidence.browser = browser.version(); evidence.errors = errors;
  assert.deepEqual(errors, []); evidence.result = 'PASS';
  await writeFile('evidence/browser.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  evidence.result = 'FAIL'; evidence.error = String(error); evidence.errors = errors;
  await writeFile('evidence/browser.json', JSON.stringify(evidence, null, 2));
  for (const [i, page] of pages.entries()) await page.screenshot({ path: `evidence/failure-${i}.png` }).catch(() => {});
  throw error;
} finally {
  for (const page of pages) {
    await page.getByRole('button', { name: 'Open game menu' }).click({ timeout: 500 }).catch(() => {});
    await page.locator('#leave').click({ timeout: 500 }).catch(() => {});
  }
  await browser.close();
}
