import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {paddleBlade,bowRope} from '../src/client/boat-detail';
import {hullPanel} from '../src/client/hull';
import {HULL_RING,HULL_BOTTOM,HULL_BASE_SCALE} from '../src/shared/hull';

test('Rounded paddle retains its attachment envelope and rejects the old rectangular corners',()=>{
  const geometry=paddleBlade();geometry.computeBoundingBox();
  const box=geometry.boundingBox!;
  for(const point of [box.min,box.max])assert(Math.abs(point.x)<=.105001&&Math.abs(point.y)<=.210001&&Math.abs(point.z)<=.027501);
  const normals=geometry.getAttribute('normal');
  for(let i=0;i<normals.count;i++)assert(Math.abs(new T.Vector3().fromBufferAttribute(normals,i).length()-1)<1e-5);
  const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial()),ray=new T.Raycaster();mesh.updateMatrixWorld();
  for(const [x,y,expected] of [[0,0,true],[0,.16,true],[.07,.1,true],[.06,-.18,false],[.06,.12,true],[.1,.18,false],[-.1,.18,false],[.1,-.2,false]] as const){
    ray.set(new T.Vector3(x,y,1),new T.Vector3(0,0,-1));assert.equal(ray.intersectObject(mesh).length>0,expected,`${x},${y}`);
  }
  assert(geometry.getAttribute('position').count/3<300,'Four paddle details must stay small');
  geometry.dispose();mesh.material.dispose();
});

test('Hull fibres align along each plank and share coordinates across its actual triangulation',()=>{
  let previousEnd:number|undefined;
  for(let i=0;i<HULL_RING.length;i++){
    const geometry=hullPanel(i),p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
    const top:number[]=[];
    for(let v=0;v<p.count;v++)if(Math.abs(p.getY(v)-HULL_BOTTOM)>.001)top.push(v);
    assert(top.every(v=>Math.abs(uv.getX(v)-uv.getX(top[0]!))<1e-6));
    const start=Math.min(...top.map(v=>uv.getY(v))),end=Math.max(...top.map(v=>uv.getY(v)));
    const a=HULL_RING[i]!,b=HULL_RING[(i+1)%HULL_RING.length]!;
    assert(Math.abs(end-start-Math.hypot(b[0]-a[0],b[1]-a[1])*.5)<1e-6);
    if(previousEnd!==undefined)assert(Math.abs(previousEnd-start)<1e-6);previousEnd=end;
    for(let v=0;v<p.count;v++)if(Math.abs(p.getY(v)-HULL_BOTTOM)<.001){
      const upper=top.find(t=>Math.abs(p.getX(t)-p.getX(v)/HULL_BASE_SCALE.x)<1e-6&&Math.abs(p.getZ(t)-p.getZ(v)/HULL_BASE_SCALE.z)<1e-6);
      assert(upper!==undefined);assert(Math.abs(uv.getY(v)-uv.getY(upper))<1e-6);
    }
    geometry.dispose();
  }
});

test('Rope coil is compact, finite and can rest directly on the floor',()=>{
  const geometry=bowRope();geometry.computeBoundingBox();const box=geometry.boundingBox!;
  assert(Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.z),Math.abs(box.max.z))<.165);
  assert(box.max.y-box.min.y<.025);
  assert([...geometry.getAttribute('position').array,...geometry.getAttribute('normal').array].every(Number.isFinite));
  assert(geometry.index!.count/3<=1000);geometry.dispose();
});
