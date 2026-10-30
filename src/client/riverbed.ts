import * as T from 'three';
import { bankEdge } from '../shared/world';
import {bedMesh} from '../shared/bathymetry';

const BANK_STEP = 1.25;
const PROFILE = [0, 0, 0, 0, .5, 1.75, 4.5, 10, 18] as const;
const smooth = (a:number,b:number,x:number) => {const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

// Periodic value noise avoids the old crossed-sine stone texture's repeating
// diagonal pattern. Generated once; one small texture supplies colour and bump.
export function bankTexture() {
  const size=256,pixels=new Uint8Array(size*size*4);
  const noise=(x:number,y:number,period:number)=>{
    const hash=(i:number,j:number)=>{
      let n=Math.imul((i+period)%period+12,374761393)^Math.imul((j+period)%period+31,668265263);
      n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;
    };
    const ix=Math.floor(x),iy=Math.floor(y),u=smooth(0,1,x-ix),v=smooth(0,1,y-iy);
    return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let cloud=0,weight=.5;
    for(let period=4;period<=64;period*=2){cloud+=weight*noise(x/size*period,y/size*period,period);weight*=.5;}
    const grain=noise(x/size*128,y/size*128,128),value=140+cloud*88+grain*28,index=(y*size+x)*4;
    pixels[index]=value;pixels[index+1]=value*.98;pixels[index+2]=value*.93;pixels[index+3]=255;
  }
  const texture=new T.DataTexture(pixels,size,size);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;return texture;
}

function bankPoint(column:number,z:number,side:number) {
  const h=4.7+.7*Math.sin(z*.075+side)+.35*Math.sin(z*.31+side*2)
    +2.6*smooth(260,300,z)*(1-smooth(730,780,z));
  const heights=[-3,0,1.45,3,h*.84,h-.18,h,h+.35+.35*Math.sin(z*.041),h+.5+Math.sin(z*.055+side)];
  return new T.Vector3(bankEdge(z,side)+side*PROFILE[column]!,heights[column]!,z);
}

/** Query the actual top triangles, including their diagonal, for vegetation.
 * Lateral distance is measured outward from the shared physical bank edge. */
export function bankGround(outward:number,z:number,side:number) {
  const distance=T.MathUtils.clamp(outward,0,18),start=Math.floor(z/BANK_STEP)*BANK_STEP,t=(z-start)/BANK_STEP;
  let column=3;
  while(column<PROFILE.length-2&&distance>PROFILE[column+1]!)column++;
  const u=(distance-PROFILE[column]!)/(PROFILE[column+1]!-PROFILE[column]!);
  const a=bankPoint(column,start,side).y,b=bankPoint(column,start+BANK_STEP,side).y;
  const c=bankPoint(column+1,start+BANK_STEP,side).y,d=bankPoint(column+1,start,side).y;
  return t+u<=1?a+(b-a)*t+(d-a)*u:c+(d-c)*(1-t)+(b-c)*(1-u);
}

function bankColor(point:T.Vector3,outward:number,side:number) {
  const strata=.89+.075*Math.sin(point.y*4.3+Math.sin(point.z*.06)*.5)+.035*Math.sin(point.y*13+point.z*.11);
  const color=new T.Color('#b5aa8f').multiplyScalar(strata);
  color.lerp(new T.Color('#526b60'),1-smooth(-.1,.85,point.y));
  const moss=smooth(2,5,point.y)*smooth(.5,4,outward)*Math.max(0,Math.sin(point.z*.23+side)*.35);
  return color.lerp(new T.Color('#6b7951'),moss);
}

// Positions are world X and chunk-local Z, matching the authority's bank face.
export function bankGeometry(start:number,side:number) {
  const positions:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[];
  const add=(point:T.Vector3,outward:number,cap=false)=>{
    positions.push(point.x,point.y,point.z-start-2.5);
    uvs.push((point.z+(cap?outward:0))*.25,point.y*.3+outward*.17);
    const color=bankColor(point,outward,side);colors.push(color.r,color.g,color.b);
  };
  for(let row=0;row<=4;row++)for(let column=0;column<PROFILE.length;column++)add(bankPoint(column,start+row*BANK_STEP,side),PROFILE[column]!);
  for(let row=0;row<4;row++)for(let column=0;column<PROFILE.length-1;column++){
    const a=row*PROFILE.length+column,b=a+PROFILE.length,c=b+1,d=a+1;
    indices.push(...(side>0?[a,b,d,b,c,d]:[a,d,b,b,d,c]));
  }
  // Closed end caps cast solid shadows without adding ledge-strip draw calls.
  for(const z of [start,start+5]){
    const offset=positions.length/3,contour=PROFILE.map((distance,column)=>{
      const point=bankPoint(column,z,side);add(point,distance,true);return new T.Vector2(distance,point.y);
    });
    add(new T.Vector3(bankEdge(z,side)+side*18,-3,z),18,true);contour.push(new T.Vector2(18,-3));
    for(const face of T.ShapeUtils.triangulateShape(contour,[])){
      const winding=(z===start?side<0:side>0)?face:face.slice().reverse();
      indices.push(...winding.map(i=>offset+i));
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  // Shared world derivatives give adjacent chunks identical shading normals.
  const normals=geometry.getAttribute('normal');
  for(let row=0;row<=4;row++)for(let column=0;column<PROFILE.length;column++){
    const z=start+row*BANK_STEP;
    const along=bankPoint(column,z+.01,side).sub(bankPoint(column,z-.01,side));
    const across=bankPoint(Math.min(column+1,PROFILE.length-1),z,side).sub(bankPoint(Math.max(column-1,0),z,side));
    const normal=along.cross(across).multiplyScalar(side).normalize();
    normals.setXYZ(row*PROFILE.length+column,normal.x,normal.y,normal.z);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export function riverbedGeometry(start: number, length = 60) {
  const geometry = new T.PlaneGeometry(1, length, 6, 12),bed=bedMesh(start,length);
  geometry.setAttribute('position',new T.BufferAttribute(bed.vertices,3));
  geometry.setAttribute('normal',new T.BufferAttribute(bed.normals,3));geometry.setIndex(new T.BufferAttribute(bed.indices,1));
  const p = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const x=p.getX(i),z=p.getZ(i);
    uv.setXY(i, x / 8, z / 8);
  }
  geometry.computeBoundingSphere();
  return geometry;
}
