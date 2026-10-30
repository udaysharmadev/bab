import {bankEdge} from './world';
import {clamp} from './protocol';

export const SANDBAR={start:240,fullStart:250,fullEnd:270,end:280,side:-1} as const;
const smooth=(x:number)=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
export function bedRow(z:number){
  return {left:bankEdge(z,-1),right:bankEdge(z,1),shoal:smooth((z-SANDBAR.start)/10)*smooth((SANDBAR.end-z)/10)};
}
type BedRow=ReturnType<typeof bedRow>;
function columnX(row:BedRow,column:number):number{
  switch(column){
    case 0:return row.left-.8;case 1:return row.left+.25;case 2:return row.left+2;
    case 3:return (row.left+row.right)/2*(1-row.shoal)+(row.left+4)*row.shoal;
    case 4:return row.right-2;case 5:return row.right-.25;
    default:return row.right+.8;
  }
}
function columnY(row:BedRow,column:number):number{
  if(column===0||column===6)return -.12;
  if(column===1)return -.65+.43*row.shoal;
  if(column===2)return -1.8+1.57*row.shoal;
  return column===5?-.65:-1.8;
}

// Exact barycentric height on the same a-b-d / b-c-d triangles used by
// Three and Rapier. Bilinear interpolation disagrees where rows change slope.
export function bedHeight(x:number,z:number,a=bedRow(Math.floor(z/5)*5),b=bedRow(Math.floor(z/5)*5+5)):number{
  const t=(z-Math.floor(z/5)*5)/5;
  let column=0;
  for(;column<5;column++)if(x<=columnX(a,column+1)*(1-t)+columnX(b,column+1)*t)break;
  const left0=columnX(a,column),right0=columnX(a,column+1),left1=columnX(b,column),right1=columnX(b,column+1);
  const diagonal=right0*(1-t)+left1*t;
  if(x<=diagonal){
    const d=clamp((x-left0*(1-t)-left1*t)/(right0-left0),0,1-t);
    return (1-t-d)*columnY(a,column)+t*columnY(b,column)+d*columnY(a,column+1);
  }
  const c=clamp((x-diagonal)/(right1-left1),0,t);
  return (t-c)*columnY(b,column)+c*columnY(b,column+1)+(1-t)*columnY(a,column+1);
}

export function bedDragScale(clearance:number):number{return 1+2*smooth((.55-clearance)/.55);}

export function bedMesh(start:number,length=60){
  const vertices=new Float32Array(13*7*3),normals=new Float32Array(vertices.length),indices:number[]=[];
  for(let row=0;row<=12;row++){
    const z=start+row*length/12,profile=bedRow(z),before=bedRow(z-5),after=bedRow(z+5);
    for(let column=0;column<7;column++){
      const i=(row*7+column)*3;
      vertices.set([columnX(profile,column),columnY(profile,column),z],i);
      const l=Math.max(0,column-1),r=Math.min(6,column+1);
      const ax=columnX(profile,r)-columnX(profile,l),ay=columnY(profile,r)-columnY(profile,l);
      const bx=columnX(after,column)-columnX(before,column),by=columnY(after,column)-columnY(before,column);
      const nx=-10*ay,ny=10*ax,nz=bx*ay-by*ax,norm=Math.hypot(nx,ny,nz);
      normals.set([nx/norm,ny/norm,nz/norm],i);
      if(row<12&&column<6){const a=row*7+column,b=a+7;indices.push(a,b,a+1,b,b+1,a+1);}
    }
  }
  return {vertices,normals,indices:new Uint32Array(indices)};
}
