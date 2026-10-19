import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { BoatSimulation, initPhysics } from '../src/shared/simulation';
import { DT, rotate } from '../src/shared/protocol';
import { PaddleStroke, rowingAction } from '../src/client/input';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { riverCamera } from '../src/client/camera';

before(initPhysics);
function row(key: string | string[], seats=[0,1,2,3], seconds=6.8) {
  const sim=new BoatSimulation(true), controllers=seats.map(()=>new PaddleStroke());
  for(const seat of seats)sim.setActive(seat,true);
  for(let i=0;i<120;i++)sim.step();
  const keys=new Set(Array.isArray(key)?key:[key]);let yaw=0,surge=0,maxForce=0;
  for(let tick=0;tick<seconds/DT;tick++){
    seats.forEach((seat,i)=>sim.accept(seat,{seq:tick+1,...controllers[i]!.sample(keys,seat,tick*DT)},rowingAction(keys)));
    sim.step();
    const q=sim.hull.rotation(),v=sim.hull.linvel();
    surge+=rotate(v,{x:-q.x,y:-q.y,z:-q.z,w:q.w}).z*DT;
    yaw+=sim.hull.angvel().y*DT;
    for(const blade of sim.blades)maxForce=Math.max(maxForce,blade.force);
    assert.equal(sim.condition,'afloat');
  }
  const position=sim.hull.translation(),rotation=sim.hull.rotation();
  const camera=new PerspectiveCamera(52,16/9,.1,400);
  const frame=riverCamera(position.x,position.z,sim.hull.linvel().z,16/9,false);
  camera.position.set(frame.x,position.y+frame.y,frame.z);
  camera.lookAt(position.x,position.y+.3,position.z+frame.ahead);camera.updateMatrixWorld();
  const center=new Vector3(position.x,position.y,position.z).project(camera);
  const bow=new Vector3(0,0,1.9).applyQuaternion(new Quaternion(rotation.x,rotation.y,rotation.z,rotation.w)).add(new Vector3(position.x,position.y,position.z)).project(camera);
  const result={key,seats,z:position.z,surge,yaw,screenHeading:bow.x-center.x,strokes:seats.map(s=>sim.strokes[s]!),maxForce};
  sim.dispose();return result;
}

test('Holding W alone repeatedly drives the actual hull forward; S alone drives it backwards',()=>{
  const forward=row('KeyW'),reverse=row('KeyS');
  console.log(JSON.stringify({case:'hold-to-row',forward,reverse}));
  assert(forward.z>1&&reverse.z< -1);
  assert(Math.abs(forward.yaw)<.02&&Math.abs(reverse.yaw)<.02);
  assert(forward.strokes.every(s=>s>=3)&&reverse.strokes.every(s=>s>=3));
  assert(forward.maxForce<=420.001&&reverse.maxForce<=420.001);
});

test('Every seat produces forward/reverse surge and turns left/right in the actual gameplay camera',()=>{
  for(let seat=0;seat<4;seat++){
    const forward=row('KeyW',[seat],3.4),reverse=row('KeyS',[seat],3.4);
    const left=row('KeyA',[seat],3.4),right=row('KeyD',[seat],3.4);
    console.log(JSON.stringify({case:'seat-rowing',seat,forward:forward.surge,reverse:reverse.surge,left:left.yaw,right:right.yaw}));
    assert(forward.surge>.1&&reverse.surge<-.1);
    assert(Math.abs(forward.yaw)<.005&&Math.abs(reverse.yaw)<.005,`seat ${seat}: W/S must not introduce steering`);
    assert(left.screenHeading<-.02&&right.screenHeading>.02,`seat${seat}: screen left=${left.screenHeading}, right=${right.screenHeading}`);
  }
});

test('A coordinated crew turns both ways with bounded force and no forward/reverse key choreography',()=>{
  const left=row('ArrowLeft',undefined,3.4),right=row('ArrowRight',undefined,3.4);
  assert(left.screenHeading<-.05&&right.screenHeading>.05);
  assert(Math.abs(left.yaw+right.yaw)<.03);
  assert(left.strokes.every(s=>s>=2)&&right.strokes.every(s=>s>=2));
  assert(left.maxForce<=420.001&&right.maxForce<=420.001);
  const curveLeft=row(['KeyW','KeyA'],undefined,3.4),curveRight=row(['KeyW','KeyD'],undefined,3.4);
  assert(curveLeft.surge>.5&&curveRight.surge>.5);
  assert(curveLeft.screenHeading<-.02&&curveRight.screenHeading>.02);
  assert(curveLeft.strokes[1]===0&&curveLeft.strokes[3]===0);
  assert(curveRight.strokes[0]===0&&curveRight.strokes[2]===0);
});
