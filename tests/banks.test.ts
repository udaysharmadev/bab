import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {writeFileSync} from 'node:fs';
import {bankGeometry,bankGround,bankTexture} from '../src/client/riverbed';
import {bankEdge,FINISH_Z} from '../src/shared/world';

const measurements:Record<string,unknown>[]=[];
test('Geological bank chunks share positions, texture coordinates, colour and shading at every seam',()=>{
 let checks=0,maxGap=0,triangles=0;
 for(const side of [-1,1])for(let start=140;start<FINISH_Z+55;start+=5){
  const a=bankGeometry(start,side),b=bankGeometry(start+5,side),p=a.getAttribute('position');
  assert(p.count<=80);assert(a.index!.count/3<=96);triangles+=a.index!.count/3;
  for(const name of ['position','normal','color','uv']){
   const from=a.getAttribute(name),to=b.getAttribute(name);
   for(let column=0;column<9;column++)for(let component=0;component<from.itemSize;component++){
    const left=from.getComponent(36+column,component)+(name==='position'&&component===2?start+2.5:0);
    const right=to.getComponent(column,component)+(name==='position'&&component===2?start+7.5:0);
    const gap=Math.abs(left-right);maxGap=Math.max(maxGap,gap);assert(gap<1e-6,`${name} seam at ${start},${side}`);checks++;
   }
  }
  for(let row=0;row<5;row++)for(let column=0;column<9;column++){
   const index=row*9+column,z=start+2.5+p.getZ(index),outward=(p.getX(index)-bankEdge(z,side))*side;
   assert(outward>=-.00001,'No scenic rock may intrude into the physical channel');
   if(column<4){assert(Math.abs(outward)<.00001);assert.equal(p.getY(index),Math.fround([-3,0,1.45,3][column]!));}
   const normal=new T.Vector3().fromBufferAttribute(a.getAttribute('normal'),index);assert(Math.abs(normal.length()-1)<1e-6);
  }
  const normal=a.getAttribute('normal');
  for(let i=45;i<55;i++)assert(normal.getZ(i)<-.99,'Upstream cap faces upstream');
  for(let i=55;i<65;i++)assert(normal.getZ(i)>.99,'Downstream cap faces downstream');
  a.dispose();b.dispose();
 }
 measurements.push({case:'all-bank-seams-and-contact-faces',checks,maxGap,triangles});
});

test('Vegetation ground queries agree with independent ray hits on actual bank triangles',()=>{
 const material=new T.MeshBasicMaterial({side:T.DoubleSide}),ray=new T.Raycaster();let checks=0,maxError=0;
 try{
  for(const side of [-1,1])for(let start=140;start<FINISH_Z+55;start+=20){
   const geometry=bankGeometry(start,side),mesh=new T.Mesh(geometry,material);mesh.position.z=start+2.5;mesh.updateMatrixWorld(true);
   for(const fraction of [.023,.231,.727,.997])for(const distance of [.05,.2,.8,2,5.1,12.3,17.8]){
    const z=start+fraction*5,x=bankEdge(z,side)+side*distance;
    ray.set(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));
    const hit=ray.intersectObject(mesh)[0];assert(hit,'Every sampled top has a rendered surface');
    const error=Math.abs(hit.point.y-bankGround(distance,z,side));maxError=Math.max(maxError,error);
    assert(error<.000025,`${error} at ${start},${side},${distance}`);checks++;
   }
   geometry.dispose();
  }
 }finally{material.dispose();}
 measurements.push({case:'independent-triangle-ground-rays',checks,maxError});
});
test('Small procedural rock texture is deterministic, filtered and seamless at the wrap',()=>{
 const a=bankTexture(),b=bankTexture(),pixels=a.image.data;let maxSeam=0,maxInterior=0,min=255,max=0;
 assert(pixels);
 assert.equal(pixels.byteLength,256*256*4);assert.deepEqual(pixels,b.image.data);
 assert.equal(a.wrapS,T.RepeatWrapping);assert.equal(a.wrapT,T.RepeatWrapping);assert.equal(a.minFilter,T.LinearMipmapLinearFilter);
 for(let i=0;i<256;i++)for(let c=0;c<3;c++){
  maxSeam=Math.max(maxSeam,Math.abs(pixels[(i*256)*4+c]!-pixels[(i*256+255)*4+c]!),Math.abs(pixels[i*4+c]!-pixels[(255*256+i)*4+c]!));
 }
 for(let i=0;i<pixels.length;i+=4){min=Math.min(min,pixels[i]!);max=Math.max(max,pixels[i]!);assert.equal(pixels[i+3],255);}
 for(let y=0;y<255;y++)for(let x=0;x<255;x++)for(let c=0;c<3;c++){
  const i=(y*256+x)*4+c;maxInterior=Math.max(maxInterior,Math.abs(pixels[i]!-pixels[i+4]!),Math.abs(pixels[i]!-pixels[i+1024]!));
 }
 // The wrap must not introduce a larger step than the texture's ordinary grit.
 assert(maxSeam<=maxInterior+1);assert(max-min>=30&&max-min<=100);a.dispose();b.dispose();
 measurements.push({case:'periodic-filtered-rock-texture',bytes:pixels.byteLength,maxSeam,maxInterior,min,max});
});
after(()=>writeFileSync('evidence/banks.json',JSON.stringify({result:measurements.length===3?'PASS':'FAIL',fixture:true,physicsChanged:false,humanArtReview:false,measurements},null,2)+'\n'));
