import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DockRehearsal} from '../src/client/rehearsal';
import {SEATS} from '../src/shared/protocol';

test('Dock rehearsal shows wet pulls and dry returns for every seat, with bounded travel at30/60Hz',()=>{
  for(const rate of [30,60])for(let seat=0;seat<4;seat++){
    const preview=new DockRehearsal(),station=SEATS[seat]!;
    let wet=0,dry=0,previous;
    for(let tick=0;tick<rate*6;tick++){
      const point=preview.sample({forward:1,turn:0},seat,tick/rate,1/rate)!;
      assert(Math.abs(point.x-station.side*1.45)<=.35);
      assert(Math.abs(point.z-station.z)<=.8);
      assert(point.y>=-.431&&point.y<=.621);
      if(point.y<-.2)wet++;if(point.y>.5)dry++;
      if(previous){assert(Math.abs(point.z-previous.z)<=2.7*1.1/rate+1e-9);assert(Math.abs(point.y-previous.y)<=5*1.05/rate+1e-9);}
      previous=point;
    }
    assert(wet>rate&&dry>rate,'Repeated hold must demonstrate multiple catches and recoveries');
  }
});

test('Dock rehearsal reverse mirrors forward and a turn moves only the expected side',()=>{
  for(let seat=0;seat<4;seat++){
    const forward=new DockRehearsal(),reverse=new DockRehearsal(),turn=new DockRehearsal(),mixed=new DockRehearsal();
    for(let tick=0;tick<180;tick++){
      const f=forward.sample({forward:1,turn:0},seat,tick/60,1/60)!;
      const r=reverse.sample({forward:-1,turn:0},seat,tick/60,1/60)!;
      assert(Math.abs(f.z+r.z-2*SEATS[seat]!.z)<1e-9);assert.equal(f.y,r.y);
      const t=turn.sample({forward:0,turn:1},seat,tick/60,1/60)!;
      assert(Math.abs(t.z-(SEATS[seat]!.side>0?f:r).z)<1e-9);
      const m=mixed.sample({forward:1,turn:1},seat,tick/60,1/60)!;
      if(SEATS[seat]!.side<0)assert.equal(m.y,.62);
    }
  }
});

test('Dock rehearsal releases, clears on seat/time discontinuity and rejects invalid samples',()=>{
  const preview=new DockRehearsal();
  for(let tick=0;tick<=48;tick++)preview.sample({forward:1,turn:0},0,tick/60,1/60);
  assert(preview.sample({forward:1,turn:0},0,.81,1/60)!.y<0);
  for(let tick=0;tick<20;tick++)preview.sample({forward:0,turn:0},0,.82+tick/60,1/60);
  assert.equal(preview.sample({forward:0,turn:0},0,1.16,1/60)!.y,.62);
  preview.clear();assert.equal(preview.sample({forward:1,turn:0},0,2,1/60)!.y,.62);
  assert.equal(preview.sample({forward:1,turn:0},0,10,1/60)!.y,.62,'Long gap starts raised');
  assert.equal(preview.sample({forward:1,turn:0},1,10.01,1/60)!.y,.62,'New seat starts raised');
  assert.equal(preview.sample({forward:1,turn:0},1,3,1/60)!.y,.62,'Backwards clock starts raised');
  for(const [seat,now,dt]of [[99,3,1/60],[0,NaN,1/60],[0,3,Infinity]])assert.equal(preview.sample({forward:1,turn:0},seat!,now!,dt!),undefined);
});
