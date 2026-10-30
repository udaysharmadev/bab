import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_KEYS, PaddleInput, PaddleStroke, paddleKey, validBindings, controllerAction } from '../src/client/input';
import { validateRowIntent } from '../src/shared/protocol';

const sample = (keys: string[], seat = 0, time = 0.8) => {
  const stroke = new PaddleStroke();
  for (let t = 0; t < time; t += 1 / 60) stroke.sample(new Set(keys), seat, t);
  return stroke.sample(new Set(keys), seat, time);
};

test('Held-action messages reject forged axes, stale sequences and seat/force overrides', () => {
  assert(validateRowIntent({seq:1,forward:1,turn:-1},0));
  for (const message of [null, {seq:0,forward:1,turn:0}, {seq:10001,forward:1,turn:0},
    {seq:1,forward:NaN,turn:0}, {seq:1,forward:1,turn:.5}, {seq:1,forward:2,turn:0},
    {seq:1,forward:1,turn:0,seat:3}, {seq:1,forward:1,turn:0,thrust:999}, {seq:1,forward:1}]) {
    assert.equal(validateRowIntent(message,0),false);
  }
});

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
  for (let seat=0;seat<4;seat++) {
    assert.equal(sample(['KeyW','KeyD'],seat).dip,seat%2===0?0:1);
    assert.equal(sample(['KeyW','KeyA'],seat).dip,seat%2===0?1:0);
  }
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

test('Keyboard and multiple touch pointers retain independent held actions', () => {
  const input = new PaddleInput();
  input.keyboard.add('KeyW'); input.touches.set(1, 'KeyW'); input.touches.set(2, 'KeyD');
  assert.deepEqual(input.action(), {forward:1, turn:1});
  input.touches.delete(1);
  assert.deepEqual(input.action(), {forward:1, turn:1});
  input.keyboard.clear();
  assert.deepEqual(input.action(), {forward:0, turn:1});
  input.touches.set(3, 'KeyD'); input.touches.delete(2);
  assert.deepEqual(input.action(), {forward:0, turn:1});
  input.clear(); assert.deepEqual(input.action(), {forward:0, turn:0});
});

test('Remapped keys preserve arrow aliases, reject duplicates and ignore replaced defaults', () => {
  const keys = {forward:'KeyI',reverse:'KeyK',left:'KeyJ',right:'KeyL'};
  assert(validBindings(keys)); assert(validBindings(DEFAULT_KEYS));
  for (const value of [null, {}, {...keys,left:'KeyI'}, {...keys,forward:'Escape'}, {...keys,extra:'KeyQ'}]) assert(!validBindings(value));
  assert.equal(paddleKey({code:'KeyI'},keys),'KeyW');
  assert.equal(paddleKey({key:'K'},keys),'KeyS');
  assert.equal(paddleKey({code:'ArrowLeft'},keys),'ArrowLeft');
  assert.equal(paddleKey({code:'KeyW',key:'w'},keys),undefined);
  assert.equal(paddleKey({key:'constructor'},keys),undefined);
  assert.equal(paddleKey({code:'Digit2'},{...keys,right:'Digit2'}),'KeyD');
});

test('Controller input has bounded digital axes, deadzone, independent ownership and neutral rearming', () => {
  const pad = {connected:true,mapping:'standard' as const,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
  const input = new PaddleInput();
  pad.axes=[0,-1]; input.updateController(pad,true);
  assert.deepEqual(input.action(),{forward:0,turn:0},'A held stick cannot activate on first connection');
  pad.axes=[.2,-.3]; input.updateController(pad,true);
  pad.axes=[1,-1]; assert(input.updateController(pad,true));
  assert.deepEqual(input.action(),{forward:1,turn:1});
  input.keyboard.add('KeyS'); assert.deepEqual(input.action(),{forward:0,turn:1});
  input.keyboard.clear(); input.clear(); input.updateController(pad,true);
  assert.deepEqual(input.action(),{forward:0,turn:0},'Menu/blur clear requires returning to neutral');
  pad.axes=[0,0]; input.updateController(pad,true); pad.buttons[12]!.pressed=true;
  input.updateController(pad,true); assert.equal(input.action().forward,1);
  pad.buttons[12]!.pressed=false; input.updateController(pad,true); assert.equal(input.action().forward,0);
  input.updateController({...pad,connected:false},true); assert.equal(input.action().turn,0);
  assert.deepEqual(controllerAction({...pad,axes:[NaN,Infinity]}),{forward:0,turn:0});
  assert.deepEqual(controllerAction({...pad,mapping:''}),{forward:0,turn:0});
  pad.axes=[0,-1]; input.updateController(pad,false); input.updateController(pad,true);
  assert.equal(input.action().forward,0,'A disabled controller cannot rearm while held');
});
