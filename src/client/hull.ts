import * as T from 'three';
import { HULL_RING, HULL_BOTTOM, HULL_BASE_SCALE, hullPanelVertices } from '../shared/hull';
export { HULL_RING } from '../shared/hull';

export function hullPanel(index:number) {
  const geometry=new T.BufferGeometry();
  const vertices=hullPanelVertices(index),a=HULL_RING[index]!;
  let arc=0;
  for(let i=0;i<index;i++){const p=HULL_RING[i]!,q=HULL_RING[i+1]!;arc+=Math.hypot(q[0]-p[0],q[1]-p[1]);}
  const uv:number[]=[],colors:number[]=[];
  for(let i=0;i<vertices.length;i+=3){
    const lower=vertices[i+1]===HULL_BOTTOM;
    const x=vertices[i]!/(lower?HULL_BASE_SCALE.x:1),z=vertices[i+2]!/(lower?HULL_BASE_SCALE.z:1);
    // Long fibres follow the gunwale, including either convex-panel diagonal.
    uv.push((vertices[i+1]!-HULL_BOTTOM)*2,(arc+Math.hypot(x-a[0],z-a[1]))*.5);
    const shade=lower?.76:1;colors.push(shade,shade,shade);
  }
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();return geometry;
}
function clipX(polygon:T.Vector2[], x:number, keepRight:boolean) {
  const out:T.Vector2[]=[];
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!;
    const insideA=keepRight?a.x>=x:a.x<=x,insideB=keepRight?b.x>=x:b.x<=x;
    if(insideA)out.push(a.clone());
    if(insideA!==insideB)out.push(new T.Vector2(x,a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x)));
  }
  return out;
}
function prism(polygon:T.Vector2[], y:number, thickness:number) {
  const points:number[]=[],faces=T.ShapeUtils.triangulateShape(polygon,[]);
  const add=(a:T.Vector2,b:T.Vector2,c:T.Vector2,height:number)=>points.push(a.x,height,a.y,b.x,height,b.y,c.x,height,c.y);
  for(const face of faces){add(polygon[face[2]!]!,polygon[face[1]!]!,polygon[face[0]!]!,y);add(polygon[face[0]!]!,polygon[face[1]!]!,polygon[face[2]!]!,y-thickness);}
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!;
    points.push(a.x,y,a.y,b.x,y,b.y,a.x,y-thickness,a.y,b.x,y,b.y,b.x,y-thickness,b.y,a.x,y-thickness,a.y);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(points.flatMap((_,i)=>i%3===0?[points[i]!*2,points[i+2]!*.5]:[]),2));geometry.computeVertexNormals();return geometry;
}
export function floorPlank(index:number) {
  const center=(index-4)*.155;
  const outline=HULL_RING.map(([x,z])=>new T.Vector2(x*.735,z*.90));
  return prism(clipX(clipX(outline,center-.073,true),center+.073,false),-.015,.05);
}
export function hullBottom() { return prism(HULL_RING.map(([x,z])=>new T.Vector2(x*HULL_BASE_SCALE.x,z*HULL_BASE_SCALE.z)),HULL_BOTTOM+.055,.055); }
