import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {CrewMember} from '../src/client/crew';
import {PaddleStroke} from '../src/shared/rowing';
import {SEATS} from '../src/shared/protocol';

function limbs(person:CrewMember){
 for(const joint of person.jointPositions){
  assert(Math.abs(joint.shoulder.distanceTo(joint.elbow)-.32)<.00001,'Upper arm must not stretch');
  assert(Math.abs(joint.elbow.distanceTo(joint.hand)-.32)<.00001,'Forearm must not stretch');
  assert([...joint.shoulder,...joint.elbow,...joint.hand].every(Number.isFinite));
 }
}
test('Every crew rig holds the real shaft through repeated forward/reverse/turn cycles and orients its wrists along it',()=>{
 for(let seat=0;seat<4;seat++){
  const person=new CrewMember(seat),station=SEATS[seat]!;
  for(const action of [{forward:1,turn:0},{forward:-1,turn:0},{forward:0,turn:-1},{forward:0,turn:1}]){
   const stroke=new PaddleStroke();
   for(let step=0;step<360;step++){
    const time=step/30,target=stroke.sampleAction(action,seat,time);
    const blade={x:station.side*(1.45+target.x*.35),y:.62-target.dip*1.05,z:station.z+target.z*1.1};
    person.pose(blade,time,target.dip*300);limbs(person);
    const handle=new T.Vector3(station.side*.65,.97,station.z+.03),tip=new T.Vector3(blade.x,blade.y,blade.z);
    const axis=tip.clone().sub(handle).normalize();
    for(let i=0;i<2;i++){
     const grip=handle.clone().lerp(tip,i===(station.side<0?0:1)?.28:.015).sub(person.position);
     assert(person.jointPositions[i]!.hand.distanceTo(grip)<.025,`seat ${seat} lost grip at ${time}`);
     assert(new T.Vector3(0,1,0).applyQuaternion(person.arms[i]!.hand.quaternion).dot(axis)>.9999);
    }
   }
  }
 }
});
test('Crew blinks are bounded and staggered; deterministic pose restores after a wreck without retained animation state',()=>{
 for(let seat=0;seat<4;seat++){
  const person=new CrewMember(seat),fresh=new CrewMember(seat),station=SEATS[seat]!;
  const blade={x:station.side*1.45,y:.62,z:station.z};
  const closed=.12-seat*1.31+2*(4.3+seat*.37);
  person.pose(blade,closed,0);assert(Math.abs(person.eyes.scale.y-.06)<.000001);
  person.pose(blade,closed+.3,0);assert.equal(person.eyes.scale.y,1);
  for(let frame=0;frame<150;frame++){person.react(frame/60);limbs(person);assert.equal(person.eyes.scale.y,1);}
  person.pose(blade,7.25,200);fresh.pose(blade,7.25,200);
  for(const [a,b] of [[person.torso,fresh.torso],[person.head,fresh.head],[person.eyes,fresh.eyes]]){
   a!.updateMatrix();b!.updateMatrix();assert.deepEqual(a!.matrix.elements,b!.matrix.elements);
  }
  assert.deepEqual(person.jointPositions,fresh.jointPositions);
 }
});
