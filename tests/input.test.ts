import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaddleStroke, paddleKey } from '../src/client/input';

const sample = (keys: string[], seat = 0, time = 0.8) => {
  const stroke = new PaddleStroke();
  for (let t = 0; t < time; t += 1 / 60) stroke.sample(new Set(keys), seat, t);
  return stroke.sample(new Set(keys), seat, time);
};

test('WASD and arrows normalize including uppercase and key-only events; aliases stay distinct', () => {
  for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']) {
    assert.equal(paddleKey({code:key}),key);
    assert.equal(paddleKey({code:'',key}),key);
    assert.equal(paddleKey({code:'Unidentified',key}),key);
  }
  for (const letter of ['w','a','s','d']) {
    assert.equal(paddleKey({key:letter}),`Key${letter.toUpperCase()}`);
    assert.equal(paddleKey({key:letter.toUpperCase()}),`Key${letter.toUpperCase()}`);
  }
  assert.equal(paddleKey({code:'Space',key:' '}),undefined);
  assert.equal(paddleKey({code:'KeyQ',key:'q'}),undefined);
  assert.equal(paddleKey({key:'constructor'}),undefined);
});

test('Held actions repeat dry recovery and wet pulls; aliases agree and reversal mirrors travel', () => {
  for (const [arrow, letter] of [['ArrowUp','KeyW'],['ArrowDown','KeyS'],['ArrowLeft','KeyA'],['ArrowRight','KeyD']]) {
    for(let seat=0;seat<4;seat++) assert.deepEqual(sample([arrow!],seat),sample([letter!],seat));
  }
  const forward = new PaddleStroke(), reverse = new PaddleStroke();
  let catches=0,lastDip=0;
  for(let t=0;t<8;t+=1/30){
    const f=forward.sample(new Set(['KeyW']),0,t),r=reverse.sample(new Set(['KeyS']),0,t);
    assert(Math.abs(f.z+r.z)<1e-9);
    assert(Math.abs(f.z)<=.72&&Math.abs(f.x)<=1);
    if(f.dip&&!lastDip)catches++;
    lastDip=f.dip;
  }
  assert(catches>=4,`repeated catches=${catches}`);
});

test('Opposites cancel; aliases do not double speed or cancel each other; diagonal turns rest inner blade',()=>{
  assert.equal(sample(['KeyW','KeyS']).dip,0);
  assert.equal(sample(['ArrowLeft','KeyD']).dip,0);
  assert.deepEqual(sample(['KeyW','ArrowUp']),sample(['ArrowUp']));
  assert.equal(sample(['KeyW','KeyD'],1).dip,0);
  assert.equal(sample(['KeyW','KeyD'],0).dip,1);
  assert.equal(sample(['KeyW','KeyA'],0).dip,0);
  assert.equal(sample(['KeyW','KeyA'],1).dip,1);
  assert.equal(sample(['KeyW'],99).dip,0);
});

test('Release, reset, direction change and long scheduling gap restart with a raised blade',()=>{
  const stroke=new PaddleStroke();
  for(let t=0;t<.8;t+=1/60)stroke.sample(new Set(['KeyW']),0,t);
  assert.equal(stroke.sample(new Set(['KeyW']),0,.8).dip,1);
  assert.equal(stroke.sample(new Set(),0,.81).dip,0);
  assert.equal(stroke.sample(new Set(['KeyS']),0,.82).dip,0);
  assert.equal(stroke.reset().dip,0);
  assert.equal(stroke.sample(new Set(['KeyW']),0,5).dip,0);
  assert.equal(stroke.sample(new Set(['KeyW']),0,NaN).dip,0);
});

test('Cycle timing is independent of render frame rate and browser key-repeat frequency',()=>{
  const fast=new PaddleStroke(),slow=new PaddleStroke(),keys=new Set(['KeyW']);
  for(let tick=0;tick<=300;tick++){
    const a=fast.sample(keys,0,tick/60);
    if(tick%2===0)assert.deepEqual(slow.sample(keys,0,tick/60),a);
  }
});
