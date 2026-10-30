import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { CrewMember } from '../src/client/crew';
import { RiverWater, updateWaterNormals } from '../src/client/water';
import { HULL_RING, floorPlank, hullBottom } from '../src/client/hull';
import { SEATS } from '../src/shared/protocol';
import { FINISH_Z, channelHalfWidth, channelCenter, riverX, bankEdge, sampleWater, WHIRLPOOL } from '../src/shared/world';
import { stoneGeometry, treeGeometry, grassGeometry, distantFoliage } from '../src/client/nature';
import { CAMERA_VOLUMES, riverCamera } from '../src/client/camera';
import { riverbedGeometry } from '../src/client/riverbed';

test('Authored cameras blend continuously, frame reverse travel and keep the eye inside the bank',()=>{
  for(const aspect of [1440/960,480/900])for(const speed of [-2,0,2])for(const gentle of [false,true]) {
    let previous=riverCamera(5,0,speed,aspect,gentle);
    for(let z=.1;z<=FINISH_Z;z+=.1){
      const frame=riverCamera(riverX(5,z),z,speed,aspect,gentle);
      assert(Object.values(frame).filter(v=>typeof v==='number').every(Number.isFinite));
      assert(frame.x>bankEdge(frame.z,-1)+1.5&&frame.x<bankEdge(frame.z,1)-1.5);
      assert(Math.abs(frame.y-previous.y)<.12&&Math.abs(frame.ahead-previous.ahead)<.12,'No volume-edge snap');
      assert(speed>=0 ? frame.ahead>0 : frame.ahead<0,'Reverse should reveal upstream water');
      previous=frame;
    }
  }
  for(const volume of CAMERA_VOLUMES){const z=(volume.start+volume.end)/2;assert.equal(riverCamera(channelCenter(z),z,1,1.5,false).volume,volume.id);}
});

test('Submerged bed is finite, continuous between chunks and below the navigable hull lane',()=>{
  for(let start=-30;start<FINISH_Z+30;start+=60){
    const a=riverbedGeometry(start),b=riverbedGeometry(start+60),p=a.getAttribute('position'),next=b.getAttribute('position');
    assert([...p.array,...a.getAttribute('normal').array].every(Number.isFinite));
    for(let i=0;i<p.count;i++){
      assert(p.getY(i)<=-.119);
      if(i%7===3||i%7===4||(i%7===2&&(p.getZ(i)<=240||p.getZ(i)>=280)))assert.equal(p.getY(i),Math.fround(-1.8));
      if(i%7===2)assert(p.getY(i)<=-.179999);
    }
    for(let i=0;i<7;i++)for(const key of ['getX','getY','getZ'] as const)assert(Math.abs(p[key](p.count-7+i)-next[key](i))<.00001);
    a.dispose();b.dispose();
  }
});

test('All four crew rigs retain arm length and reach the real shaft grips through the complete blade workspace', () => {
  for (let i = 0; i < 4; i++) {
    const person = new CrewMember(i), seat = SEATS[i]!;
    for (const x of [-1, 0, 1]) for (const z of [-1, 0, 1]) for (const dip of [0, 1]) {
      const blade = { x: seat.side * (1.45 + x * .35), y: .62 - 1.05 * dip, z: seat.z + z * 1.1 };
      person.pose(blade, 1.5, dip * 300);
      person.jointPositions.forEach((joint, hand) => {
        assert(Math.abs(joint.shoulder.distanceTo(joint.elbow) - .32) < .001);
        assert(Math.abs(joint.elbow.distanceTo(joint.hand) - .32) < .001);
        const target = new T.Vector3(seat.side * .65, .97, seat.z + .03).lerp(new T.Vector3(blade.x, blade.y, blade.z), hand === (seat.side < 0 ? 0 : 1) ? .28 : .015).sub(person.position);
        assert(joint.hand.distanceTo(target) < .025, `seat=${i} grip error=${joint.hand.distanceTo(target)}`);
        assert([...joint.hand, ...joint.elbow].every(Number.isFinite));
      });
    }
  }
});

test('Rendered water mesh matches the shared physical surface including vortex depression and resets its time', () => {
  const water = new RiverWater(), camera = new T.PerspectiveCamera();
  water.updateMatrixWorld(true);
  for (const time of [0, 5.3, 0]) {
    water.update(time, camera, new T.Vector3(), new T.Quaternion(), 0);
    const p = water.geometry.getAttribute('position');
    let vortexSamples = 0;
    for (let i = 0; i < p.count; i++) {
      const point = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(water.matrixWorld);
      assert(Math.abs(point.y - (sampleWater(point.x, point.z, time).height - .015)) < .00001);
      if (Math.hypot(point.x - WHIRLPOOL.x, point.z - WHIRLPOOL.z) < 2) vortexSamples++;
    }
    assert(vortexSamples > 2, 'The rendered grid must include the physical whirlpool depression');
  }
});

test('Fast water normals remain unit length on a width-warped sloped surface',()=>{
  const geometry=new T.PlaneGeometry(10,12,8,6),position=geometry.getAttribute('position');
  for(let i=0;i<position.count;i++){
    const x=position.getX(i)*(1+position.getY(i)*.02),y=position.getY(i);
    position.setXYZ(i,x,y,.2*x-.1*y+.3);
  }
  updateWaterNormals(geometry,9);
  const normals=geometry.getAttribute('normal'),expected=new T.Vector3(-.2,.1,1).normalize();
  for(let i=0;i<normals.count;i++){
    const normal=new T.Vector3().fromBufferAttribute(normals,i);
    assert(Math.abs(normal.length()-1)<1e-6);assert(normal.dot(expected)>.999999);
  }
  geometry.dispose();
});

test('Water mesh interpolation stays within four centimetres of physical waves at representative seams',()=>{
  const water=new RiverWater(),camera=new T.PerspectiveCamera();let maxError=0;
  for(const z of [0,90,280,315,550,662,1018,1345])for(const time of [0,1.7,8.4]){
    water.update(time,camera,new T.Vector3(0,0,z),new T.Quaternion(),0);
    const p=water.geometry.getAttribute('position'),index=water.geometry.getIndex()!;
    for(let i=0;i<index.count;i+=9){
      const vertices=[index.getX(i),index.getX(i+1),index.getX(i+2)];
      const x=vertices.reduce((n,v)=>n+p.getX(v),0)/3,worldZ=water.position.z-vertices.reduce((n,v)=>n+p.getY(v),0)/3;
      const height=vertices.reduce((n,v)=>n+p.getZ(v),0)/3;
      const error=Math.abs(height-(sampleWater(x,worldZ,time).height-.015));maxError=Math.max(maxError,error);
      assert(error<.04,`Visible water interpolation error ${error} at ${x},${worldZ}`);
    }
    assert([...water.geometry.getAttribute('normal').array].every(Number.isFinite));
  }
  console.log(JSON.stringify({case:'water-mesh-interpolation',maxErrorMetres:maxError,vertices:water.geometry.getAttribute('position').count}));
});


test('Floor vertices stay within the tapered hull, and the underside is a closed shaped shell',()=>{
  const outline=HULL_RING.map(([x,z])=>new T.Vector2(x*.75,z*.92));
  const inside=(x:number,z:number)=>{let result=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const a=outline[i]!,b=outline[j]!;if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)result=!result;
  }return result;};
  for(let i=0;i<9;i++){
    const p=floorPlank(i).getAttribute('position');
    for(let v=0;v<p.count;v++)assert(inside(p.getX(v),p.getZ(v)),`floor outside hull ${i} ${p.getX(v)},${p.getZ(v)}`);
  }
  const bottom=hullBottom().getAttribute('position');assert(bottom.count>50);
  assert([...bottom.array].every(Number.isFinite));
});

test('Water window follows the crew through rapids and narrow channels with matching authoritative heights',()=>{
  const water=new RiverWater(),camera=new T.PerspectiveCamera();
  for(const z of [156,315,429,566,710,800,870,950,1040,1100,1390]){
    water.update(z/20,camera,new T.Vector3(0,0,z),new T.Quaternion(),1);water.updateMatrixWorld(true);
    const p=water.geometry.getAttribute('position');
    for(let i=0;i<p.count;i+=41){
      const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(water.matrixWorld);
      assert(Math.abs(point.y-(sampleWater(point.x,point.z,z/20).height-.015))<.00002);
      assert(point.x>=bankEdge(point.z,-1)-.401&&point.x<=bankEdge(point.z,1)+.401);
    }
  }
});

test('Same-tick checkpoint relocation moves the water window and resamples its channel immediately',()=>{
  const water=new RiverWater(),camera=new T.PerspectiveCamera();
  for(const z of [0,870,1030,1100,1390,48]) {
    water.update(8,camera,new T.Vector3(0,0,z),new T.Quaternion(),0);
    water.updateMatrixWorld(true);
    assert.equal(water.position.z,z+65);
    const p=water.geometry.getAttribute('position');
    for(let i=0;i<p.count;i+=71){
      const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(water.matrixWorld);
      assert(Math.abs(point.y-(sampleWater(point.x,point.z,8).height-.015))<.00002);
    }
  }
});

test('Dry hull mask tracks the actual rendered transform and releases immediately for a wreck/reset at the same water tick',()=>{
  const water=new RiverWater(),camera=new T.PerspectiveCamera();
  const position=new T.Vector3(3,.08,419),rotation=new T.Quaternion().setFromEuler(new T.Euler(.1,2.4,-.08));
  water.update(4,camera,position,rotation,1,true);
  assert.equal(water.material.uniforms.dryHull!.value,1);
  const local=new T.Vector3(.3,-.015,.4),world=local.clone().applyQuaternion(rotation).add(position);
  const recovered=world.applyMatrix4(water.material.uniforms.hullWorldInverse!.value);
  assert(recovered.distanceTo(local)<1e-10,'Mask must follow translated, yawed, pitched and rolled hull');
  water.update(4,camera,position,rotation,1,false);assert.equal(water.material.uniforms.dryHull!.value,0);
  water.update(4,camera,position,rotation,0,true);assert.equal(water.material.uniforms.dryHull!.value,1);
});

test('Wake direction follows surface-relative reverse/sideways motion and falls back safely at rest',()=>{
 const water=new RiverWater(),camera=new T.PerspectiveCamera(),position=new T.Vector3(0,.08,310);
 const rotation=new T.Quaternion().setFromEuler(new T.Euler(0,Math.PI/2,0));
 for(const motion of [new T.Vector2(0,-3),new T.Vector2(-2,0),new T.Vector2(1,2)]){
  const before=motion.clone();water.update(4,camera,position,rotation,motion.length(),true,motion);
  const heading=water.material.uniforms.boatDirection!.value as T.Vector2;
  assert(heading.distanceTo(motion.clone().normalize())<1e-12);assert(motion.equals(before),'Input velocity is not mutated');
  assert.equal(water.material.uniforms.boatSpeed!.value,motion.length());
 }
 water.update(4,camera,position,rotation,0,true,new T.Vector2());
 assert((water.material.uniforms.boatDirection!.value as T.Vector2).distanceTo(new T.Vector2(1,0))<1e-12);
 assert.equal(water.material.uniforms.boatSpeed!.value,0);
});

test('Detailed hazard rock stays within its physical sphere and shore variants retain finite chipped surfaces',()=>{
  for(const hazard of [false,true]) for(const seed of [13,20,41]){
    const rock=stoneGeometry(seed,hazard),p=rock.getAttribute('position');
    let min=Infinity,max=0;
    for(let i=0;i<p.count;i++){
      const r=Math.hypot(p.getX(i),p.getY(i),p.getZ(i));
      assert(Number.isFinite(r));assert(r<=1.00001,'Art must not extend past lethal rock collision');
      min=Math.min(min,r);max=Math.max(max,r);
    }
    assert(max-min>.02,'Stone must have broken planes rather than an unchanged sphere');
    assert([...rock.getAttribute('normal').array].every(Number.isFinite));rock.dispose();
  }
});

test('Natural vegetation has finite grounded geometry and bounded reusable asset cost',()=>{
  for(let variant=0;variant<4;variant++){
    const asset=treeGeometry(variant);
    const far=distantFoliage(asset.leaves,variant===1?12:6);
    const horizon=distantFoliage(asset.leaves,variant===1?12:6,9,1.65);
    assert(far.getAttribute('position').count<asset.leaves.getAttribute('position').count*.35);
    assert(horizon.getAttribute('position').count<asset.leaves.getAttribute('position').count*.12);
    assert(asset.distantWood.getAttribute('position').count<asset.wood.getAttribute('position').count*.2);
    assert([...horizon.getAttribute('position').array].every(Number.isFinite));
    horizon.computeBoundingBox();
    assert(horizon.boundingBox!.min.y>-.03&&horizon.boundingBox!.max.y<1.2);
    horizon.dispose();asset.distantWood.dispose();
    assert([...far.getAttribute('position').array].every(Number.isFinite));far.dispose();
    for(const geometry of [asset.wood,asset.leaves]){
      geometry.computeBoundingBox();
      assert(geometry.boundingBox!.min.y>-.03&&geometry.boundingBox!.max.y<1.2);
      assert([...geometry.getAttribute('position').array,...geometry.getAttribute('normal').array].every(Number.isFinite));
      assert(geometry.getAttribute('position').count/3<15000,'Tree variants must stay reusable within the instanced budget');geometry.dispose();
    }
  }
  for(const fern of [false,true]){
    const geometry=grassGeometry(fern);geometry.computeBoundingBox();
    assert(geometry.boundingBox!.min.y>=-.03&&geometry.boundingBox!.max.y<1);
    assert([...geometry.getAttribute('position').array].every(Number.isFinite));
    assert(geometry.getAttribute('position').count/3<1000);geometry.dispose();
  }
});
