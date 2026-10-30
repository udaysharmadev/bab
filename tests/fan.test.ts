import {before,test} from 'node:test';
import assert from 'node:assert/strict';
import {initPhysics} from '../src/shared/simulation';
import {FanSimulation} from '../src/shared/fan-simulation';
import {rotate} from '../src/shared/protocol';
import {FAN_SEATS,FAN_SLIDE,FAN_RAILS,FAN_ROCKS,FAN_CHECKPOINTS,COURSE_END,fanCentre,railPosition,validFanInput} from '../src/shared/fan';
import {FanControls,fanKey} from '../src/client/fan-input';
import RAPIER from '@dimforge/rapier3d-compat';

before(initPhysics);
function settled() {const s=new FanSimulation(0,false);for(let i=0;i<240;i++)s.step();return s;}
function activate(s:FanSimulation,seats:number[]) {for(const seat of seats){s.setActive(seat,true);assert(s.accept(seat,{seq:1,fan:false,scoot:0}));}}
function command(s:FanSimulation,seats:number[],ticks:number,fan=true,scoot=0) {
  for(let i=0;i<ticks;i++){for(const seat of seats)s.accept(seat,{seq:s.fans[seat]!.input.seq+1,fan,scoot});s.step();}
}

test('Checkpoint retry retains current-run flaps; a fresh round clears its timer and all flap counters',()=>{
  const s=settled();try {
    activate(s,[2]);command(s,[2],90);assert(s.fans[2]!.strokes>0);
    const strokes=s.fans[2]!.strokes,ticks=s.activeTicks;s.reset();
    assert.equal(s.fans[2]!.strokes,strokes);assert.equal(s.activeTicks,ticks);
    s.reset(true);assert(s.fans.every(f=>f.strokes===0));assert.equal(s.activeTicks,0);
    assert(s.fans.every(f=>f.power===0&&f.needsNeutral));
  }finally{s.dispose();}
});

test('Fan input rejects forged seats, nonfinite values, stale/oversized sequences and extra force; touch/keyboard aliases stay independent',()=>{
  assert(validFanInput({seq:1,fan:true,scoot:0},0));
  for(const v of [{seq:0,fan:true,scoot:0},{seq:10001,fan:true,scoot:0},{seq:1,fan:1,scoot:0},{seq:1,fan:true,scoot:NaN},{seq:1,fan:true,scoot:Infinity},{seq:1,fan:true,scoot:2},{seq:1,fan:true,scoot:0,seat:3},{seq:1,fan:true,scoot:0,force:9999}])assert(!validFanInput(v,0));
  const input=new FanControls();input.keys.add('KeyA');input.keys.add('ArrowLeft');input.keys.delete('KeyA');assert.equal(input.action().scoot,-1);
  input.touches.set(2,'KeyD');assert.equal(input.action().scoot,0);input.touches.set(3,'Space');assert(input.action().fan);
  input.keys.add('Space');input.touches.delete(3);assert(input.action().fan);input.clear();assert.deepEqual(input.action(),{fan:false,scoot:0});
  assert.equal(fanKey({key:'A'}),'KeyA');assert.equal(fanKey({key:' '}),'Space');assert.equal(fanKey({code:'KeyW',key:'w'}),undefined);
});

test('Each fan pushes opposite its air at four headings, without a hidden centred yaw command',()=>{
  const results=[];
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])for(let seat=0;seat<4;seat++) {
    const s=settled();try {
      s.hull.setRotation({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)},true);activate(s,[seat]);command(s,[seat],90);
      const d=rotate({x:FAN_SEATS[seat]!.x,y:0,z:FAN_SEATS[seat]!.z}, {x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}),v=s.hull.linvel();
      assert(v.x*d.x+v.z*d.z<-.2,`seat ${seat} yaw ${yaw}: ${JSON.stringify(v)}`);
      assert(Math.abs(v.x*d.z-v.z*d.x)<.035,'Reaction follows the visible air direction');
      assert(Math.abs(s.hull.angvel().y)<.02,'Centred radial force has no injected yaw');
      results.push({seat,yaw,speed:Math.hypot(v.x,v.z)});
    }finally{s.dispose();}
  }
  console.log(JSON.stringify({case:'fan-opposite-thrust',cases:results}));
});

test('Opposite fans and four equal radial fans cancel; scooting alone adds no horizontal propulsion',()=>{
  for(const seats of [[0,3],[1,2],[0,1,2,3]]) {
    const s=settled();try{activate(s,seats);command(s,seats,180);assert(Math.hypot(s.hull.translation().x,s.hull.translation().z)<.002);assert(Math.abs(s.hull.angvel().y)<.01);}finally{s.dispose();}
  }
  const s=settled();try{activate(s,[0]);command(s,[0],120,false,1);assert.equal(s.fans[0]!.slide,FAN_SLIDE);assert(Math.hypot(s.hull.translation().x,s.hull.translation().z)<.002);}finally{s.dispose();}
});

test('Small player offsets reverse actual torque at every station and stay bounded',()=>{
  const values=[];
  for(let seat=0;seat<4;seat++)for(const direction of [-1,1]) {
    const s=settled();try{activate(s,[seat]);command(s,[seat],60,false,direction);command(s,[seat],60);
      const yaw=s.hull.angvel().y;assert(yaw*direction<-.02,`seat ${seat} offset ${direction}: yaw ${yaw}`);
      assert(Math.abs(s.fans[seat]!.slide)<=FAN_SLIDE);assert(Math.abs(s.hull.linvel().y)<.3);values.push({seat,direction,yaw});
    }finally{s.dispose();}
  }
  console.log(JSON.stringify({case:'fan-offset-torque',values}));
});

test('Fan cadence is simulation-owned; release/staleness/pause cannot replay held power',()=>{
  const a=settled(),b=settled();try{
    activate(a,[2]);activate(b,[2]);
    for(let i=0;i<180;i++){
      for(const s of [a,b])for(let n=0;n<(s===a?1:10);n++)s.accept(2,{seq:s.fans[2]!.input.seq+1,fan:true,scoot:0});a.step();b.step();
    }
    assert.equal(a.fans[2]!.strokes,b.fans[2]!.strokes);assert.deepEqual({...a.hull.translation()},{...b.hull.translation()});
    assert(a.fans[2]!.strokes>=4&&a.fans[2]!.strokes<=5);
    command(a,[2],60,false);assert.equal(a.fans[2]!.power,0);const count=a.fans[2]!.strokes;
    for(let i=0;i<120;i++)a.step();assert.equal(a.fans[2]!.strokes,count);assert.equal(a.fans[2]!.power,0);
    assert(!a.accept(2,{seq:a.fans[2]!.input.seq+1,fan:true,scoot:0}),'Timed out held input needs neutral');
    assert(a.accept(2,{seq:a.fans[2]!.input.seq+1,fan:false,scoot:0}));command(a,[2],20,true);a.releaseInputs();
    assert.equal(a.fans[2]!.power,0);assert(!a.accept(2,{seq:a.fans[2]!.input.seq+1,fan:true,scoot:0}));
  }finally{a.dispose();b.dispose();}
});

test('Production still-water raft glides after release then settles; stronger strokes coast farther without idle propulsion',()=>{
  const cases=[];
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])for(let seat=0;seat<4;seat++) {
    const s=new FanSimulation(undefined,false);try {
      for(let t=0;t<240;t++)s.step();
      s.hull.setRotation({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)},true);
      activate(s,[seat]);command(s,[seat],18);assert.equal(s.fans[seat]!.strokes,1);
      const start={...s.hull.translation()},releaseSpeed=Math.hypot(s.hull.linvel().x,s.hull.linvel().z);
      assert(releaseSpeed>.3,'A stroke must still impart visible momentum');
      let stop=0;
      for(let t=1;t<=420;t++) {
        command(s,[seat],1,false);const speed=Math.hypot(s.hull.linvel().x,s.hull.linvel().z);
        if(t===30)assert(speed>.1&&speed<releaseSpeed,'Release coasts; it does not brake instantly');
        if(speed===0&&stop===0)stop=t/60;
      }
      const end=s.hull.translation(),distance=Math.hypot(end.x-start.x,end.z-start.z);
      assert(stop>1&&stop<5,`Release must settle in under5s: ${stop}`);
      assert(distance>.3&&distance<1.2,`Single-stroke coast: ${distance}`);
      assert.equal(Math.hypot(s.hull.linvel().x,s.hull.linvel().z),0);
      cases.push({seat,yaw,releaseSpeed,coastMetres:distance,stopSeconds:stop});
    }finally{s.dispose();}
  }
  const distances=[];
  for(const hold of [18,120]) {
    const s=new FanSimulation(undefined,false);try {
      for(let i=0;i<240;i++)s.step();activate(s,[2,3]);command(s,[2,3],hold);
      const start={...s.hull.translation()};command(s,[2,3],480,false);
      distances.push(Math.hypot(s.hull.translation().x-start.x,s.hull.translation().z-start.z));
      assert.equal(Math.hypot(s.hull.linvel().x,s.hull.linvel().z),0);
    }finally{s.dispose();}
  }
  assert(distances[1]!>distances[0]!+.2,'More momentum must coast farther, without a fixed travel cap');
  const idle=new FanSimulation(undefined,false);try {
    idle.hull.setTranslation({x:3,y:-.08,z:50},true);for(let i=0;i<1200;i++)idle.step();
    assert.equal(idle.hull.translation().x,3);assert.equal(idle.hull.translation().z,50,'No downstream or centre-seeking motor');
    activate(idle,[2]);command(idle,[2],60,false,1);command(idle,[2],42);
    assert(Math.abs(idle.hull.angvel().y)>.02);command(idle,[2],480,false);
    assert.equal(idle.hull.angvel().y,0,'Offset stroke spin also settles');
    assert.equal(Math.hypot(idle.hull.linvel().x,idle.hull.linvel().z),0);
    assert.equal(idle.condition,'afloat');
  }finally{idle.dispose();}
  console.log(JSON.stringify({case:'fan-release-coast',cases,pairCoastMetres:distances}));
});

test('Sampled buoyancy stays finite, rights a heel and bounds repeated simultaneous thrust',()=>{
  const s=new FanSimulation(0,false);try {
    const angle=.4;s.hull.setRotation({x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)},true);
    for(let i=0;i<1800;i++)s.step();assert.equal(s.condition,'afloat');assert(Math.abs(s.hull.translation().y)<.2);
    assert(rotate({x:0,y:1,z:0},s.hull.rotation()).y>.98);
    activate(s,[0,1,2,3]);command(s,[0,1,2,3],60,false,1);
    let maxSpeed=0,maxYaw=0;
    for(let i=0;i<3600;i++){command(s,[0,1,2,3],1);maxSpeed=Math.max(maxSpeed,Math.hypot(s.hull.linvel().x,s.hull.linvel().z));maxYaw=Math.max(maxYaw,Math.abs(s.hull.angvel().y));}
    assert.equal(s.condition,'afloat');assert(maxSpeed<1);assert(maxYaw<2);console.log(JSON.stringify({case:'fan-buoyancy-60s',maxSpeed,maxYaw,y:s.hull.translation().y}));
  }finally{s.dispose();}
});

test('Real spike contacts including a fast approach fail once, ordinary rocks/banks bump, retry is clear, and finish freezes',()=>{
  for(const speed of [2,20]) {
    const s=new FanSimulation(0);try {
      const rail=FAN_RAILS[0]!,p=railPosition(rail);s.hull.setTranslation({x:p.x+3.5,y:-.08,z:p.z},true);s.hull.setLinvel({x:-speed,y:0,z:0},true);
      // Keep approaching at low speed: stronger drag can safely arrest an unpowered near miss.
      activate(s,[1,3]);
      for(let i=0;i<180&&s.condition==='afloat';i++)command(s,[1,3],1);assert.equal(s.condition,'wrecked');assert.equal(s.obstacle,rail.id);assert.equal(s.crashId,1);
      for(let i=0;i<60;i++)s.step();assert.equal(s.crashId,1);
      s.checkpoint=1;s.reset();assert.equal(s.hull.translation().z,FAN_CHECKPOINTS[1]);s.step();assert.equal(s.condition,'afloat');
    }finally{s.dispose();}
  }
  const s=new FanSimulation(0);try {
    const rock=FAN_ROCKS[0]!;s.hull.setTranslation({x:fanCentre(rock.z)+rock.offset+2.7,y:-.08,z:rock.z},true);s.hull.setLinvel({x:-3,y:0,z:0},true);
    for(let i=0;i<90;i++)s.step();assert.equal(s.condition,'afloat');assert.equal(s.crashId,0);
    s.hull.setTranslation({x:6,y:-.08,z:0},true);s.hull.setLinvel({x:3,y:0,z:0},true);for(let i=0;i<90;i++)s.step();assert.equal(s.condition,'afloat');
    s.hull.setTranslation({x:fanCentre(COURSE_END),y:-.08,z:COURSE_END+.1},true);s.step();assert(!s.complete,'Finish requires the course checkpoint');
    s.checkpoint=1;s.step();assert(s.complete);
    const tick=s.tick,position={...s.hull.translation()};for(let i=0;i<60;i++)s.step();assert.equal(s.tick,tick);assert.deepEqual({...s.hull.translation()},position);
  }finally{s.dispose();}
});

test('A four-seat input pilot traverses the complete feel course without teleports or resets',()=>{
  const s=new FanSimulation();try {
    activate(s,[0,1,2,3]);let maxSpeed=0;
    const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
    const routeX=(z:number)=>fanCentre(z)+3.8*smooth(80,89,z)*(1-smooth(102,115,z))-1.1*smooth(116,122,z)*(1-smooth(130,138,z));
    for(let i=0;i<12000&&!s.complete&&s.condition==='afloat';i++) {
      if(i%6===0) {
        const p=s.hull.translation(),v=s.hull.linvel(),targetZ=p.z+4;
        const vx=Math.max(-1.4,Math.min(1.4,(routeX(targetZ)-p.x)*.8)),vz=2.05;
        for(let seat=0;seat<4;seat++) {
          const d=rotate({x:-FAN_SEATS[seat]!.x,y:0,z:-FAN_SEATS[seat]!.z},s.hull.rotation());
          s.accept(seat,{seq:s.fans[seat]!.input.seq+1,fan:(vx-v.x)*d.x+(vz-v.z)*d.z>.1,scoot:0});
        }
      }
      s.step();maxSpeed=Math.max(maxSpeed,Math.hypot(s.hull.linvel().x,s.hull.linvel().z));
    }
    assert.equal(s.condition,'afloat',`Pilot hit ${s.obstacle} at ${JSON.stringify(s.hull.translation())}`);
    assert(s.complete,`Pilot incomplete at ${JSON.stringify(s.hull.translation())}`);assert.equal(s.checkpoint,1);assert.equal(s.resetId,0);
    const seconds=s.activeTicks/60;assert(seconds>=120&&seconds<=170,`Still-water slice pilot duration ${seconds}`);
    console.log(JSON.stringify({case:'fan-course-pilot',seconds,maxSpeed,checkpoint:s.checkpoint,strokes:s.fans.map(f=>f.strokes),scope:'Synthetic input reachability/pacing, not human fun or complete-game duration'}));
  }finally{s.dispose();}
});

test('Predicted spike near misses remain safe until real touch; the actual moving sweeper can strike the raft',()=>{
  const s=new FanSimulation(0,false);try {
    const wall=s.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,1,1).setTranslation(1.85+.1+.008,0,0));
    s.hazards.set(wall.handle,'qa-tooth');
    for(let i=0;i<4;i++)s.step();assert.equal(s.condition,'afloat','Prediction distance is not a lethal contact');
    let predicted=false;s.world.contactPair(s.collider,wall,m=>{if(m.numContacts()>0)predicted=true;});
    assert(predicted,'The separated pair already exists before the actual touch');
    wall.setTranslation({x:1.945,y:0,z:0});
    for(let i=0;i<90&&s.condition==='afloat';i++)s.step();assert.equal(s.condition,'wrecked');assert.equal(s.obstacle,'qa-tooth');
  }finally{s.dispose();}
  const moving=new FanSimulation(0);try {
    const body=moving.sweeper!;const p=body.translation();moving.hull.setTranslation({x:p.x+3.3,y:-.08,z:p.z-3},true);
    for(let i=0;i<180&&moving.condition==='afloat';i++)moving.step();
    assert.equal(moving.condition,'wrecked');assert.equal(moving.obstacle,'spiked-sweeper');
  }finally{moving.dispose();}
});
