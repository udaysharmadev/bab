import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function dangerVariant(id:string) {
  let hash=2166136261;
  for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return (hash>>>0)%3;
}

// Crown/paint stay inside the existing unit-sphere collider. Sharp upper
// silhouettes distinguish lethal river rocks from rounded decorative shores.
export function dangerRock(variant:number) {
  const core=new T.IcosahedronGeometry(1,2),p=core.getAttribute('position'),colors:number[]=[];
  core.rotateY(variant*.71);
  for(let i=0;i<p.count;i++)p.setY(i,Math.min(.64,p.getY(i)));
  for(let i=0;i<p.count;i+=3){
    const y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3;
    const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3;
    const color=new T.Color(y>.12&&y<.48?(Math.floor((x+1)*4+variant)%2?'#f3dba0':'#e45436'):y<0?'#263e40':'#5d6b69');
    for(let j=0;j<3;j++)colors.push(color.r,color.g,color.b);
  }
  core.setAttribute('color',new T.Float32BufferAttribute(colors,3));core.computeVertexNormals();
  const parts:T.BufferGeometry[]=[core];
  for(let i=0;i<5;i++){
    const angle=i*Math.PI*2/5+variant*.7;
    const tooth=new T.ConeGeometry(.14,.28,4).toNonIndexed();
    tooth.translate(Math.cos(angle)*.32,.75,Math.sin(angle)*.32);
    const tint=new T.Color(i%2?'#f3dba0':'#d7462d');
    tooth.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:tooth.getAttribute('position').count},()=>tint.toArray()).flat(),3));parts.push(tooth);
  }
  const result=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());return result;
}
