import * as T from 'three';
import {PADDLE_OUTLINE,PADDLE_DEPTH} from '../shared/paddle-blade';

// Cosmetic blade stays inside the original 0.21 × 0.42 × 0.055m envelope.
// The centre remains the shared paddle sample/animation attachment point.
export function paddleBlade() {
  const shape=new T.Shape();
  PADDLE_OUTLINE.forEach(([x,y],i)=>i===0?shape.moveTo(x,y):shape.lineTo(x,y));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:PADDLE_DEPTH,steps:1,curveSegments:4,bevelEnabled:true,bevelSegments:1,bevelThickness:.006,bevelSize:.006});
  // posePaddle maps +Y away from the handle, so the neck must face -Y.
  geometry.translate(0,0,-PADDLE_DEPTH/2);geometry.rotateZ(Math.PI);return geometry;
}

export function bowRope() {
  const points=Array.from({length:97},(_,i)=>{
    const t=i/96,angle=t*Math.PI*6,radius=.045+.105*t;
    return new T.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius);
  });
  return new T.TubeGeometry(new T.CatmullRomCurve3(points),96,.012,5,false);
}
