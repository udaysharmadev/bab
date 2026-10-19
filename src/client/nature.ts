import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function rng(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function noise(x: number, y: number, z = 0) {
  return (Math.sin(x * 2.31 + z * 1.73) * Math.cos(y * 3.17 - z * .91)
    + Math.sin(x * 5.71 - y * 2.13 + z * 3.41) * .45) / 2.9 + .5;
}

// Chipped planes and coherent displacement, never independent vertex jitter.
// Hazard variants preserve the existing unit-sphere collision envelope.
export function stoneGeometry(seed: number, hazard = false) {
  const geometry = new T.IcosahedronGeometry(1, 3);
  const p = geometry.getAttribute('position'), colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = noise(x + seed, y - seed * .3, z + seed * .7);
    const r = hazard ? .95 + n * .05 : .78 + n * .22;
    const point = new T.Vector3(x * r, y * r, z * r);
    for (const angle of [seed * .7, seed * .7 + 2.4]) {
      const normal = new T.Vector3(Math.cos(angle), .6, Math.sin(angle)).normalize();
      const excess = point.dot(normal) - (hazard ? .97 : .67);
      if (excess > 0) point.addScaledVector(normal, -excess);
    }
    p.setXYZ(i, point.x, Math.min(point.y, hazard ? .98 : .77), point.z);
    const wet = y < -.12 ? .58 : .92;
    const moss = y > .3 && noise(x * 3, z * 2, seed) > .57;
    const color = new T.Color(moss ? '#788358' : '#e0ded3').multiplyScalar(wet);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function branch(parts: T.BufferGeometry[], start: T.Vector3, end: T.Vector3, bottom: number, top: number) {
  const direction = end.clone().sub(start);
  const geometry = new T.CylinderGeometry(top, bottom, direction.length(), 7, 1);
  geometry.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()));
  geometry.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
  parts.push(geometry.toNonIndexed()); geometry.dispose();
}
function foliage() {
  const positions: number[] = [], colors: number[] = [];
  function leaf(base: T.Vector3, tip: T.Vector3, width: number, color: T.Color, rib = true) {
    const direction = tip.clone().sub(base);
    const across = direction.clone().cross(new T.Vector3(0, 1, .12)).normalize().multiplyScalar(width);
    const middle = base.clone().lerp(tip, .48);
    const left = middle.clone().add(across), right = middle.clone().sub(across);
    const center = middle.clone().add(new T.Vector3(0, width * .3, 0));
    const vertices = rib ? [base, left, center, left, tip, center, tip, right, center, right, base, center] : [base, left, tip, base, tip, right];
    for (const v of vertices) { positions.push(v.x, v.y, v.z); const shade = v === base ? .58 : v === center ? 1.1 : 1; colors.push(color.r * shade, color.g * shade, color.b * shade); }
  }
  function geometry() {
    const result = new T.BufferGeometry();
    result.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    result.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    result.computeVertexNormals(); result.computeBoundingBox(); result.computeBoundingSphere();
    result.boundingSphere!.radius += .025;
    return result;
  }
  function ribbon(a: T.Vector3, b: T.Vector3, across: T.Vector3, w0: number, w1: number, color: T.Color, shade: number) {
    const left0=a.clone().addScaledVector(across,w0),right0=a.clone().addScaledVector(across,-w0);
    const left1=b.clone().addScaledVector(across,w1),right1=b.clone().addScaledVector(across,-w1);
    for(const v of [left0,right0,right1,left0,right1,left1]) {
      positions.push(v.x,v.y,v.z); colors.push(color.r*shade,color.g*shade,color.b*shade);
    }
  }
  return { leaf, geometry, ribbon };
}

export function treeGeometry(variant: number) {
  const random = rng(825 + variant * 491), wood: T.BufferGeometry[] = [], canopy = foliage();
  const pine = variant !== 1;
  const trunkPoint = (y: number) => new T.Vector3(Math.sin(y * 3 + variant) * y * .025, y, Math.cos(y * 4 + variant) * y * .018);
  const trunkHeight=pine?1:.82;
  for (let i = 0; i < 6; i++) branch(wood, trunkPoint(i / 6*trunkHeight), trunkPoint((i + 1) / 6*trunkHeight), .026 * (1 - i / 6) + .003, .026 * (1 - (i + 1) / 6) + .003);
  for (let i = 0; i < 5; i++) {
    const a = i * 2.399;
    branch(wood, new T.Vector3(Math.cos(a) * .07, 0, Math.sin(a) * .07), trunkPoint(.11), .009, .018);
  }
  if (pine) {
    for (let level = 0; level < 9; level++) {
      const y = .22 + level * .083, length = (.27 * (1 - y) + .025) * (variant === 2 ? .85 : 1);
      for (let arm = 0; arm < 6; arm++) {
        const angle = arm * Math.PI / 3 + level * 1.73 + random() * .35;
        const direction = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
        const across = new T.Vector3(-direction.z, 0, direction.x);
        const origin = trunkPoint(y), end = origin.clone().addScaledVector(direction, length * (.8 + random() * .4)); end.y -= .015 + random() * .025;
        branch(wood, origin, end, .005 * (1 - y) + .0015, .0008);
        for (let j = 0; j < 6; j++) {
          const point = origin.clone().lerp(end, .18 + j * .145);
          for (const side of [-1, 1]) {
            const tip = point.clone().addScaledVector(across, side * (.035 - j * .003)).addScaledVector(direction, .025); tip.y += .016;
            for (let k = 0; k < 4; k++) {
              const base = point.clone().lerp(tip, k / 4);
              base.y+=(random()-.5)*.02;
              const needle = base.clone().addScaledVector(direction, .035 + random() * .025).addScaledVector(across, side * .028); needle.y += .004 + random() * .025;
              canopy.leaf(base, needle, .0065, new T.Color().setHSL(.28 + random() * .055, .28 + random() * .22, .19 + random() * .13), false);
            }
          }
        }
      }
    }
    for(let i=0;i<28;i++) {
      const a=i*2.399,y=.90+random()*.1,base=trunkPoint(y);
      canopy.leaf(base,base.clone().add(new T.Vector3(Math.cos(a)*.045,.035,Math.sin(a)*.045)),.007,new T.Color('#54734a'),false);
    }
  } else {
    for (let arm = 0; arm < 13; arm++) {
      const y = .34 + arm * .035, angle = arm * 2.399, length = .18 + random() * .12;
      const direction = new T.Vector3(Math.cos(angle), .7, Math.sin(angle));
      const origin = trunkPoint(y), elbow = origin.clone().addScaledVector(direction, length * .65);
      branch(wood, origin, elbow, .014 * (1 - y), .004);
      for (let twig = 0; twig < 4; twig++) {
        const a = angle + (twig - 1.5) * .55;
        const tip = elbow.clone().add(new T.Vector3(Math.cos(a) * length * .65, .06 + random() * .12, Math.sin(a) * length * .65));
        branch(wood, elbow, tip, .0035, .001);
        for (let j = 0; j < 13; j++) {
          const t = .25 + random() * .75, point = elbow.clone().lerp(tip, t);
          const a = j * 2.399 + random(), reach = .035 + random() * .035;
          const end = point.clone().add(new T.Vector3(Math.cos(a) * reach, .012 + random() * .022, Math.sin(a) * reach));
          canopy.leaf(point, end, reach * .36, new T.Color().setHSL(.23 + random() * .065, .38 + random() * .2, .25 + random() * .13));
        }
      }
    }
  }
  const bark = mergeGeometries(wood)!; wood.forEach(part => part.dispose());
  bark.computeBoundingBox(); bark.computeBoundingSphere();
  return { wood: bark, leaves: canopy.geometry() };
}

export function grassGeometry(fern = false) {
  const random = rng(fern ? 7821 : 1235), leaves = foliage();
  if (fern) {
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.399, reach = .35 + random() * .22;
      const direction = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const side = new T.Vector3(-direction.z, 0, direction.x);
      for (let j = 0; j < 10; j++) {
        const t = j / 10, center = direction.clone().multiplyScalar(t * reach); center.y = .5 * Math.sin(t * Math.PI * .8);
        for (const sign of [-1, 1]) {
          const tip = center.clone().addScaledVector(side, sign * .16 * (1 - t)).addScaledVector(direction, .065); tip.y -= .025;
          leaves.leaf(center, tip, .018 * (1 - t) + .002, new T.Color().setHSL(.27, .49, .19 + t * .1));
        }
      }
    }
  } else {
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.399, height = .32 + random() * .4, lean = .08 + random() * .26;
      const root = new T.Vector3(Math.cos(angle) * .075 * random(), 0, Math.sin(angle) * .075 * random());
      const side = new T.Vector3(Math.cos(angle + 1.1), 0, Math.sin(angle + 1.1));
      const color = new T.Color().setHSL(.20 + random() * .08, .40 + random() * .25, .20 + random() * .15);
      for (let j = 0; j < 3; j++) {
        const t0 = j / 3, t1 = (j + 1) / 3;
        const point = (t: number) => root.clone().add(new T.Vector3(Math.cos(angle) * lean * t * t, height * t, Math.sin(angle) * lean * t * t));
        leaves.ribbon(point(t0),point(t1),side,.018*(1-t0),.018*(1-t1),color,.48+t1*.52);
      }
    }
  }
  return leaves.geometry();
}

// Retain complete leaves, never isolated triangles; far/Low shares the same silhouette.
export function distantFoliage(source: T.BufferGeometry, verticesPerLeaf: number) {
  const result=new T.BufferGeometry(),count=source.getAttribute('position').count;
  for(const [name,attribute] of Object.entries(source.attributes)) {
    const values:number[]=[];
    for(let start=0;start<count;start+=verticesPerLeaf*3) {
      for(let i=start;i<Math.min(start+verticesPerLeaf,count);i++)
        for(let component=0;component<attribute.itemSize;component++)values.push(attribute.array[i*attribute.itemSize+component]!);
    }
    result.setAttribute(name,new T.Float32BufferAttribute(values,attribute.itemSize));
  }
  result.computeBoundingBox();result.computeBoundingSphere();return result;
}

function surfaceTexture(bark: boolean) {
  const size = 256, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!, data = ctx.createImageData(size, size), random = rng(bark ? 57 : 91);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const broad = noise(x / 33, y / 37), fine = noise(x / 3, y / 4), grain = random();
    const fracture = Math.abs(noise(x/45,y/61,2)*.6+noise(x/13,y/17,8)*.4-.5);
    const groove = bark ? Math.pow(Math.abs(Math.sin(x * .28 + noise(x / 17, y / 65) * 5)), 10) : Math.max(0,1-fracture*80);
    const value = bark ? 95 + broad * 25 + fine * 18 - groove * 60 : 115 + broad * 60 + fine * 25 + grain * 21 - groove * 24;
    const i = (y * size + x) * 4;
    data.data[i] = value; data.data[i + 1] = value * (bark ? .72 : .98); data.data[i + 2] = value * (bark ? .48 : .90); data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.anisotropy = 4;
  return texture;
}

export class NatureAssets {
  readonly rocks = [0, 1, 2].map(i => stoneGeometry(13 + i * 7));
  readonly hazard = stoneGeometry(41, true);
  readonly trees = [0, 1, 2, 3].map(treeGeometry);
  readonly distantLeaves = this.trees.map((tree,i)=>distantFoliage(tree.leaves,i===1?12:6));
  readonly grass = grassGeometry();
  readonly fern = grassGeometry(true);
  readonly stone: T.MeshStandardMaterial;
  readonly bark: T.MeshStandardMaterial;
  readonly leaves = new T.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .92, side: T.DoubleSide });
  readonly undergrowth = new T.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 1, side: T.DoubleSide });

  constructor() {
    const stone = surfaceTexture(false), bark = surfaceTexture(true);
    this.stone = new T.MeshStandardMaterial({ map: stone, bumpMap: stone, bumpScale: .045, vertexColors: true, roughness: .9 });
    this.bark = new T.MeshStandardMaterial({ map: bark, bumpMap: bark, bumpScale: .035, roughness: .96 });
  }
}
