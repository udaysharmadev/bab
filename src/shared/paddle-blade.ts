import {paddleHandle,type Vec3,type Quat} from './protocol';

// Same four samples per quadratic as the visible bevelled blade. Keep the
// concave neck separate: one convex hull would fill its empty shoulders.
const outline:[number,number][]=[[-.025,.204],[.025,.204],[.035,.105]];
for(const [cx,cy,x,y] of [[.098,.02,.098,-.10],[.098,-.203,0,-.203],[-.098,-.203,-.098,-.10],[-.098,.02,-.035,.105]]){
  const [sx,sy]=outline[outline.length-1]!;
  for(let i=1;i<=4;i++){
    const t=i/4,s=1-t;
    outline.push([s*s*sx+2*s*t*cx!+t*t*x!,s*s*sy+2*s*t*cy!+t*t*y!]);
  }
}
export const PADDLE_OUTLINE:readonly (readonly [number,number])[]=outline;
export const PADDLE_DEPTH=.039;
export const PADDLE_CORES=[
  [outline[0]!,outline[1]!,outline[2]!,outline[outline.length-1]!],outline.slice(2),
].map(profile=>{
  // Rendering rotates the outline by PI around Z. Reverse to CCW for caps.
  const points=profile.map(([x,y])=>[-x,-y] as const).reverse(),n=points.length;
  const vertices=new Float32Array([-1,1].flatMap(side=>points.flatMap(([x,y])=>[x,y,side*PADDLE_DEPTH/2])));
  const indices:number[]=[];
  for(let i=1;i<n-1;i++)indices.push(0,i+1,i,n,n+i,n+i+1);
  for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i);}
  return {vertices,indices:new Uint32Array(indices)};
});

export function paddleBladeRotation(seat:number,tip:Vec3,body:Quat):Quat {
  const handle=paddleHandle(seat),x=tip.x-handle.x,y=tip.y-handle.y,z=tip.z-handle.z,length=Math.hypot(x,y,z);
  if(length===0)return {x:body.x,y:body.y,z:body.z,w:body.w};
  const r=1+y/length,norm=Math.hypot(z/length,-x/length,r);
  // Match Three's +Y-to-direction convention, including its antiparallel axis.
  const q=r<1e-8?{x:0,y:0,z:1,w:0}:{x:z/length/norm,y:0,z:-x/length/norm,w:r/norm};
  // Body * local rotation preserves the flat blade's twist when the hull heels.
  return {x:body.w*q.x+body.x*q.w+body.y*q.z-body.z*q.y,
    y:body.w*q.y-body.x*q.z+body.y*q.w+body.z*q.x,
    z:body.w*q.z+body.x*q.y-body.y*q.x+body.z*q.w,
    w:body.w*q.w-body.x*q.x-body.y*q.y-body.z*q.z};
}
