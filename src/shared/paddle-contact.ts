import RAPIER from '@dimforge/rapier3d-compat';
import {PADDLE_SHAFT_RADIUS,type Vec3,type Quat} from './protocol';
import {PADDLE_CORES} from './paddle-blade';

const bladeShapes=PADDLE_CORES.map(core=>new RAPIER.ConvexPolyhedron(core.vertices,core.indices));
export function paddleBladeContact(world:RAPIER.World,body:RAPIER.RigidBody,tip:Vec3,rotation:Quat,oldTip:Vec3){
  let result:{collider:RAPIER.Collider;contact:RAPIER.ShapeContact}|undefined;
  for(const shape of bladeShapes)world.intersectionsWithShape(tip,rotation,shape,collider=>{
    const contact=collider.contactShape(shape,tip,rotation,0);
    if(contact&&contact.distance<=0&&(!result||contact.distance<result.contact.distance
      ||(contact.distance===result.contact.distance&&collider.handle<result.collider.handle)))result={collider,contact};
    return true;
  },RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,undefined,body);
  if(result)return {collider:result.collider,normal:result.contact.normal1,point:result.contact.point2};
  const travel={x:tip.x-oldTip.x,y:tip.y-oldTip.y,z:tip.z-oldTip.z};
  if(Math.hypot(travel.x,travel.y,travel.z)<.0001)return;
  // ponytail: native casts cover translation at the current 60Hz blade pose;
  // arbitrary rotational CCD would require articulated rigid paddles.
  let sweep:RAPIER.ColliderShapeCastHit|null=null;
  for(const shape of bladeShapes){
    const hit=world.castShape(oldTip,rotation,travel,shape,0,1,true,RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,undefined,body);
    if(hit&&(!sweep||hit.time_of_impact<sweep.time_of_impact
      ||(hit.time_of_impact===sweep.time_of_impact&&hit.collider.handle<sweep.collider.handle)))sweep=hit;
  }
  if(sweep)return {collider:sweep.collider,normal:sweep.normal1,point:sweep.witness1};
}

// The seven-sided visible shaft tapers from 3cm to 2.5cm circumradius.
// A 2.2cm capsule stays inside its actual faces and ends, not just its radial envelope.
export function paddleShaftContact(world:RAPIER.World,body:RAPIER.RigidBody,handle:Vec3,tip:Vec3) {
  const x=tip.x-handle.x,y=tip.y-handle.y,z=tip.z-handle.z,length=Math.hypot(x,y,z);
  if(length<=PADDLE_SHAFT_RADIUS*2)return;
  const q={x:z/length,y:0,z:-x/length,w:1+y/length};
  const norm=Math.hypot(q.x,q.z,q.w);
  const rotation=norm<1e-8?{x:1,y:0,z:0,w:0}:{x:q.x/norm,y:0,z:q.z/norm,w:q.w/norm};
  const centre={x:(handle.x+tip.x)/2,y:(handle.y+tip.y)/2,z:(handle.z+tip.z)/2};
  const shape=new RAPIER.Capsule(length/2-PADDLE_SHAFT_RADIUS,PADDLE_SHAFT_RADIUS);
  let result:{collider:RAPIER.Collider;contact:RAPIER.ShapeContact}|undefined;
  world.intersectionsWithShape(centre,rotation,shape,collider=>{
    const contact=collider.contactShape(shape,centre,rotation,0);
    if(contact&&contact.distance<=0&&(!result||contact.distance<result.contact.distance
      ||(contact.distance===result.contact.distance&&collider.handle<result.collider.handle)))result={collider,contact};
    return true;
  },RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,undefined,body);
  return result;
}
