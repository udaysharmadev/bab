// Structural shell in boat-local metres. Used by art, collision and water masking.
// Thin gunwale trim and fittings are cosmetic, outside this contact envelope.
export const HULL_RING = [
  [-.12,-2.15],[-.68,-1.6],[-.96,-.6],[-.96,.7],[-.7,1.6],[0,2.25],
  [.7,1.6],[.96,.7],[.96,-.6],[.68,-1.6],[.12,-2.15],
] as const;
export const HULL_TOP = .47;
export const HULL_BOTTOM = -.30;
export const HULL_BASE_SCALE = { x: .65, z: .88 } as const;

export function hullPanelVertices(index:number) {
  const a=HULL_RING[index]!,b=HULL_RING[(index+1)%HULL_RING.length]!;
  const upper=(p:readonly [number,number])=>[p[0],HULL_TOP,p[1]];
  const lower=(p:readonly [number,number])=>[p[0]*HULL_BASE_SCALE.x,HULL_BOTTOM,p[1]*HULL_BASE_SCALE.z];
  const [A,B,C,D]=[upper(a),upper(b),lower(a),lower(b)] as [number[],number[],number[],number[]];
  const plane=outwardPlane(A,B,C);
  // Anisotropic taper makes corner quads non-planar. Choose the outward
  // diagonal, otherwise the art would cut inside Rapier's convex envelope.
  const outside=plane[0]*D[0]!+plane[1]*D[1]!+plane[2]*D[2]!>plane[3]+1e-9;
  return outside?[...A,...B,...D,...A,...D,...C]:[...A,...B,...C,...B,...D,...C];
}

function outwardPlane(a:readonly number[],b:readonly number[],c:readonly number[]): [number,number,number,number] {
  const u=b.map((v,i)=>v-a[i]!),v=c.map((n,i)=>n-a[i]!);
  let x=u[1]!*v[2]!-u[2]!*v[1]!,y=u[2]!*v[0]!-u[0]!*v[2]!,z=u[0]!*v[1]!-u[1]!*v[0]!;
  const direction=x*a[0]!+y*a[1]!+z*a[2]!<0?-1:1,inverse=direction/Math.hypot(x,y,z);
  x*=inverse;y*=inverse;z*=inverse;
  return [x,y,z,x*a[0]!+y*a[1]!+z*a[2]!];
}

// Same convex half-spaces for the water shader: no independently approximated
// waterline silhouette at rolled/pitched poses.
export const HULL_PLANES = [
  [0,1,0,HULL_TOP],[0,-1,0,-HULL_BOTTOM],
  ...HULL_RING.flatMap((_,i)=>{
    const points=hullPanelVertices(i);
    return [outwardPlane(points.slice(0,3),points.slice(3,6),points.slice(6,9)),outwardPlane(points.slice(9,12),points.slice(12,15),points.slice(15,18))];
  }),
];

export function hullVertices() {
  return new Float32Array([
    ...HULL_RING.flatMap(([x,z])=>[x*HULL_BASE_SCALE.x,HULL_BOTTOM,z*HULL_BASE_SCALE.z]),
    ...HULL_RING.flatMap(([x,z])=>[x,HULL_TOP,z]),
  ]);
}
