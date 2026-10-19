import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SEATS, clamp, type Vec3 } from '../shared/protocol';

const fabrics = new Map<string, T.MeshStandardMaterial>();
const cloth = (color: T.ColorRepresentation) => {
  const key = String(color); let material = fabrics.get(key);
  if (!material) { material = new T.MeshStandardMaterial({ color, roughness: .86 }); fabrics.set(key, material); }
  return material;
};
function consolidate(group: T.Group) {
  const batches = new Map<T.Material, T.Mesh[]>();
  for (const child of group.children) if (child instanceof T.Mesh && !Array.isArray(child.material)) {
    const batch = batches.get(child.material) ?? []; batch.push(child); batches.set(child.material, batch);
  }
  for (const [material, meshes] of batches) if (meshes.length > 1) {
    const sources = meshes.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
    const geometry = mergeGeometries(sources);
    if (geometry) { for (const mesh of meshes) { group.remove(mesh); mesh.geometry.dispose(); } crewMesh(geometry, material, group); }
    for (const source of sources) source.dispose();
  }
}
const skinColors = ['#bc8058', '#e6ad85', '#87553e', '#d69b6c'];
const hairColors = ['#382b24', '#b86c31', '#252328', '#4c3129'];
const up = new T.Vector3(0, 1, 0);
export function crewMesh(geometry: T.BufferGeometry, material: T.Material, parent: T.Object3D, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function segment(mesh: T.Mesh, a: T.Vector3, b: T.Vector3) {
  const direction = b.clone().sub(a);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.scale.y = direction.length(); mesh.quaternion.setFromUnitVectors(up, direction.normalize());
}

/** Stylized procedural crew rig. Arms solve to actual blade-shaft grip points;
 * no cosmetic character motion is allowed to move the physical boat. */
export class CrewMember extends T.Group {
  readonly torso = new T.Group();
  readonly head = new T.Group();
  readonly eyes = new T.Group();
  readonly arms: { upper: T.Mesh; lower: T.Mesh; hand: T.Mesh }[] = [];
  readonly shoulders = [new T.Vector3(-.19, .39, 0), new T.Vector3(.19, .39, 0)];
  readonly jointPositions: { shoulder: T.Vector3; elbow: T.Vector3; hand: T.Vector3 }[] = [];
  constructor(readonly seat: number) {
    super();
    const station = SEATS[seat]!;
    this.name = `crew-${seat}`;
    this.position.set(station.side * .43, .57, station.z);
    const skin = new T.MeshStandardMaterial({ color: skinColors[seat], roughness: .7 });
    const hair = cloth(hairColors[seat]!);
    const shirt = cloth(['#d9d7bc', '#e4c78f', '#b9d4c8', '#e0c0a0'][seat]!);
    const vest = cloth(station.color), webbing = cloth('#263d39'), trousers = cloth('#30454b');
    this.add(this.torso);
    const body = crewMesh(new T.CapsuleGeometry(.155, .19, 5, 12), shirt, this.torso, 0, .26);
    body.scale.set(1.1, 1, .83);
    // Two padded vest panels, shoulder straps, zipper and waist webbing.
    for (const side of [-1, 1]) {
      const panel = crewMesh(new T.CapsuleGeometry(.087, .18, 4, 10), vest, this.torso, side * .093, .29, .115);
      panel.scale.z = .55;
      crewMesh(new T.BoxGeometry(.045, .1, .19), webbing, this.torso, side * .115, .47, .01);
    }
    crewMesh(new T.BoxGeometry(.018, .31, .035), webbing, this.torso, 0, .29, .17);
    crewMesh(new T.BoxGeometry(.33, .045, .24), webbing, this.torso, 0, .16, .025);
    crewMesh(new T.BoxGeometry(.065, .058, .025), new T.MeshStandardMaterial({ color: '#c8c3ad', metalness: .65, roughness: .3 }), this.torso, 0, .16, .16);
    // Rear vest and a distinctive high-contrast station patch readable in chase view.
    crewMesh(new T.BoxGeometry(.29, .26, .08), vest, this.torso, 0, .31, -.12);
    for (let i = 0; i <= seat; i++) crewMesh(new T.BoxGeometry(.022, .08, .012), cloth('#fff0c9'), this.torso, (i - seat / 2) * .045, .32, -.168);
    for (const side of [-1, 1]) {
      const thigh = crewMesh(new T.CapsuleGeometry(.068, .22, 4, 10), trousers, this, side * .105, .015, .16);
      thigh.rotation.x = Math.PI / 2;
      crewMesh(new T.CapsuleGeometry(.065, .18, 4, 10), trousers, this, side * .105, -.15, .3);
      const boot = crewMesh(new T.SphereGeometry(.085, 10, 8), cloth('#29332e'), this, side * .105, -.26, .36);
      boot.scale.set(.85, .7, 1.6);
      crewMesh(new T.BoxGeometry(.12, .025, .23), cloth('#997646'), this, side * .105, -.3, .36);
    }
    this.head.position.set(0, .64, .02); this.torso.add(this.head);
    crewMesh(new T.CylinderGeometry(.06, .065, .1, 10), skin, this.torso, 0, .5);
    const face = crewMesh(new T.SphereGeometry(.174, 18, 14), skin, this.head);
    face.scale.set(.94, 1.06, .92);
    this.eyes.position.set(0, .02, .148); this.head.add(this.eyes);
    for (const side of [-1, 1]) {
      crewMesh(new T.SphereGeometry(.043, 9, 7), skin, this.head, side * .16, -.012, .005);
      const eyeWhite = crewMesh(new T.SphereGeometry(.033, 10, 8), cloth('#fff8e5'), this.eyes, side * .064, 0, -.003);
      eyeWhite.scale.z = .4;
      crewMesh(new T.SphereGeometry(.015, 9, 7), cloth('#242c2c'), this.eyes, side * .061, -.001, .011);
      const brow = crewMesh(new T.BoxGeometry(.055, .014, .018), hair, this.head, side * .065, .071, .143);
      brow.rotation.z = side * -.15;
    }
    crewMesh(new T.SphereGeometry(.031, 9, 7), skin, this.head, 0, -.015, .167).scale.z = 1.35;
    const mouth = crewMesh(new T.TorusGeometry(.035, .006, 4, 12, Math.PI * .7), cloth('#794a39'), this.head, 0, -.067, .148);
    mouth.rotation.z = Math.PI * 1.15;
    crewMesh(new T.SphereGeometry(.18, 16, 10, 0, Math.PI * 2, 0, Math.PI * .48), hair, this.head, 0, .04, -.014);
    if (seat === 0) {
      // Knitted cap with rolled brim and pompom.
      crewMesh(new T.SphereGeometry(.182, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), vest, this.head, 0, .06, -.005).scale.y = 1.1;
      const brim = crewMesh(new T.TorusGeometry(.174, .022, 6, 20), vest, this.head, 0, .07, -.005); brim.rotation.x = Math.PI / 2;
      crewMesh(new T.SphereGeometry(.045, 10, 8), cloth('#fff1cc'), this.head, 0, .26, -.005);
    } else if (seat === 1) {
      crewMesh(new T.SphereGeometry(.07, 12, 10), hair, this.head, 0, .09, -.17);
      const visor = crewMesh(new T.SphereGeometry(.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), vest, this.head, 0, .075);
      visor.scale.y = .55;
      const peak = crewMesh(new T.SphereGeometry(.13, 14, 6), vest, this.head, 0, .07, .17); peak.scale.set(1, .12, 1.2);
    } else if (seat === 2) {
      for (let i = 0; i < 7; i++) crewMesh(new T.SphereGeometry(.065, 8, 7), hair, this.head, Math.sin(i * 2.4) * .11, .13 + (i % 2) * .025, Math.cos(i * 2.4) * .1);
      const band = crewMesh(new T.TorusGeometry(.172, .025, 5, 20), vest, this.head, 0, .055, 0); band.rotation.x = Math.PI / 2;
    } else {
      crewMesh(new T.CylinderGeometry(.21, .2, .04, 18), vest, this.head, 0, .1, 0);
      crewMesh(new T.CylinderGeometry(.145, .17, .1, 16), vest, this.head, 0, .16, 0);
      for (const side of [-1, 1]) {
        const glasses = crewMesh(new T.TorusGeometry(.042, .009, 5, 14), webbing, this.head, side * .064, .02, .17);
        glasses.scale.y = .8;
      }
    }
    consolidate(this.eyes); consolidate(this.head); consolidate(this.torso); consolidate(this);
    for (let i = 0; i < 2; i++) {
      const upper = crewMesh(new T.CylinderGeometry(.055, .06, 1, 9), shirt, this);
      const lower = crewMesh(new T.CylinderGeometry(.043, .052, 1, 9), skin, this);
      const palm = new T.SphereGeometry(.053, 10, 8).scale(.8, 1, .85);
      const thumbSide = i ? -1 : 1;
      const thumb = new T.CapsuleGeometry(.018, .032, 3, 7).rotateZ(thumbSide * -.7).translate(thumbSide * .036, .004, .018);
      const gripGeometry = mergeGeometries([palm, thumb]);
      const hand = crewMesh(gripGeometry ?? palm, skin, this);
      if (gripGeometry) palm.dispose(); thumb.dispose();
      this.arms.push({ upper, lower, hand });
    }
    this.pose({ x: station.side * 1.45, y: .62, z: station.z }, 0, 0);
  }
  react(age: number) {
    this.torso.position.set(0, 0, 0);
    this.torso.rotation.set(-.15, 0, Math.sin(age * 8 + this.seat) * .12);
    this.head.rotation.set(-.1, 0, 0); this.eyes.scale.y = 1; this.torso.updateMatrix();
    this.arms.forEach((_arm, i) => {
      const shoulder = this.shoulders[i]!.clone().applyMatrix4(this.torso.matrix);
      const hand = shoulder.add(new T.Vector3((i ? 1 : -1) * .25, .43 + Math.sin(age * 8 + i) * .055, Math.sin(age * 11 + i) * .1));
      this.reachArm(i, hand);
    });
  }
  pose(blade: Vec3, time: number, force: number) {
    const station = SEATS[this.seat]!;
    const effort = clamp(force / 300, 0, 1);
    this.torso.rotation.x = clamp((blade.z - station.z) * .095, -.12, .12);
    this.torso.rotation.y = -station.side * effort * .07;
    this.torso.rotation.z = -station.side * effort * .055;
    this.torso.position.y = Math.sin(time * 1.7 + this.seat) * .006;
    this.torso.position.z = clamp((blade.z - station.z) * .02, -.022, .022);
    this.head.rotation.x = effort * .10;
    this.head.rotation.y = Math.sin(time * .5 + this.seat * 1.3) * .09 + station.side * effort * .10;
    this.head.rotation.z = Math.sin(time * .8 + this.seat) * .025;
    // Absolute shared time keeps blinks frame-rate independent and gives each
    // crewmate a different cadence. No animation timer survives a reconnect.
    const blinkPhase = (Math.max(0, time) + this.seat * 1.31) % (4.3 + this.seat * .37);
    this.eyes.scale.y = .06 + .94 * T.MathUtils.smoothstep(Math.abs(blinkPhase - .12), 0, .12);
    this.torso.updateMatrix();
    const handle = new T.Vector3(station.side * .65, .97, station.z + .03);
    const tip = new T.Vector3(blade.x, blade.y, blade.z);
    const shaft = tip.clone().sub(handle).normalize();
    this.arms.forEach((_arm, i) => {
      const grip = handle.clone().lerp(tip, i === (station.side < 0 ? 0 : 1) ? .28 : .015).sub(this.position);
      this.reachArm(i, grip, shaft);
    });
  }
  private reachArm(i: number, grip: T.Vector3, shaft?: T.Vector3) {
    const arm = this.arms[i]!;
    const shoulder = this.shoulders[i]!.clone().applyMatrix4(this.torso.matrix);
    const axis = grip.clone().sub(shoulder), distance = Math.min(.63, axis.length());
    axis.normalize();
    const hand = shoulder.clone().addScaledVector(axis, distance);
    const bend = new T.Vector3(0, -.65, -.6); bend.addScaledVector(axis, -bend.dot(axis)).normalize();
    const elbow = shoulder.clone().addScaledVector(axis, distance * .5).addScaledVector(bend, Math.sqrt(Math.max(0, .32 ** 2 - (distance * .5) ** 2)));
    segment(arm.upper, shoulder, elbow); segment(arm.lower, elbow, hand); arm.hand.position.copy(hand);
    arm.hand.quaternion.setFromUnitVectors(up, shaft ?? axis);
    this.jointPositions[i] = { shoulder, elbow, hand };
  }
}
