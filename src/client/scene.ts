import * as T from 'three';
import { SEATS, DT, paddleHandle, type Snapshot, type Vec3 } from '../shared/protocol';
import {SANDBAR} from '../shared/bathymetry';
import { PYLONS, ROCKS, SPIKES, WHIRLPOOL, SWEEPERS, sampleSweeper, WATERWHEEL, WATERWHEEL2, sampleWaterwheel, sampleWaterwheel2, CHECKPOINTS, FINISH_Z, ROUTE_SECTIONS, RAPIDS, channelHalfWidth, channelCenter, riverX, bankEdge, sampleWater, sampleWaterHeight, RESCUE_EDDY } from '../shared/world';

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RiverWater } from './water';
import { CrewMember } from './crew';
import { NatureAssets } from './nature';
import { HULL_RING, floorPlank, hullBottom, hullPanel } from './hull';
import { HULL_TOP, HULL_BOTTOM, HULL_BASE_SCALE } from '../shared/hull';
import { riverCamera } from './camera';
import { riverbedGeometry, bankGeometry, bankGround, bankTexture } from './riverbed';
import { paddleBlade, bowRope } from './boat-detail';
import {dangerRock,dangerVariant} from './danger';

const materials = new Map<string,T.MeshStandardMaterial>();
const mat = (color: T.ColorRepresentation, extra: T.MeshStandardMaterialParameters = {}) => {
  const key=JSON.stringify([color,extra]);let value=materials.get(key);
  if(!value){value=new T.MeshStandardMaterial({color,roughness:.9,...extra});materials.set(key,value);}return value;
};
let seed = 2351;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

export class RiverScene {
  readonly renderer: T.WebGLRenderer;
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(43, 1, 0.1, 400);
  readonly boat = new T.Group();
  readonly capsizeRing=new T.Mesh(new T.TorusGeometry(1.05,.055,6,40),new T.MeshBasicMaterial({color:'#f3cf6b'}));
  readonly sweepers: T.Group[] = [];
  readonly wheel = new T.Group();
  readonly wheel2 = new T.Group();
  get sweeper() { return this.sweepers[0]!; }
  readonly chunks = new Map<number,T.Group>();
  readonly sky: Sky;
  readonly flowTracers = Array.from({ length: 200 }, (_, i) => new T.Vector2(((i * 7.391) % 24) - 12, ((i * 3.713) % 168) - 16));
  readonly paddles: { shaft: T.Mesh; blade: T.Mesh }[] = [];
  readonly people: CrewMember[] = [];
  readonly boatParts: { mesh: T.Mesh; position: T.Vector3; rotation: T.Euler }[] = [];
  readonly water: RiverWater;
  readonly vortexFoam: T.InstancedMesh;
  readonly rescueFoam: T.InstancedMesh;
  readonly rescueTracers = Array.from({length:48},(_,i)=> {
    const angle=i*2.399,radius=.35+(i%7)*.075;
    return new T.Vector2(riverX(RESCUE_EDDY.x+Math.cos(angle)*RESCUE_EDDY.radiusX*radius,RESCUE_EDDY.z),RESCUE_EDDY.z+Math.sin(angle)*RESCUE_EDDY.radiusZ*radius);
  });
  readonly vortexTracers = Array.from({ length: 180 }, (_, i) => {
    const radius = .95 + i / 180 * 3.6, angle = i * 2.399;
    return new T.Vector2(WHIRLPOOL.x + Math.cos(angle) * radius, WHIRLPOOL.z + Math.sin(angle) * radius);
  });
  readonly spray: T.InstancedMesh;
  readonly particles: { position: T.Vector3; velocity: T.Vector3; life: number }[] = [];
  readonly nature = new NatureAssets();
  readonly shoreStones: {x:number;z:number;rx:number;rz:number}[] = [];
  readonly vegetation = new Map<number,T.Group>();
  readonly foliageLods: {id:number;mesh:T.InstancedMesh;trunk:T.InstancedMesh;near:T.BufferGeometry;medium:T.BufferGeometry;far:T.BufferGeometry;wood:T.BufferGeometry;distantWood:T.BufferGeometry;centre:T.Vector3;level:number}[] = [];
  readonly undergrowthLods: {id:number;mesh:T.InstancedMesh;count:number;z:number}[] = [];
  readonly forest: { x: number; z: number; height: number; variant: number }[] = [];
  presentation: 'title' | 'game' = 'title';
  dockPreview?: {seat: number; point: Vec3};
  private lowQuality = false;
  private nextSpray = 0;
  private lastCrash = -1;
  readonly foam: T.InstancedMesh;
  readonly sun: T.DirectionalLight;
  readonly ripples: { mesh: T.Mesh; born: number; seat: number }[] = [];
  readonly position = new T.Vector3();
  readonly rotation = new T.Quaternion();
  readonly targetPosition = new T.Vector3();
  readonly targetRotation = new T.Quaternion();
  readonly desiredCamera = new T.Vector3();
  readonly look = new T.Vector3();
  readonly raycaster = new T.Raycaster();
  readonly occluders: T.Object3D[] = [];
  // Reuse frame scratch and ripple geometry; each ripple owns only its fade material.
  private readonly dummy = new T.Object3D();
  // ── Scratch Vector3 instances reused every frame to avoid GC pressure ──
  private readonly _poseHandle = new T.Vector3();
  private readonly _poseTip    = new T.Vector3();
  private readonly _poseDir    = new T.Vector3();
  private readonly _poseUp     = new T.Vector3(0, 1, 0);
  private readonly _camTarget  = new T.Vector3();
  private readonly _camTitleOff = new T.Vector3();
  private readonly _camTitleLook = new T.Vector3();
  private readonly _camOrigin  = new T.Vector3();
  private readonly _camFrom    = new T.Vector3();
  private readonly _camDir     = new T.Vector3();
  private readonly _boundsPoint = new T.Vector3();
  private readonly rippleGeometry = new T.RingGeometry(0.06, 0.085, 14);
  private readonly rippleMaterial = new T.MeshBasicMaterial({ color: '#e0efda', transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false });
  snapshot?: Snapshot;
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  lastReset = -1;
  lastSnapshotAt = 0;
  time = 0;
  private dockBlend = 0;
  private readonly waterMotion = new T.Vector2();
  private _lastRenderInfoAt = 0;
  private _lastVegetationInstances = 0;
  private _lastFoliageLevels: number[] = [0, 0, 0];

  constructor(container: HTMLElement) {
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .72;
    this.renderer.info.autoReset = false;
    container.append(this.renderer.domElement);
    this.scene.fog = new T.Fog('#b4c6ba', 42, 170);
    this.scene.add(new T.HemisphereLight('#b6d9ec', '#626c3b', 1.3));
    this.sun = new T.DirectionalLight('#ffdfaa', 2.5);
    this.sun.position.set(-20, 36, 28);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    // G-C fix: widen shadow frustum from ±28 to ±32 to cover full-width gorge sections.
    // G-B fix: extend far from 100 to 130 to reduce shadow pop-in on visible distant chunks.
    Object.assign(this.sun.shadow.camera, { left: -32, right: 32, top: 35, bottom: -20, near: 0.5, far: 130 });
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);

    const sky = this.sky = new Sky(); sky.scale.setScalar(350);
    const atmosphere = sky.material.uniforms;
    atmosphere.turbidity!.value = 5; atmosphere.rayleigh!.value = 2;
    atmosphere.mieCoefficient!.value = .004; atmosphere.mieDirectionalG!.value = .8;
    atmosphere.sunPosition!.value = new T.Vector3(-.42, .7, .58).multiplyScalar(100);
    const skyScene = new T.Scene(); skyScene.add(sky);
    const environment = new T.PMREMGenerator(this.renderer);
    this.scene.environment = environment.fromScene(skyScene, .04, .1, 400).texture;
    this.scene.environmentIntensity = .09; environment.dispose(); this.scene.add(sky);
    this.water = new RiverWater(); this.scene.add(this.water);
    this.vortexFoam = new T.InstancedMesh(new T.PlaneGeometry(.06, .7), new T.MeshBasicMaterial({ color: '#d1eee0', transparent: true, opacity: .65, depthWrite: false, side: T.DoubleSide }), 180);
    this.scene.add(this.vortexFoam);
    this.rescueFoam = new T.InstancedMesh(new T.PlaneGeometry(.065,.65),new T.MeshBasicMaterial({color:'#e4f3d8',transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide}),this.rescueTracers.length);
    this.rescueFoam.frustumCulled=false;this.scene.add(this.rescueFoam);
    this.spray = new T.InstancedMesh(new T.SphereGeometry(1, 5, 4), new T.MeshBasicMaterial({ color: '#dbf9f0', transparent: true, opacity: .78 }), 100);
    this.spray.count = 0; this.spray.frustumCulled = false; this.scene.add(this.spray);
    this.foam = new T.InstancedMesh(new T.PlaneGeometry(0.045, 0.7), new T.MeshBasicMaterial({ color: '#d0e8cd', transparent: true, opacity: 0.36, depthWrite: false }), 200);
    this.scene.add(this.foam);
    this.landscape();
    this.gorge();
    this.sign('SHALLOW WATER','SAND LEFT · REVERSE TO DEEP WATER',-14.5,246,'#ead69a');
    this.makeWaterwheel();
    this.makeWaterwheel2();
    const bed = this.nature.stone.clone(); bed.vertexColors = false; bed.color.set('#999073'); bed.bumpScale = .025;
    for (let start = -30; start < FINISH_Z + 30; start += 60) {
      const centre = start + 30;
      const riverbed = this.mesh(riverbedGeometry(start).translate(0,0,-centre),bed,0,0,centre);
      // The color/depth capture has one job: provide the submerged river floor.
      // Keeping this separate from the main scene prevents another forest pass.
      riverbed.name = 'submerged-riverbed'; riverbed.layers.enable(1);
    }
    this.updateVegetation(0);
    this.batchChunks();
    for (const chunk of this.chunks.values()) for (const child of chunk.children) {
      if (child instanceof T.Mesh && !(child instanceof T.InstancedMesh)) this.occluders.push(child);
    }
    // Mesh.raycast only rejects by local box when one already exists. Build
    // it after merging/transforms so camera rays skip irrelevant triangles.
    for (const object of this.occluders) if (object instanceof T.Mesh) object.geometry.computeBoundingBox();
    this.makeBoat();
    this.capsizeRing.rotation.x=-Math.PI/2;this.capsizeRing.visible=false;this.scene.add(this.capsizeRing);
    for (const child of this.boat.children) {
      if (child instanceof T.Mesh) this.boatParts.push({ mesh: child, position: child.position.clone(), rotation: child.rotation.clone() });
    }
    this.scene.add(this.boat);
    // Transmission is a deliberately tiny second pass: the submerged riverbed
    // plus any explicit underwater test geometry. Layer0 remains the main view.
    this.scene.traverse(object => {
      if (object instanceof T.Light) object.layers.enable(1);
    });
    this.scene.updateMatrixWorld(true);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  mesh(geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number, group: T.Object3D = this.scene) {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    if(group === this.scene) {
      const id=Math.floor(z/60); let chunk=this.chunks.get(id);
      if(!chunk){chunk=new T.Group();this.chunks.set(id,chunk);this.scene.add(chunk);} chunk.add(mesh);
    } else group.add(mesh);
    return mesh;
  }

  landscape() {
    const sand = this.nature.stone.clone(); sand.vertexColors=false; sand.color.set('#b9b29b');sand.bumpScale=.008;
    sand.map=this.nature.stone.map!.clone();sand.map.repeat.set(24,64);sand.bumpMap=sand.map;
    const grass = sand.clone();grass.color.set('#788454');
    for (const side of [-1, 1]) {
      this.mesh(new T.BoxGeometry(65, 1.5, 195), sand, side * 45.5, -0.55, 65);
      this.mesh(new T.BoxGeometry(60, 1.7, 195), grass, side * 46.5, -0.3, 65);
      for (const geometry of this.nature.rocks) {
        const shore = new T.InstancedMesh(geometry, this.nature.stone, 28);
        shore.name = 'weathered-shore-stones';
        shore.castShadow = shore.receiveShadow = true;
        const transform = new T.Object3D();
        for (let i = 0; i < 28; i++) {
          const z = -22 + random() * 186, x = side * (13.25 + random() * 2.8), radius = .4 + random() * .95;
          transform.position.set(x, .16, z); transform.rotation.set(random() * .25, random() * 6, random() * .2);
          transform.scale.set(radius * (1.0 + random() * .5), radius * (.65 + random() * .45), radius * (1 + random() * .6)); transform.updateMatrix();
          this.shoreStones.push({x,z,rx:transform.scale.x,rz:transform.scale.z});
          shore.setMatrixAt(i, transform.matrix); shore.setColorAt(i, new T.Color().setHSL(.10 + random() * .04, .08 + random() * .08, .64 + random() * .2));
        }
        shore.computeBoundingSphere(); this.scene.add(shore); this.occluders.push(shore);
      }
      for (let i = 0; i < 145; i++) {
        const x = side * (16 + random() * 40);
        const z = -26 + random() * 200;
        const height = 3.5 + random() * 7;
        this.forest.push({ x, z, height, variant: i % 4 });
      }
      for (let i = 0; i < 12; i++) {
        const mountain = this.mesh(new T.ConeGeometry(13 + random() * 16, 20 + random() * 24, 5), mat(i % 2 ? '#6b8c84' : '#849d91'), side * (22 + random() * 55), 9, 140 + random() * 55);
        mountain.position.x += side * 24;
        mountain.rotation.y = random() * 4;
      }
    }
    const wood = mat('#927550');
    // Launch dock stays out of the navigable channel; posts frame the first view.
    for (let i = 0; i < 14; i++) this.mesh(new T.BoxGeometry(3.9, 0.16, 0.4), mat(i % 2 ? '#b1976c' : '#a58a60'), -11, 0.38, -5 + i * 0.43);
    for (const x of [-12.5, -9.5]) for (const z of [-5, 0.5]) {
      this.mesh(new T.CylinderGeometry(0.12, 0.16, 2.2, 8), wood, x, 0.28, z);
      this.mesh(new T.CylinderGeometry(0.18, 0.18, 0.12, 8), mat('#d5c49a'), x, 1.4, z);
    }
    for (const p of PYLONS) {
      this.mesh(new T.CylinderGeometry(.25,.27,2.2,8),mat('#3e4542'),p.x,-.3,p.z);
      this.mesh(new T.ConeGeometry(.25,.6,4),mat('#e45436'),p.x,1.1,p.z);
      for(const y of [.05,.42,.79])this.mesh(new T.CylinderGeometry(.268,.268,.18,8),mat(y===.42?'#e45436':'#f3dba0'),p.x,y,p.z);
    }
    const dangerMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.8,flatShading:true});
    const rockVariants=[0,1,2].map(dangerRock);
    for (const rock of ROCKS) {
      this.mesh(rockVariants[dangerVariant(rock.id)]!.clone().scale(rock.radius,rock.radius,rock.radius),dangerMaterial,rock.x,-.05,rock.z);
      // White water collar explains the rock footprint from the chase camera.
      const collar = this.mesh(new T.TorusGeometry(rock.radius + .12, .025, 4, 36), mat('#d5e5d6'), rock.x, .015, rock.z);
      collar.rotation.x = Math.PI / 2;
    }
    rockVariants.forEach(g=>g.dispose());
    const iron = new T.MeshStandardMaterial({ color: '#384c4e', metalness: .8, roughness: .27 });
    for (const spike of SPIKES) {
      this.mesh(new T.ConeGeometry(spike.radius, spike.height, 12), iron, spike.x, -.35 + spike.height / 2, spike.z);
      this.mesh(new T.CylinderGeometry(spike.radius * 1.25, spike.radius * 1.35, .11, 12), mat('#8b5b39'), spike.x, -.08, spike.z);
      // Danger paint follows the taper; it does not enlarge the lethal collider.
      const bandY = spike.height * .55;
      const band = this.mesh(new T.ConeGeometry(spike.radius * .45, spike.height * .45, 12), mat('#ef5738', { metalness: .15, roughness: .6 }), spike.x, -.35 + bandY + spike.height * .225, spike.z);
      band.scale.set(1.01, 1.005, 1.01);
    }
    const logMaterial = new T.MeshStandardMaterial({ color: '#745333', roughness: .72 });
    for (const spec of SWEEPERS) {
      const log=new T.Group();
      const timber = this.mesh(new T.CylinderGeometry(spec.radius, spec.radius, spec.halfLength * 2, 16), logMaterial, 0, 0, 0, log);
      timber.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        this.mesh(new T.SphereGeometry(spec.radius, 14, 10), logMaterial, side * spec.halfLength, 0, 0, log);
        for(const offset of [-.14,.14]){
          const band=this.mesh(new T.CylinderGeometry(spec.radius+.002,spec.radius+.002,.22,12),mat(offset<0?'#ef5738':'#f3dba0'),side*spec.halfLength*.74+offset,0,0,log);band.rotation.z=Math.PI/2;
        }
      }
      log.position.copy(sampleSweeper(0,spec));this.scene.add(log);this.sweepers.push(log);
    }
    this.sign('RED TEETH = BOAT BREAKS','STEER CLEAR  •  GREEN MARKERS = REST',-10,9,'#ef7954');
    for (const z of CHECKPOINTS.slice(1)) {
      for (const x of [-1,1].map(side=>riverX(side*(channelHalfWidth(z)-3),z))) {
        this.mesh(new T.CylinderGeometry(0.3, 0.4, 0.5, 12), mat('#6ba47b'), x, 0.2, z);
        this.mesh(new T.CylinderGeometry(0.035, 0.035, 1, 6), wood, x, 0.8, z);
        this.mesh(new T.BoxGeometry(0.5, 0.25, 0.02), mat('#f9e3ac'), x + 0.2, 1.2, z);
      }
    }
    // A distant bridge previews the waterworks journey without mass world content.
    const stone = mat('#b3b99c');
    for (const x of [-18, 18]) {
      this.mesh(new T.BoxGeometry(1.5, 13, 3), stone, x, 5.8, 155);
      const arch = new T.TorusGeometry(3.75, 0.65, 5, 18, Math.PI);
      this.mesh(arch, stone, x + 4.5, 5.5, 155);
    }
    this.mesh(new T.BoxGeometry(45, 1, 4), stone, 0, 13, 155);
    this.sign('TIMBER GORGE', 'KEEP YOUR CREW CLOSE', -11, 142, '#e4bd7e');
  }

  // Cache canvas textures by content so repeated identical signs share one GPU upload.
  private readonly _signTextureCache = new Map<string, T.CanvasTexture>();
  sign(title:string, subtitle:string, x:number,z:number,color='#edbc79') {
    x=riverX(x,z);
    const cacheKey=`${title}\0${subtitle}\0${color}`;
    let texture=this._signTextureCache.get(cacheKey);
    if(!texture){
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
      const ctx=canvas.getContext('2d')!;ctx.fillStyle='#293f35';ctx.fillRect(0,0,512,192);
      ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(7,7,498,178);
      ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 38px system-ui';ctx.fillText(title,256,80,460);
      ctx.font='20px system-ui';ctx.fillStyle='#f2ebcf';ctx.fillText(subtitle,256,133,460);
      texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      this._signTextureCache.set(cacheKey,texture);
    }
    const board=this.mesh(new T.BoxGeometry(3.3,1.23,.10),mat('#72553b'),x,1.8,z);
    const front=this.mesh(new T.PlaneGeometry(3.25,1.2),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}),x,1.8,z-.061);front.rotation.y=Math.PI;
    for(const side of [-1,1]) this.mesh(new T.CylinderGeometry(.06,.08,2.3,7),mat('#776047'),x+side*1.18,.7,z);
    board.userData.warning=true;
  }

  gorge() {
    const stone=this.nature.stone.clone();stone.color.set('#ffffff');stone.bumpScale=.08;stone.roughness=.96;
    stone.name='geological-bank';
    stone.map=stone.bumpMap=bankTexture();
    const ledge=mat('#777961'), timber=mat('#795a38');
    // The exposed face uses exactly the same chord as the server bank prism.
    // Finish scenery must support the last vegetation tile (through1440m).
    // Gameplay still ends at FINISH_Z; this is only the visible backdrop.
    for(let z=140;z<FINISH_Z+60;z+=5) {
      for(const side of [-1,1]) {
        this.mesh(bankGeometry(z,side),stone,0,0,z+2.5);
      }
    }
    // Ridge populations reuse the same branched assets as the launch forest.
    for(let start=180;start<FINISH_Z+25;start+=60) {
      for(let i=0;i<18;i++) {
        const z=start+random()*60,side=i%2?1:-1,width=channelHalfWidth(z),height=4+random()*5;
        this.forest.push({x:side*(width+4+random()*10),z,height,variant:i%4});
      }
    }
    for(const section of ROUTE_SECTIONS.filter(s=>s.start>=176&&s.kind!=='calm'&&s.kind!=='finish')) {
      const symbols={slalom:['ROCKS AHEAD','READ THE GAPS'],rapids:['FAST WATER','SET YOUR LINE EARLY'],timber:['MOVING TIMBER','WAIT FOR THE OPENING'],narrows:['IRON NARROWS','KEEP THE HULL CLEAR']};
      const words=symbols[section.kind as keyof typeof symbols];
      this.sign(words[0]!,words[1]!,channelHalfWidth(section.start-8)-1,section.start-8);
    }
    for (const z of [1140, 1300]) this.sign('FAST WATER', 'SET YOUR LINE EARLY', channelHalfWidth(z - 8) - 1, z - 8);
    for(const z of CHECKPOINTS.filter(z=>z>=156)) {
      const width=channelHalfWidth(z);
      // Keep boards across the pool from both authored bank recovery areas.
      const signSide=Math.abs(z-RESCUE_EDDY.z)<RESCUE_EDDY.radiusZ||(z>=SANDBAR.start&&z<=SANDBAR.end)?1:-1;
      this.sign('CHECKPOINT','GREEN PENNANTS · REGROUP',signSide*(width-1),z-3,'#a3d19c');
      for(let i=0;i<8;i++){const plankZ=z-1.2+i*.38;this.mesh(new T.BoxGeometry(2.8,.12,.36),timber,riverX(-width-1.2,plankZ),.42,plankZ);}
    }
    this.sign('RECOVERY EDDY','GREEN BANK · REGROUP',-channelHalfWidth(362)+1,362,'#a3d19c');
    this.sign('REJOIN THE RIVER','TURN OUT · THEN ROW FORWARD',-channelHalfWidth(388)+1,388,'#a3d19c');
    for(const z of [368,392]) {
      // Paint on the existing safe bank face; no post/collider in the water.
      const geometry=new T.PlaneGeometry(2,2.6).rotateY(Math.PI/2),points=geometry.getAttribute('position');
      for(let i=0;i<points.count;i++)points.setX(i,bankEdge(z+points.getZ(i),-1)+.02);
      geometry.computeVertexNormals();
      const paint=this.mesh(geometry,new T.MeshBasicMaterial({color:'#82c990',side:T.DoubleSide}),0,1.7,z);
      paint.material.name='bank-paint';paint.castShadow=false;
    }
    // Timber works silhouette: raised gantry, stacked logs and chain posts.
    for(const z of [416,443]) {
      const width=channelHalfWidth(z);
      for(const side of [-1,1]){
        this.mesh(new T.BoxGeometry(.6,7,.6),timber,riverX(side*(width+1),z),3.3,z);
        for(let i=0;i<5;i++) {const logZ=z+(i-2)*.65,log=this.mesh(new T.CylinderGeometry(.35,.4,6,10),timber,riverX(side*(width+3),logZ),.4+(i%2)*.7,logZ);log.rotation.z=Math.PI/2;}
      }
      this.mesh(new T.BoxGeometry(width*2+3,.5,.8),timber,channelCenter(z),10,z);
    }
    // Finish bridge stays clear of the entire navigable channel.
    for(const side of [-1,1])this.mesh(new T.BoxGeometry(2.5,16,4),ledge,side*14,7,FINISH_Z+2);
    this.mesh(new T.BoxGeometry(32,1.4,5),ledge,0,15,FINISH_Z+2);
    for(let i=0;i<17;i++)this.mesh(new T.BoxGeometry(1.8,.75,.15),mat(i%2?'#e8dcb1':'#34594d'),(i-8)*1.6,5.8,FINISH_Z);
    this.sign('THE GRAND WATERWORKS','ONE LAST STROKE',10.5,FINISH_Z-19,'#e8d9a3');
  }

  batchChunks() {
    for(const chunk of [...this.chunks.values(), this.wheel, this.wheel2]) {
      const batches=new Map<T.Material,T.Mesh[]>();
      for(const child of chunk.children)if(child instanceof T.Mesh && !(child instanceof T.InstancedMesh) && !Array.isArray(child.material)) {
        const batch=batches.get(child.material)??[];batch.push(child);batches.set(child.material,batch);
      }
      for(const [material,meshes]of batches)if(meshes.length>1){
        const sources=meshes.map(mesh=>{mesh.updateMatrix();const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return geometry.applyMatrix4(mesh.matrix);});
        const geometry=mergeGeometries(sources);
        if(geometry){for(const mesh of meshes){chunk.remove(mesh);mesh.geometry.dispose();}const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;chunk.add(mesh);}
        sources.forEach(source=>source.dispose());
      }
    }
  }

  makeWaterwheel() {
    const wheel=WATERWHEEL,wood=this.nature.bark,iron=mat('#41483f',{metalness:.7,roughness:.4}),paint=mat('#b84c31');
    this.wheel.position.set(wheel.x,wheel.y,wheel.z);this.scene.add(this.wheel);
    for(const side of [-1,1]) {
      const ring=this.mesh(new T.TorusGeometry(wheel.radius,.08,7,64),iron,side*wheel.halfWidth,0,0,this.wheel);ring.rotation.y=Math.PI/2;
      for(let i=0;i<wheel.blades;i++) {
        const a=i*Math.PI*2/wheel.blades;
        const spoke=this.mesh(new T.CylinderGeometry(.065,.065,wheel.radius-.25,7),wood,side*wheel.halfWidth,Math.cos(a)*(wheel.radius+.25)/2,Math.sin(a)*(wheel.radius+.25)/2,this.wheel);spoke.rotation.x=a;
      }
    }
    for(let i=0;i<wheel.blades;i++) {
      const a=i*Math.PI*2/wheel.blades;
      const paddle=this.mesh(new T.BoxGeometry(wheel.halfWidth*2,.3,.7),i%2?wood:paint,0,Math.cos(a)*wheel.radius,Math.sin(a)*wheel.radius,this.wheel);paddle.rotation.x=a;
    }
    const axle=this.mesh(new T.CylinderGeometry(.18,.18,8,12),iron,wheel.x+Math.sign(wheel.x)*2,wheel.y,wheel.z);axle.rotation.z=Math.PI/2;
    for(const z of [wheel.z-2,wheel.z+2]) {
      this.mesh(new T.BoxGeometry(2.6,5,1.1),wood,riverX(10.8,z),2,z);
      const brace=this.mesh(new T.BoxGeometry(.3,4,.3),wood,riverX(9.8,z),1.8,z);brace.rotation.z=-.3;
    }
    this.sign('WORKING WATERWHEEL','KEEP RIGHT · WATCH THE RED BLADES',-5.7,wheel.z-15);
    // Green bypass markers make the permanently open route visible before commitment.
    for(const z of [wheel.z-5,wheel.z+5]) {
      this.mesh(new T.CylinderGeometry(.08,.12,1.3,8),mat('#567b54'),riverX(-2.7,z),.3,z);
      this.mesh(new T.BoxGeometry(.45,.28,.025),mat('#c2d7a0'),riverX(-2.5,z),1,z);
    }
  }

  makeWaterwheel2() {
    // Mirrored wheel on the opposite bank; axle extends toward the bank.
    const wheel=WATERWHEEL2,wood=this.nature.bark,iron=mat('#41483f',{metalness:.7,roughness:.4}),paint=mat('#b84c31');
    this.wheel2.position.set(wheel.x,wheel.y,wheel.z);this.scene.add(this.wheel2);
    for(const side of [-1,1]) {
      const ring=this.mesh(new T.TorusGeometry(wheel.radius,.08,7,64),iron,side*wheel.halfWidth,0,0,this.wheel2);ring.rotation.y=Math.PI/2;
      for(let i=0;i<wheel.blades;i++) {
        const a=i*Math.PI*2/wheel.blades;
        const spoke=this.mesh(new T.CylinderGeometry(.065,.065,wheel.radius-.25,7),wood,side*wheel.halfWidth,Math.cos(a)*(wheel.radius+.25)/2,Math.sin(a)*(wheel.radius+.25)/2,this.wheel2);spoke.rotation.x=a;
      }
    }
    for(let i=0;i<wheel.blades;i++) {
      const a=i*Math.PI*2/wheel.blades;
      const paddle=this.mesh(new T.BoxGeometry(wheel.halfWidth*2,.3,.7),i%2?wood:paint,0,Math.cos(a)*wheel.radius,Math.sin(a)*wheel.radius,this.wheel2);paddle.rotation.x=a;
    }
    const axle=this.mesh(new T.CylinderGeometry(.18,.18,8,12),iron,wheel.x+Math.sign(wheel.x)*2,wheel.y,wheel.z);axle.rotation.z=Math.PI/2;
    for(const z of [wheel.z-2,wheel.z+2]) {
      this.mesh(new T.BoxGeometry(2.6,5,1.1),wood,riverX(-10.8,z),2,z);
      const brace=this.mesh(new T.BoxGeometry(.3,4,.3),wood,riverX(-9.8,z),1.8,z);brace.rotation.z=.3;
    }
    this.sign("DEVIL'S WHEEL",'KEEP LEFT · WATCH THE RED BLADES',5.7,wheel.z-15);
    // Green markers indicate the open bypass.
    for(const z of [wheel.z-5,wheel.z+5]) {
      this.mesh(new T.CylinderGeometry(.08,.12,1.3,8),mat('#567b54'),riverX(2.7,z),.3,z);
      this.mesh(new T.BoxGeometry(.45,.28,.025),mat('#c2d7a0'),riverX(2.5,z),1,z);
    }
  }

  private updateVegetation(z: number) {
    const first = Math.max(-1,Math.floor((z-100)/60));
    const last = Math.min(Math.floor(FINISH_Z/60),Math.floor((z+180)/60));
    for (const [id,group] of this.vegetation) if (id < first || id > last) {
      // InstancedMesh.dispose frees its GPU instance buffers, not the shared
      // geometry/materials needed by the next stretch of river.
      for (const mesh of group.children) if (mesh instanceof T.InstancedMesh) mesh.dispose();
      this.scene.remove(group); this.vegetation.delete(id);
      for(let i=this.foliageLods.length-1;i>=0;i--)if(this.foliageLods[i]!.id===id)this.foliageLods.splice(i,1);
      for(let i=this.undergrowthLods.length-1;i>=0;i--)if(this.undergrowthLods[i]!.id===id)this.undergrowthLods.splice(i,1);
    }
    for(let id=first;id<=last;id++)if(!this.vegetation.has(id))this.makeForest(id*60);
  }

  private makeForest(start: number) {
    // Chunk-local randomness makes revisits identical, independent of load order.
    let vegetationSeed = (2351 ^ Math.imul(start+120,2654435761)) >>> 0;
    const random = () => {vegetationSeed=(Math.imul(vegetationSeed,1664525)+1013904223)>>>0;return vegetationSeed/4294967296;};
    const dummy = new T.Object3D(), id=Math.floor(start/60), chunk=new T.Group();
    this.vegetation.set(id,chunk);this.scene.add(chunk);
    // One batch per species keeps draw cost bounded across reflection/shadows.
    for (let variant = 0; variant < 4; variant++) {
      const trees = this.forest.filter(tree => tree.z >= start && tree.z < start+60 && tree.variant === variant);
      if (!trees.length) continue;
      const asset = this.nature.trees[variant]!;
      const trunks = new T.InstancedMesh(asset.wood, this.nature.bark, trees.length);
      const leaves = new T.InstancedMesh(asset.leaves, this.nature.leaves, trees.length);
      trunks.name = 'branched-tree-trunks'; leaves.name = variant === 1 ? 'broadleaf-foliage' : 'pine-boughs';
      const centre=new T.Vector3();
      trees.forEach(({x,z,height},i) => {
        const treeX=z>=140?Math.sign(x)*(channelHalfWidth(z)+4+Math.abs(x)%12):x;
        const worldX=riverX(treeX,z),side=Math.sign(treeX);
        const base = z < 140 ? (Math.abs(treeX)<16.5?.205:.555) : bankGround((worldX-bankEdge(z,side))*side,z,side);
        dummy.position.set(worldX,base,z); dummy.scale.set(height*(.85+random()*.25),height,height*(.85+random()*.25));
        dummy.rotation.set((random()-.5)*.06,random()*Math.PI*2,(random()-.5)*.05); dummy.updateMatrix();
        trunks.setMatrixAt(i,dummy.matrix); leaves.setMatrixAt(i,dummy.matrix);
        leaves.setColorAt(i,new T.Color().setRGB(.82+random()*.18,.88+random()*.12,.78+random()*.18));
        // Absolute lateral extent avoids treating opposite banks as a tree at x=0.
        centre.add(new T.Vector3(Math.abs(treeX),base+height*.5,z));
      });
      centre.divideScalar(trees.length);
      this.foliageLods.push({id,mesh:leaves,trunk:trunks,near:asset.leaves,medium:this.nature.distantLeaves[variant]!,far:this.nature.horizonLeaves[variant]!,wood:asset.wood,distantWood:asset.distantWood,centre,level:-1});
      for(const mesh of [trunks,leaves]) { mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();chunk.add(mesh); }
    }
    const initial = start < 140;
    for (const fern of [false,true]) {
      const count = initial ? (fern ? 44 : 1100) : (fern ? 12 : 180);
      const plants = new T.InstancedMesh(fern ? this.nature.fern : this.nature.grass,this.nature.undergrowth,count);
      plants.name = fern ? 'fern-fronds' : 'curved-grass-clumps';
      this.undergrowthLods.push({id,mesh:plants,count,z:start+30});
      for(let i=0;i<count;i++) {
        const from=Math.max(-30,start),z=from+random()*(start+60-from),side=i%2?1:-1,width=channelHalfWidth(z);
        const offset = initial ? .85+random()*6 : .8+random()*3;
        let x=side*(width+offset);
        if(initial&&this.shoreStones.some(rock=>((x-rock.x)/rock.rx)**2+((z-rock.z)/rock.rz)**2<1.2))x=side*(17.5+random()*4);
        const worldX=riverX(x,z);
        const ground = z<140 ? (Math.abs(x)<16.5 ? .205 : .555) : bankGround((worldX-bankEdge(z,side))*side,z,side);
        const size=fern ? .65+random()*.75 : .4+random()*.65;
        dummy.position.set(worldX,ground,z);dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar(size);dummy.updateMatrix();plants.setMatrixAt(i,dummy.matrix);
        plants.setColorAt(i,new T.Color().setRGB(.85+random()*.15,.85+random()*.15,.7+random()*.25));
      }
      plants.castShadow=false;plants.receiveShadow=true;plants.computeBoundingSphere();chunk.add(plants);
    }
  }

  makeBoat() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d8b17b'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) {
      ctx.strokeStyle = i % 3 ? '#98704333' : '#fff4c333'; ctx.lineWidth = i % 4 ? .7 : 1.8;
      const x = random() * 256; ctx.beginPath(); ctx.moveTo(x, 0);
      for (let y = 0; y <= 256; y += 8) ctx.lineTo(x + Math.sin(y * .025 + i) * 3, y);
      ctx.stroke();
    }
    const grain = new T.CanvasTexture(canvas); grain.colorSpace = T.SRGBColorSpace; grain.wrapS = grain.wrapT = T.RepeatWrapping;
    const varnish = new T.MeshPhysicalMaterial({ color: '#b98a58', map: grain, bumpMap:grain,bumpScale:.003,roughnessMap:grain,roughness: .48, clearcoat: .55, clearcoatRoughness: .25, side: T.DoubleSide,vertexColors:true });
    const deck = new T.MeshPhysicalMaterial({ color: '#ddaf6d', map: grain,bumpMap:grain,bumpScale:.002, roughness: .55, clearcoat: .25, clearcoatRoughness: .35 });
    const gunwale = new T.MeshPhysicalMaterial({ color:'#d1aa72',map:grain,bumpMap:grain,bumpScale:.002,roughness:.4,clearcoat:.4 });
    const brass = new T.MeshStandardMaterial({ color: '#c79e50', metalness: .75, roughness: .27 });
    const ring = HULL_RING;
    for (let i = 0; i < ring.length; i++) {
      const panel = hullPanel(i); panel.computeBoundingBox();
      const center = panel.boundingBox!.getCenter(new T.Vector3());
      panel.translate(-center.x, -center.y, -center.z);
      this.mesh(panel, varnish, center.x, center.y, center.z, this.boat);
    }
    for (let i = 0; i < 9; i++) this.mesh(floorPlank(i), deck, 0, 0, 0, this.boat);
    this.mesh(hullBottom(), varnish, 0, 0, 0, this.boat);
    for (const y of [0.13, 0.3, 0.49]) {
      const curve = new T.CatmullRomCurve3(ring.map(a => { const t=(y-HULL_BOTTOM)/(HULL_TOP-HULL_BOTTOM);return new T.Vector3(a[0]!*(HULL_BASE_SCALE.x+(1-HULL_BASE_SCALE.x)*t),y,a[1]!*(HULL_BASE_SCALE.z+(1-HULL_BASE_SCALE.z)*t)); }), true, 'catmullrom', 0.2);
      const trim=new T.TubeGeometry(curve,60,y===.49?.065:.018,6,true),uv=trim.getAttribute('uv'),length=curve.getLength();
      for(let i=0;i<uv.count;i++){const along=uv.getX(i);uv.setXY(i,uv.getY(i)*.18,along*length*.5);}
      this.mesh(trim,y===.49?gunwale:mat('#6c4b2c'),0,0,0,this.boat).userData.rim=true;
    }
    for (const z of [-0.95, 0.95]) this.mesh(new T.BoxGeometry(1.48, 0.12, 0.42), deck, 0, 0.45, z, this.boat);
    const bladeGeometry=paddleBlade();
    SEATS.forEach((seat, i) => {
      this.mesh(new T.BoxGeometry(0.46, 0.08, 0.36), mat(seat.color), seat.side * 0.47, 0.55, seat.z, this.boat);
      const person = new CrewMember(i); this.boat.add(person);
      this.people.push(person);
      for (const z of [-.14, .14]) this.mesh(new T.SphereGeometry(.027, 8, 6), brass, seat.side * .74, .52, seat.z + z, this.boat);
      const shaft = this.mesh(new T.CylinderGeometry(0.025, 0.03, 1, 7), deck, 0, 0, 0, this.boat);
      const blade = this.mesh(bladeGeometry, mat(seat.color,{roughness:.48}), 0, 0, 0, this.boat);
      this.paddles.push({ shaft, blade });
      this.posePaddle(i, { x: seat.side * 1.45, y: 0.62, z: seat.z });
    });
    const rope=bowRope();rope.computeBoundingBox();
    this.mesh(rope,mat('#c8b58e'),0,-.015-rope.boundingBox!.min.y,1.62,this.boat).name='bow-rope';
  }

  posePaddle(index: number, point: { x: number; y: number; z: number }) {
    const paddle = this.paddles[index]!;
    const handle=paddleHandle(index);
    this._poseHandle.set(handle.x,handle.y,handle.z);
    this._poseTip.set(point.x, point.y, point.z);
    this._poseDir.copy(this._poseTip).sub(this._poseHandle);
    paddle.shaft.position.copy(this._poseHandle).add(this._poseTip).multiplyScalar(0.5);
    paddle.shaft.scale.y = this._poseDir.length();
    paddle.shaft.quaternion.setFromUnitVectors(this._poseUp, this._poseDir.normalize());
    paddle.blade.position.copy(this._poseTip); paddle.blade.quaternion.copy(paddle.shaft.quaternion);
    this.people[index]?.pose(point, this.time, this.snapshot?.blades[index]?.force ?? 0);
  }

  setSnapshot(snapshot: Snapshot) {
    const discontinuity = !this.snapshot || snapshot.resetId !== this.lastReset;
    this.presentation = 'game'; this.snapshot = snapshot;
    this.lastSnapshotAt = performance.now();
    this.targetPosition.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);
    this.targetRotation.set(snapshot.rotation.x, snapshot.rotation.y, snapshot.rotation.z, snapshot.rotation.w);
    if (discontinuity) {
      this.clearStrokeEffects(); this.lastCrash = snapshot.crashId;
      this.position.copy(this.targetPosition); this.rotation.copy(this.targetRotation); this.lastReset = snapshot.resetId;
      this.boat.position.copy(this.position);
      this.followCamera(1, true);
    }
    for (let i = 0; i < 4; i++) this.people[i]!.visible = snapshot.crew.some(m => m.seat === i && m.connected);
  }

  private clearStrokeEffects() {
    for (const ripple of this.ripples) { this.scene.remove(ripple.mesh); (ripple.mesh.material as T.Material).dispose(); }
    this.ripples.length = 0; this.particles.length = 0; this.spray.count = 0; this.nextSpray = 0;
  }

  setLowQuality(low: boolean) {
    this.lowQuality = low; this.water.setLowQuality(low);
    this.renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = !low; this.resize();
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = 52;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.followCamera(1, true);
  }

  followCamera(dt: number, snap = false) {
    // Leave a clear rehearsal view beside/above the waiting card.
    // This projection offset ends at launch; the playing camera is unchanged.
    const dock = this.snapshot?.stage === 'lobby';
    const portrait = this.camera.aspect < 1;
    const dockY = portrait ? Math.min(.3, Math.max(.13, 320 / innerHeight - .22)) : 0;
    if (dock && (!this.camera.view?.enabled || this.camera.view.fullWidth !== this.camera.aspect || this.camera.view.offsetY !== dockY)) {
      this.camera.setViewOffset(this.camera.aspect, 1, portrait ? 0 : -this.camera.aspect * .22,
        dockY, this.camera.aspect, 1);
    } else if (!dock && this.camera.view?.enabled) this.camera.clearViewOffset();
    const p = this.boat.position;
    const frame = riverCamera(p.x,p.z,this.snapshot?.velocity.z ?? 0,this.camera.aspect,this.reducedMotion);
    this.desiredCamera.set(frame.x,p.y+frame.y,frame.z);
    this._camTarget.copy(p).add(this._camDir.set(0, 0.3, frame.ahead));
    const target = this._camTarget;
    if(dock){
      const scale=Math.max(1,.8/this.camera.aspect);
      this.desiredCamera.set(p.x+.7*scale,p.y+5.6*scale,p.z-7.8*scale);
      target.set(p.x,p.y+.4,p.z+.3);
    }
    // Portrait keeps lateral aim on the crew; full bend look-ahead otherwise
    // pushes a yawed boat off-screen when gantry clearance shortens the eye.
    const curveLook=T.MathUtils.clamp((this.camera.aspect-.55)/.65,0,1);
    target.x+=(channelCenter(target.z)-channelCenter(p.z))*curveLook;
    this.renderer.domElement.dataset.cameraVolume = this.presentation === 'title' ? 'title' : frame.volume;
    if (this.presentation === 'title') {
      const portrait = this.camera.aspect < .85;
      const orbit = this.reducedMotion ? 0 : Math.sin(this.time * .075) * .35;
      this._camTitleOff.set(7.5 + orbit, 4.7, 7.4).multiplyScalar(portrait ? 1.35 : .95);
      this.desiredCamera.copy(p).add(this._camTitleOff);
      this._camTitleLook.set(portrait ? .1 : -2.8, .6, portrait ? 0 : 2.8);
      target.copy(p).add(this._camTitleLook);
    }
    const _visibleOccluders = this.occluders.filter(o => o.parent?.visible !== false);
    const clearance = this.cameraClearance(this.desiredCamera, _visibleOccluders);
    target.z = p.z + (target.z-p.z) * Math.min(1,clearance*1.5);
    if (snap) { this.camera.position.copy(this.desiredCamera); this.look.copy(target); }
    else {
      this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-dt * (this.reducedMotion ? 2 : 3.5)));
      this.look.lerp(target, 1 - Math.exp(-dt * 4));
    }
    // Smoothing must not carry the actual eye through a beam after the target
    // has already cleared it. Resolve the final position as well as the goal.
    this.cameraClearance(this.camera.position, _visibleOccluders);
    this.camera.lookAt(this.look);
  }

  private cameraClearance(eye: T.Vector3, solids?: T.Object3D[]) {
    const p = this.boat.position;
    this._camOrigin.set(p.x, Math.max(.45, p.y + 1.3), p.z);
    let fraction = 1;
    const occluderList = solids ?? this.occluders.filter(object => object.parent?.visible !== false);
    for (const side of [-.65,.65]) {
      this._camFrom.copy(this._camOrigin).setX(this._camOrigin.x + side);
      this._camDir.copy(eye).sub(this._camFrom);
      const distance = this._camDir.length();
      if (distance < .01) continue;
      this.raycaster.set(this._camFrom, this._camDir.normalize()); this.raycaster.far = distance;
      const hit = this.raycaster.intersectObjects(occluderList, false)[0];
      if (hit) fraction = Math.min(fraction,Math.max(.05,(hit.distance-.65)/distance));
    }
    if (fraction < 1) eye.lerp(this._camOrigin, 1 - fraction);
    return fraction;
  }

  render(dt: number, now: number) {
    const snap = this.snapshot;
    const rowEffects = snap?.stage === 'playing' && !snap.paused && !snap.complete && snap.condition === 'afloat'
      && performance.now() - this.lastSnapshotAt < 250;
    if (!snap && (this.ripples.length || this.particles.length)) this.clearStrokeEffects();
    const dock=snap?.stage==='lobby';
    this.time = snap&&!dock ? snap.tick * DT + (snap.paused ? 0 : Math.min(0.1, (performance.now() - this.lastSnapshotAt) / 1000)) : now;
    const blend = 1 - Math.exp(-dt * 12);
    this.position.lerp(this.targetPosition, blend); this.rotation.slerp(this.targetRotation, blend);
    this.boat.position.copy(this.position); this.boat.quaternion.copy(this.rotation);
    this.dockBlend+=(Number(dock)-this.dockBlend)*(1-Math.exp(-dt*7));
    if(this.dockBlend>.001){
      const movement=this.dockBlend*(this.reducedMotion?.2:1);
      this.boat.position.y+=movement*(sampleWaterHeight(this.position.x,this.position.z,this.time)+.012*Math.sin(this.time*.9));
      this.boat.rotateX(movement*.009*Math.sin(this.time*.8));this.boat.rotateZ(movement*.018*Math.sin(this.time*.65));
    }
    const wreckAge = snap?.condition !== undefined && snap.condition !== 'afloat' ? snap.wreckAge : 0;
    const spread = Math.min(1, wreckAge * 1.7);
    this.boatParts.forEach(({ mesh, position, rotation }, i) => {
      mesh.position.copy(position); mesh.rotation.copy(rotation);
      mesh.visible = !mesh.userData.rim || spread < 0.1;
      if (spread > 0) {
        mesh.position.x += (position.x === 0 ? (i % 2 ? -1 : 1) : Math.sign(position.x)) * spread * (0.5 + (i % 4) * 0.2);
        mesh.position.z += (position.z === 0 ? (i % 3 - 1) : Math.sign(position.z)) * spread * 0.55;
        mesh.position.y += Math.sin(i * 2.1) * spread * 0.2;
        mesh.rotation.x += spread * Math.sin(i) * 1.2; mesh.rotation.z += spread * Math.cos(i) * 0.8;
      }
    });
    this.people.forEach((person, i) => {
      const station = SEATS[i]!;
      person.position.set(station.side * (.43 + spread * .7), .57, station.z + Math.sin(i * 3) * spread * .35);
      person.rotation.set(spread * .25, 0, -station.side * spread * .35);
      if (spread > 0) person.react(wreckAge);
    });
    if (!snap) { this.boat.position.y = sampleWaterHeight(0, 0, now) + .08; this.boat.rotation.z = Math.sin(now * 0.5) * 0.015;
      this.people.forEach((person, i) => { person.visible = true; const seat = SEATS[i]!; this.posePaddle(i, {x: seat.side * 1.45, y: .62 + Math.sin(now * .6 + i) * .05, z: seat.z }); });
    }
    if (snap?.condition === 'afloat') snap.blades.forEach((blade, i) => this.posePaddle(i, blade));
    this.capsizeRing.visible=!!snap?.capsize&&snap.condition==='afloat';
    if(this.capsizeRing.visible&&snap)this.capsizeRing.position.set(snap.position.x,sampleWaterHeight(snap.position.x,snap.position.z,this.time)+.08,snap.position.z);
    if (snap?.stage === 'lobby' && !snap.countdownSeconds && this.dockPreview) {
      this.posePaddle(this.dockPreview.seat, this.dockPreview.point);
    }
    if (snap?.stage === 'lobby') this.renderer.domElement.dataset.dockPaddles = JSON.stringify(this.paddles.map(paddle => paddle.blade.position.toArray()));
    else delete this.renderer.domElement.dataset.dockPaddles;

    const dummy = this.dummy;
    for (let i = 0; i < this.flowTracers.length; i++) {
      const tracer = this.flowTracers[i]!;
      const flow = sampleWater(tracer.x, tracer.y, this.time);
      const flowDt = snap?.paused ? 0 : dt;
      tracer.x += flow.velocity.x * flowDt; tracer.y += flow.velocity.z * flowDt;
      if(tracer.y<this.boat.position.z-18||tracer.y>this.boat.position.z+145){const lateral=tracer.x-channelCenter(tracer.y);tracer.y=this.boat.position.z-16+((i*3.713)%160);tracer.x=riverX(lateral,tracer.y);}
      const left=bankEdge(tracer.y,-1)+.3,right=bankEdge(tracer.y,1)-.3;
      if(tracer.x>right)tracer.x=left;if(tracer.x<left)tracer.x=right;
      dummy.position.set(tracer.x, sampleWaterHeight(tracer.x, tracer.y, this.time) + .012, tracer.y);
      dummy.rotation.set(-Math.PI / 2, 0, Math.atan2(-flow.velocity.x, -flow.velocity.z));
      dummy.scale.setScalar((.6 + (i % 5) * .16)*(flow.zone==='rapids'?2.2:1)); dummy.updateMatrix(); this.foam.setMatrixAt(i, dummy.matrix);
    }
    this.foam.instanceMatrix.needsUpdate = true;

    this.rescueFoam.visible=Math.abs(this.boat.position.z-RESCUE_EDDY.z)<165;
    if(this.rescueFoam.visible) {
      const flowDt=snap?.paused?0:dt;
      this.rescueTracers.forEach((tracer,i)=>{
        const flow=sampleWater(tracer.x,tracer.y,this.time);
        tracer.x+=flow.velocity.x*flowDt;tracer.y+=flow.velocity.z*flowDt;
        const dx=(tracer.x-channelCenter(tracer.y)-RESCUE_EDDY.x)/RESCUE_EDDY.radiusX,dz=(tracer.y-RESCUE_EDDY.z)/RESCUE_EDDY.radiusZ;
        if(dx*dx+dz*dz>1){const a=i*2.399,r=.35+(i%7)*.075;tracer.set(riverX(RESCUE_EDDY.x+Math.cos(a)*RESCUE_EDDY.radiusX*r,RESCUE_EDDY.z),RESCUE_EDDY.z+Math.sin(a)*RESCUE_EDDY.radiusZ*r);}
        dummy.position.set(tracer.x,sampleWaterHeight(tracer.x,tracer.y,this.time)+.02,tracer.y);
        dummy.rotation.set(-Math.PI/2,0,Math.atan2(-flow.velocity.x,-flow.velocity.z));dummy.scale.set(.7,.6+Math.min(.9,Math.hypot(flow.velocity.x,flow.velocity.z)),1);
        dummy.updateMatrix();this.rescueFoam.setMatrixAt(i,dummy.matrix);
      });
      this.rescueFoam.instanceMatrix.needsUpdate=true;
      this.renderer.domElement.dataset.rescueFlow=JSON.stringify(this.rescueTracers.slice(0,4).map(tracer=>tracer.toArray()));
    } else delete this.renderer.domElement.dataset.rescueFlow;

    this.vortexFoam.visible=Math.abs(this.boat.position.z-WHIRLPOOL.z)<165;
    if(this.vortexFoam.visible)for (let i = 0; i < this.vortexTracers.length; i++) {
      const tracer = this.vortexTracers[i]!;
      const flow = sampleWater(tracer.x, tracer.y, this.time);
      const flowDt = snap?.paused ? 0 : dt;
      tracer.x += flow.velocity.x * flowDt; tracer.y += flow.velocity.z * flowDt;
      const radius = Math.hypot(tracer.x - WHIRLPOOL.x, tracer.y - WHIRLPOOL.z);
      if (radius < .9 || radius > 4.8) tracer.set(WHIRLPOOL.x + Math.cos(i * 2.399) * 4.4, WHIRLPOOL.z + Math.sin(i * 2.399) * 4.4);
      dummy.position.set(tracer.x, sampleWaterHeight(tracer.x, tracer.y, this.time) + .02, tracer.y);
      dummy.rotation.set(-Math.PI / 2, 0, Math.atan2(-flow.velocity.x, -flow.velocity.z));
      dummy.scale.set(.5, .45 + Math.min(1, Math.hypot(flow.velocity.x, flow.velocity.z)), 1); dummy.updateMatrix();
      this.vortexFoam.setMatrixAt(i, dummy.matrix);
    }
    if(this.vortexFoam.visible)this.vortexFoam.instanceMatrix.needsUpdate = true;
    if (snap && snap.condition === 'breaking' && this.lastCrash !== snap.crashId) {
      this.lastCrash = snap.crashId;
      for (let i = 0; i < 40; i++) this.particles.push({ position: this.boat.position.clone().add(new T.Vector3(Math.sin(i * 2.4), .12, Math.cos(i * 2.4) * 1.5)), velocity: new T.Vector3(Math.sin(i * 2.4) * 1.4, 1.1 + (i % 7) * .28, Math.cos(i * 2.4) * 1.4), life: .9 });
    }
    if (rowEffects && now > this.nextSpray) {
      this.nextSpray = now + .07;
      snap.blades.forEach(blade => {
        if (blade.immersion > .1 && blade.force > 35) for (let i = 0; i < 3; i++) {
          const point = this.boat.localToWorld(new T.Vector3(blade.x, blade.y, blade.z));
          point.y = sampleWaterHeight(point.x, point.z, this.time) + .04;
          this.particles.push({ position: point, velocity: new T.Vector3(Math.sin(now * 24 + i) * .7, .7 + blade.force / 500, Math.cos(now * 21 + i) * .7), life: .65 });
        }
      });
    }
    this.particles.splice(0, Math.max(0, this.particles.length - 100));
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]!; particle.life -= dt; particle.velocity.y -= 4.5 * dt; particle.position.addScaledVector(particle.velocity, dt);
      if (particle.life <= 0 || particle.position.y < -.3) this.particles.splice(i, 1);
    }
    this.particles.forEach((particle, i) => {
      dummy.position.copy(particle.position); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.018 + particle.life * .022); dummy.updateMatrix(); this.spray.setMatrixAt(i, dummy.matrix);
    });
    this.spray.count = this.particles.length; this.spray.instanceMatrix.needsUpdate = true;
    if (rowEffects) {
      snap.blades.forEach((blade, i) => {
        if (blade.force > 40 && blade.immersion > 0.1 && now - (this.ripples.filter(r => r.seat === i).at(-1)?.born ?? -1) > 0.15) {
          // Clone shared material so each ripple can fade opacity independently.
          const material = this.rippleMaterial.clone();
          const mesh = new T.Mesh(this.rippleGeometry, material);
          const point = this.boat.localToWorld(new T.Vector3(blade.x, blade.y, blade.z));
          mesh.position.set(point.x, sampleWaterHeight(point.x, point.z, this.time) + 0.025, point.z);
          mesh.rotation.x = -Math.PI / 2; this.scene.add(mesh); this.ripples.push({ mesh, born: now, seat: i });
        }
      });
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]!; const age = now - r.born;
      if (age > 1) { this.scene.remove(r.mesh); (r.mesh.material as T.Material).dispose(); this.ripples.splice(i, 1); }
      else { r.mesh.scale.setScalar(1 + age * 7); (r.mesh.material as T.MeshBasicMaterial).opacity = 0.6 * (1 - age); }
    }

    // World-relative horizon and bounded look-ahead; hull roll never tilts camera.
    const p = this.boat.position;
    this.followCamera(dt);
    this.sun.position.set(p.x - 20, 36, p.z + 28); this.sun.target.position.copy(p);
    const moverTime=this.time+(snap?.hazardPhase??0);
    this.sweepers.forEach((log,i)=>{log.position.copy(sampleSweeper(moverTime,SWEEPERS[i]!));log.visible=Math.abs(log.position.z-p.z)<165;});
    const wheelPose=sampleWaterwheel(moverTime);this.wheel.quaternion.set(wheelPose.x,wheelPose.y,wheelPose.z,wheelPose.w);
    this.wheel.visible=Math.abs(WATERWHEEL.z-p.z)<165;
    // Act 2 — second waterwheel in Devil's Staircase.
    const wheel2Pose=sampleWaterwheel2(moverTime);this.wheel2.quaternion.set(wheel2Pose.x,wheel2Pose.y,wheel2Pose.z,wheel2Pose.w);
    this.wheel2.visible=Math.abs(WATERWHEEL2.z-p.z)<165;
    for(const [id,chunk] of this.chunks) {
      const visible=id*60>p.z-100&&id*60<p.z+180;
      // Static authored geometry remains a compact CPU cache. Retiring its
      // GPU buffers bounds residency; Three uploads it again on backtracking.
      if(chunk.visible&&!visible)for(const mesh of chunk.children)if(mesh instanceof T.Mesh)mesh.geometry.dispose();
      chunk.visible=visible;
    }
    this.updateVegetation(p.z);
    for(const lod of this.foliageLods) {
      const distance=Math.hypot(lod.centre.x-Math.abs(this.camera.position.x-channelCenter(this.camera.position.z)),lod.centre.z-this.camera.position.z);
      // Hysteresis avoids flickering geometry at a detail boundary.
      const near=lod.level===0?36:30,far=lod.level===2?66:74;
      const level=this.lowQuality ? (distance<far?1:2) : distance<near?0:distance<far?1:2;
      lod.mesh.geometry=level===0?lod.near:level===1?lod.medium:lod.far;
      lod.trunk.geometry=level===0?lod.wood:lod.distantWood;
      lod.mesh.castShadow=lod.trunk.castShadow=!this.lowQuality&&level<2;
      lod.level=level;
    }
    for(const lod of this.undergrowthLods) {
      const distance=Math.abs(lod.z-this.camera.position.z);
      lod.mesh.count=Math.ceil(lod.count*(this.lowQuality?.45:1)*(distance>105?.2:distance>65?.5:1));
    }
    this.sky.position.z=p.z;
    const section=ROUTE_SECTIONS.find(section=>p.z>=section.start&&p.z<section.end);
    this.renderer.domElement.dataset.routeSection=section?.id??'headwaters';
    this.renderer.domElement.dataset.visibleChunks=String([...this.chunks.values()].filter(chunk=>chunk.visible).length);
    this.water.setTransmission(this.presentation === 'game');
    const current=sampleWater(p.x,p.z,this.time).velocity;
    this.waterMotion.set(snap?.stage==='playing'?snap.velocity.x-current.x:0,snap?.stage==='playing'?snap.velocity.z-current.z:0);
    this.water.update(this.time, this.camera, this.boat.position, this.boat.quaternion, this.waterMotion.length(), !snap || snap.condition === 'afloat',this.waterMotion);
    this.renderer.info.reset();
    this.water.capture(this.renderer,this.scene,this.camera);
    const captureCalls = this.renderer.info.render.calls;
    const captureTriangles = this.renderer.info.render.triangles;
    this.renderer.render(this.scene, this.camera);
    // Vegetation stats and foliage LOD counts allocate on each call — throttle to 1Hz.
    if (!this._lastRenderInfoAt || now - this._lastRenderInfoAt >= 1) {
      this._lastRenderInfoAt = now;
      this._lastVegetationInstances = [...this.vegetation.values()].reduce((sum,group)=>sum+group.children.reduce((n,mesh)=>n+(mesh instanceof T.InstancedMesh?mesh.instanceMatrix.count:0),0),0);
      this._lastFoliageLevels = [0,1,2].map(level=>this.foliageLods.filter(lod=>lod.level===level).length);
    }
    this.renderer.domElement.dataset.renderInfo = JSON.stringify({ calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures, reflections: !this.lowQuality, refraction: this.water.material.uniforms.refractionReady!.value === 1, captureCalls, captureTriangles, captureSize: this.water.captureSize.toArray(), vegetationChunks: this.vegetation.size, vegetationInstances: this._lastVegetationInstances, foliageLevels: this._lastFoliageLevels });
    // Inspectable screen-space envelope for camera regression checks.
    const bounds = { left: 1, right: 0, top: 1, bottom: 0 };
    for (const x of [-2.1, 2.1]) for (const y of [-0.35, 1.5]) for (const z of [-2.3, 2.3]) {
      this._boundsPoint.set(x, y, z); const point = this.boat.localToWorld(this._boundsPoint).project(this.camera);
      bounds.left = Math.min(bounds.left, (point.x + 1) / 2);
      bounds.right = Math.max(bounds.right, (point.x + 1) / 2);
      bounds.top = Math.min(bounds.top, (1 - point.y) / 2);
      bounds.bottom = Math.max(bounds.bottom, (1 - point.y) / 2);
    }
    this.renderer.domElement.dataset.boatBounds = JSON.stringify(bounds);
    const waterPositions=this.water.geometry.getAttribute('position');
    if(dock)this.renderer.domElement.dataset.dockMotion=JSON.stringify({time:this.time,position:this.boat.position.toArray(),rotation:this.boat.quaternion.toArray(),waterVersion:waterPositions instanceof T.BufferAttribute?waterPositions.version:waterPositions.data.version});
    else delete this.renderer.domElement.dataset.dockMotion;
  }
}
