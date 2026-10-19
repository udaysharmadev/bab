import * as T from 'three';
import { SEATS, DT, type Snapshot } from '../shared/protocol';
import { PYLONS, ROCKS, SPIKES, WHIRLPOOL, SWEEPERS, sampleSweeper, WATERWHEEL, sampleWaterwheel, CHECKPOINTS, FINISH_Z, ROUTE_SECTIONS, RAPIDS, channelHalfWidth, sampleWater } from '../shared/world';

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RiverWater } from './water';
import { CrewMember } from './crew';
import { NatureAssets } from './nature';
import { HULL_RING, floorPlank, hullBottom } from './hull';
import { riverCamera } from './camera';
import { riverbedGeometry } from './riverbed';

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
  readonly sweepers: T.Group[] = [];
  readonly wheel = new T.Group();
  get sweeper() { return this.sweepers[0]!; }
  readonly chunks = new Map<number,T.Group>();
  readonly sky: Sky;
  readonly flowTracers = Array.from({ length: 200 }, (_, i) => new T.Vector2(((i * 7.391) % 24) - 12, ((i * 3.713) % 168) - 16));
  readonly paddles: { shaft: T.Mesh; blade: T.Mesh }[] = [];
  readonly people: CrewMember[] = [];
  readonly boatParts: { mesh: T.Mesh; position: T.Vector3; rotation: T.Euler }[] = [];
  readonly water: RiverWater;
  readonly vortexFoam: T.InstancedMesh;
  readonly vortexTracers = Array.from({ length: 180 }, (_, i) => {
    const radius = .95 + i / 180 * 3.6, angle = i * 2.399;
    return new T.Vector2(WHIRLPOOL.x + Math.cos(angle) * radius, WHIRLPOOL.z + Math.sin(angle) * radius);
  });
  readonly spray: T.InstancedMesh;
  readonly particles: { position: T.Vector3; velocity: T.Vector3; life: number }[] = [];
  readonly nature = new NatureAssets();
  readonly shoreStones: {x:number;z:number;rx:number;rz:number}[] = [];
  readonly foliageLods: {mesh:T.InstancedMesh;near:T.BufferGeometry;far:T.BufferGeometry;z:number}[] = [];
  readonly undergrowthLods: {mesh:T.InstancedMesh;count:number}[] = [];
  readonly forest: { x: number; z: number; height: number; variant: number }[] = [];
  presentation: 'title' | 'game' = 'title';
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
  snapshot?: Snapshot;
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  lastReset = -1;
  lastSnapshotAt = 0;
  time = 0;

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
    Object.assign(this.sun.shadow.camera, { left: -28, right: 28, top: 35, bottom: -20, near: 0.5, far: 100 });
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
    this.spray = new T.InstancedMesh(new T.SphereGeometry(1, 5, 4), new T.MeshBasicMaterial({ color: '#dbf9f0', transparent: true, opacity: .78 }), 100);
    this.spray.count = 0; this.spray.frustumCulled = false; this.scene.add(this.spray);
    this.foam = new T.InstancedMesh(new T.PlaneGeometry(0.045, 0.7), new T.MeshBasicMaterial({ color: '#d0e8cd', transparent: true, opacity: 0.36, depthWrite: false }), 200);
    this.scene.add(this.foam);
    this.landscape();
    this.gorge();
    this.makeWaterwheel();
    const bed = this.nature.stone.clone(); bed.vertexColors = false; bed.color.set('#999073'); bed.bumpScale = .025;
    for (let start = -30; start < FINISH_Z + 30; start += 60) {
      const centre = start + 30;
      const riverbed = this.mesh(riverbedGeometry(start).translate(0,0,-centre),bed,0,0,centre);
      // The color/depth capture has one job: provide the submerged river floor.
      // Keeping this separate from the main scene prevents another forest pass.
      riverbed.name = 'submerged-riverbed'; riverbed.layers.enable(1);
    }
    this.makeForest();
    this.batchChunks();
    for (const chunk of this.chunks.values()) for (const child of chunk.children) {
      if (child instanceof T.Mesh && !(child instanceof T.InstancedMesh)) this.occluders.push(child);
    }
    this.makeBoat();
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
      this.mesh(new T.CylinderGeometry(0.23, 0.28, 2.7, 9), wood, p.x, -0.05, p.z);
      this.mesh(new T.CylinderGeometry(0.25, 0.25, 0.25, 9), mat('#f1dbaf'), p.x, 0.85, p.z);
      this.mesh(new T.CylinderGeometry(0.255, 0.255, 0.2, 9), mat('#c25443'), p.x, 0.6, p.z);
      const flag = this.mesh(new T.BoxGeometry(0.65, 0.28, 0.035), mat(p.x < 0 ? '#ca8762' : '#e9c574'), p.x + 0.3, 1.36, p.z);
      flag.rotation.z = -0.08;
    }
    for (const rock of ROCKS) {
      this.mesh(this.nature.hazard.clone().scale(rock.radius, rock.radius, rock.radius), this.nature.stone, rock.x, -.05, rock.z);
      const danger = this.mesh(new T.ConeGeometry(.18, .6, 3), mat('#df5b3d'), rock.x, rock.radius + .2, rock.z);
      danger.rotation.z = .15;
      // White water collar explains the rock footprint from the chase camera.
      const collar = this.mesh(new T.TorusGeometry(rock.radius + .12, .025, 4, 36), mat('#d5e5d6'), rock.x, .015, rock.z);
      collar.rotation.x = Math.PI / 2;
    }
    const iron = new T.MeshStandardMaterial({ color: '#384c4e', metalness: .8, roughness: .27 });
    for (const spike of SPIKES) {
      this.mesh(new T.ConeGeometry(spike.radius, spike.height, 12), iron, spike.x, -.35 + spike.height / 2, spike.z);
      this.mesh(new T.CylinderGeometry(spike.radius * 1.25, spike.radius * 1.35, .11, 12), mat('#8b5b39'), spike.x, -.08, spike.z);
      // Danger paint follows the taper; it does not enlarge the lethal collider.
      const bandY = spike.height * .55;
      const band = this.mesh(new T.ConeGeometry(spike.radius * .45, spike.height * .45, 12), mat('#db633a', { metalness: .25, roughness: .4 }), spike.x, -.35 + bandY + spike.height * .225, spike.z);
      band.scale.set(1.01, 1.005, 1.01);
    }
    const logMaterial = new T.MeshStandardMaterial({ color: '#745333', roughness: .72 });
    for (const spec of SWEEPERS) {
      const log=new T.Group();
      const timber = this.mesh(new T.CylinderGeometry(spec.radius, spec.radius, spec.halfLength * 2, 16), logMaterial, 0, 0, 0, log);
      timber.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        this.mesh(new T.SphereGeometry(spec.radius, 14, 10), logMaterial, side * spec.halfLength, 0, 0, log);
        const band = this.mesh(new T.CylinderGeometry(spec.radius + .005, spec.radius + .005, .2, 16), mat('#d5693c'), side * spec.halfLength*.74, 0, 0, log); band.rotation.z = Math.PI / 2;
      }
      log.position.copy(sampleSweeper(0,spec));this.scene.add(log);this.sweepers.push(log);
    }
    for (const z of CHECKPOINTS.slice(1)) {
      for (const x of [-1,1].map(side=>side*(channelHalfWidth(z)-3))) {
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

  sign(title:string, subtitle:string, x:number,z:number,color='#edbc79') {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#293f35';ctx.fillRect(0,0,512,192);
    ctx.strokeStyle=color;ctx.lineWidth=8;ctx.strokeRect(7,7,498,178);
    ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 38px system-ui';ctx.fillText(title,256,80,460);
    ctx.font='20px system-ui';ctx.fillStyle='#f2ebcf';ctx.fillText(subtitle,256,133,460);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const board=this.mesh(new T.BoxGeometry(3.3,1.23,.10),mat('#72553b'),x,1.8,z);
    const front=this.mesh(new T.PlaneGeometry(3.25,1.2),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}),x,1.8,z-.061);front.rotation.y=Math.PI;
    for(const side of [-1,1]) this.mesh(new T.CylinderGeometry(.06,.08,2.3,7),mat('#776047'),x+side*1.18,.7,z);
    board.userData.warning=true;
  }

  gorge() {
    const stone=this.nature.stone.clone();stone.vertexColors=false;stone.color.set('#84816e');
    const ledge=mat('#777961'), timber=mat('#795a38');
    // The exposed five-metre shoreline matches conservative server bank pieces.
    for(let z=140;z<FINISH_Z+25;z+=5) {
      const width=Math.min(channelHalfWidth(z),channelHalfWidth(z+2.5),channelHalfWidth(z+5));
      for(const side of [-1,1]) {
        const h=3.5+Math.sin(z*.047)*1.2+(z>280&&z<740?3:0);
        const cliff=new T.BoxGeometry(18,h,5.02,1,4,3),v=cliff.getAttribute('position');
        for(let i=0;i<v.count;i++){
          const t=(v.getY(i)+h/2)/h,worldZ=z+2.5+v.getZ(i);
          if(v.getX(i)*side<0)v.setX(i,v.getX(i)+side*(.25+Math.sin(worldZ*1.9+side)*.2)*Math.sin(t*Math.PI*.65));
          v.setY(i,v.getY(i)+t*(Math.sin(worldZ*.7+side)*.55));
        }
        cliff.computeVertexNormals();
        this.mesh(cliff,stone,side*(width+9),h/2-.35,z+2.5);
        if(z%10===0){
          for(let layer=1;layer<3;layer++)this.mesh(new T.BoxGeometry(.14,.045,4.9),ledge,side*(width+.15),layer*h/3,z+2.5);
        }
        if(z%20===0) {
          const rib=this.mesh(new T.DodecahedronGeometry(1.1,0),ledge,side*(width+1.5),1.1,z+2.5);rib.scale.set(.8,1.8,1.8);
        }
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
    for(const z of CHECKPOINTS.filter(z=>z>=156)) {
      const width=channelHalfWidth(z);
      this.sign('CHECKPOINT','GREEN PENNANTS · REGROUP',-width+1,z-3,'#a3d19c');
      for(let i=0;i<8;i++)this.mesh(new T.BoxGeometry(2.8,.12,.36),timber,-width-1.2,.42,z-1.2+i*.38);
    }
    // Timber works silhouette: raised gantry, stacked logs and chain posts.
    for(const z of [416,443]) {
      const width=channelHalfWidth(z);
      for(const side of [-1,1]){
        this.mesh(new T.BoxGeometry(.6,7,.6),timber,side*(width+1),3.3,z);
        for(let i=0;i<5;i++) {const log=this.mesh(new T.CylinderGeometry(.35,.4,6,10),timber,side*(width+3),.4+(i%2)*.7,z+(i-2)*.65);log.rotation.z=Math.PI/2;}
      }
      this.mesh(new T.BoxGeometry(width*2+3,.5,.8),timber,0,10,z);
    }
    // Finish bridge stays clear of the entire navigable channel.
    for(const side of [-1,1])this.mesh(new T.BoxGeometry(2.5,16,4),ledge,side*14,7,FINISH_Z+2);
    this.mesh(new T.BoxGeometry(32,1.4,5),ledge,0,15,FINISH_Z+2);
    for(let i=0;i<17;i++)this.mesh(new T.BoxGeometry(1.8,.75,.15),mat(i%2?'#e8dcb1':'#34594d'),(i-8)*1.6,5.8,FINISH_Z);
    this.sign('THE GRAND WATERWORKS','ONE LAST STROKE',10.5,FINISH_Z-19,'#e8d9a3');
  }

  batchChunks() {
    for(const chunk of [...this.chunks.values(),this.wheel]) {
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
    const axle=this.mesh(new T.CylinderGeometry(.18,.18,8,12),iron,wheel.x+2,wheel.y,wheel.z);axle.rotation.z=Math.PI/2;
    for(const z of [wheel.z-2,wheel.z+2]) {
      this.mesh(new T.BoxGeometry(2.6,5,1.1),wood,10.8,2,z);
      const brace=this.mesh(new T.BoxGeometry(.3,4,.3),wood,9.8,1.8,z);brace.rotation.z=-.3;
    }
    this.sign('WORKING WATERWHEEL','KEEP LEFT · WATCH THE RED BLADES',-5.7,wheel.z-15);
    // Green bypass markers make the permanently open route visible before commitment.
    for(const z of [wheel.z-5,wheel.z+5]) {
      this.mesh(new T.CylinderGeometry(.08,.12,1.3,8),mat('#567b54'),-2.7,.3,z);
      this.mesh(new T.BoxGeometry(.45,.28,.025),mat('#c2d7a0'),-2.5,1,z);
    }
  }

  makeForest() {
    // Trees and undergrowth share geometry and are culled with their route chunk.
    const dummy = new T.Object3D();
    for (let start = -60; start < FINISH_Z + 60; start += 60) {
      const id = Math.floor(start / 60);
      let chunk = this.chunks.get(id);
      if (!chunk) { chunk = new T.Group(); this.chunks.set(id, chunk); this.scene.add(chunk); }
      for (let variant = 0; variant < 4; variant++) {
        const trees = this.forest.filter(tree => tree.z >= start && tree.z < start + 60 && tree.variant === variant);
        if (!trees.length) continue;
        const asset = this.nature.trees[variant]!;
        const trunks = new T.InstancedMesh(asset.wood, this.nature.bark, trees.length);
        const leaves = new T.InstancedMesh(asset.leaves, this.nature.leaves, trees.length);
        trunks.name = 'branched-tree-trunks'; leaves.name = variant === 1 ? 'broadleaf-foliage' : 'pine-boughs';
        this.foliageLods.push({mesh:leaves,near:asset.leaves,far:this.nature.distantLeaves[variant]!,z:start+30});
        trees.forEach(({x,z,height},i) => {
          const treeX=z>=140?Math.sign(x)*(channelHalfWidth(z)+4+Math.abs(x)%12):x;
          const base = z < 140 ? (Math.abs(treeX)<16.5?.205:.555) : 3.5 + Math.sin(Math.floor(z/5)*5*.047)*1.2 + (z>280&&z<740?3:0)-.35+Math.sin(z*.7+Math.sign(x))*.55;
          dummy.position.set(treeX,base,z); dummy.scale.set(height*(.85+random()*.25),height,height*(.85+random()*.25));
          dummy.rotation.set((random()-.5)*.06,random()*Math.PI*2,(random()-.5)*.05); dummy.updateMatrix();
          trunks.setMatrixAt(i,dummy.matrix); leaves.setMatrixAt(i,dummy.matrix);
          leaves.setColorAt(i,new T.Color().setRGB(.82+random()*.18,.88+random()*.12,.78+random()*.18));
        });
        for(const mesh of [trunks,leaves]) { mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();chunk.add(mesh); }
      }
      const initial = start < 140;
      for (const fern of [false,true]) {
        const count = initial ? (fern ? 44 : 1100) : (fern ? 12 : 180);
        const plants = new T.InstancedMesh(fern ? this.nature.fern : this.nature.grass,this.nature.undergrowth,count);
        plants.name = fern ? 'fern-fronds' : 'curved-grass-clumps';
        this.undergrowthLods.push({mesh:plants,count});
        for(let i=0;i<count;i++) {
          const from=Math.max(-30,start),z=from+random()*(start+60-from),side=i%2?1:-1,width=channelHalfWidth(z);
          const offset = initial ? .85+random()*6 : .8+random()*3;
          let x=side*(width+offset);
          if(initial&&this.shoreStones.some(rock=>((x-rock.x)/rock.rx)**2+((z-rock.z)/rock.rz)**2<1.2))x=side*(17.5+random()*4);
          const ground = z<140 ? (Math.abs(x)<16.5 ? .205 : .555) : 3.5+Math.sin(Math.floor(z/5)*5*.047)*1.2+(z>280&&z<740?3:0)-.35+Math.sin(z*.7+side)*.55;
          const size=fern ? .65+random()*.75 : .4+random()*.65;
          dummy.position.set(x,ground,z);dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar(size);dummy.updateMatrix();plants.setMatrixAt(i,dummy.matrix);
          plants.setColorAt(i,new T.Color().setRGB(.85+random()*.15,.85+random()*.15,.7+random()*.25));
        }
        plants.castShadow=false;plants.receiveShadow=true;plants.computeBoundingSphere();chunk.add(plants);
      }
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
    const grain = new T.CanvasTexture(canvas); grain.colorSpace = T.SRGBColorSpace; grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.repeat.set(2, 1);
    const varnish = new T.MeshPhysicalMaterial({ color: '#a56b34', map: grain, roughness: .34, clearcoat: .7, clearcoatRoughness: .22, side: T.DoubleSide });
    const deck = new T.MeshPhysicalMaterial({ color: '#ddaf6d', map: grain, roughness: .48, clearcoat: .35, clearcoatRoughness: .3 });
    const brass = new T.MeshStandardMaterial({ color: '#c79e50', metalness: .75, roughness: .27 });
    const ring = HULL_RING;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!; const b = ring[(i + 1) % ring.length]!;
      const vertices = [a[0]!, 0.47, a[1]!, b[0]!, 0.47, b[1]!, a[0]! * 0.65, -0.25, a[1]! * 0.88,
        b[0]!, 0.47, b[1]!, b[0]! * 0.65, -0.25, b[1]! * 0.88, a[0]! * 0.65, -0.25, a[1]! * 0.88];
      const panel = new T.BufferGeometry();
      panel.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); panel.setAttribute('uv', new T.Float32BufferAttribute([0,1,1,1,0,0,1,1,1,0,0,0],2)); panel.computeVertexNormals(); panel.computeBoundingBox();
      const center = panel.boundingBox!.getCenter(new T.Vector3());
      panel.translate(-center.x, -center.y, -center.z);
      this.mesh(panel, varnish, center.x, center.y, center.z, this.boat);
    }
    for (let i = 0; i < 9; i++) this.mesh(floorPlank(i), deck, 0, 0, 0, this.boat);
    this.mesh(hullBottom(), varnish, 0, 0, 0, this.boat);
    for (const y of [0.13, 0.3, 0.49]) {
      const curve = new T.CatmullRomCurve3(ring.map(a => { const t=(y+.25)/.72;return new T.Vector3(a[0]!*(.65+.35*t),y,a[1]!*(.88+.12*t)); }), true, 'catmullrom', 0.2);
      this.mesh(new T.TubeGeometry(curve, 60, y === 0.49 ? 0.065 : 0.018, 6, true), mat(y === 0.49 ? '#d6ad70' : '#6c4b2c'), 0, 0, 0, this.boat).userData.rim = true;
    }
    for (const z of [-0.95, 0.95]) this.mesh(new T.BoxGeometry(1.48, 0.12, 0.42), deck, 0, 0.45, z, this.boat);
    SEATS.forEach((seat, i) => {
      this.mesh(new T.BoxGeometry(0.46, 0.08, 0.36), mat(seat.color), seat.side * 0.47, 0.55, seat.z, this.boat);
      const person = new CrewMember(i); this.boat.add(person);
      this.people.push(person);
      for (const z of [-.14, .14]) this.mesh(new T.SphereGeometry(.027, 8, 6), brass, seat.side * .74, .52, seat.z + z, this.boat);
      const shaft = this.mesh(new T.CylinderGeometry(0.025, 0.03, 1, 7), deck, 0, 0, 0, this.boat);
      const blade = this.mesh(new T.BoxGeometry(0.21, 0.42, 0.055), mat(seat.color), 0, 0, 0, this.boat);
      this.paddles.push({ shaft, blade });
      this.posePaddle(i, { x: seat.side * 1.45, y: 0.62, z: seat.z });
    });
    const rope = new T.TorusGeometry(0.14, 0.025, 5, 20);
    this.mesh(rope, mat('#e3cd93'), 0, 0.49, 1.79, this.boat).rotation.x = Math.PI / 2;
  }

  posePaddle(index: number, point: { x: number; y: number; z: number }) {
    const seat = SEATS[index]!;
    const paddle = this.paddles[index]!;
    const handle = new T.Vector3(seat.side * 0.65, 0.97, seat.z + 0.03);
    const tip = new T.Vector3(point.x, point.y, point.z);
    const direction = tip.clone().sub(handle);
    paddle.shaft.position.copy(handle).add(tip).multiplyScalar(0.5);
    paddle.shaft.scale.y = direction.length();
    paddle.shaft.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
    paddle.blade.position.copy(tip); paddle.blade.quaternion.copy(paddle.shaft.quaternion);
    this.people[index]?.pose(point, this.time, this.snapshot?.blades[index]?.force ?? 0);
  }

  setSnapshot(snapshot: Snapshot) {
    this.presentation = 'game'; this.snapshot = snapshot;
    this.lastSnapshotAt = performance.now();
    this.targetPosition.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);
    this.targetRotation.set(snapshot.rotation.x, snapshot.rotation.y, snapshot.rotation.z, snapshot.rotation.w);
    if (snapshot.resetId !== this.lastReset) {
      this.position.copy(this.targetPosition); this.rotation.copy(this.targetRotation); this.lastReset = snapshot.resetId;
      this.boat.position.copy(this.position);
      this.followCamera(1, true);
    }
    for (let i = 0; i < 4; i++) this.people[i]!.visible = snapshot.crew.some(m => m.seat === i && m.connected);
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
    const p = this.boat.position;
    const frame = riverCamera(p.x,p.z,this.snapshot?.velocity.z ?? 0,this.camera.aspect,this.reducedMotion);
    this.desiredCamera.set(frame.x,p.y+frame.y,frame.z);
    const target = p.clone().add(new T.Vector3(0, 0.3, frame.ahead));
    this.renderer.domElement.dataset.cameraVolume = this.presentation === 'title' ? 'title' : frame.volume;
    if (this.presentation === 'title') {
      const portrait = this.camera.aspect < .85;
      const orbit = this.reducedMotion ? 0 : Math.sin(this.time * .075) * .35;
      this.desiredCamera.copy(p).add(new T.Vector3(7.5 + orbit, 4.7, 7.4).multiplyScalar(portrait ? 1.35 : .95));
      target.copy(p).add(new T.Vector3(portrait ? .1 : -2.8, .6, portrait ? 0 : 2.8));
    }
    const clearance = this.cameraClearance(this.desiredCamera);
    target.z = p.z + (target.z-p.z) * Math.min(1,clearance*1.5);
    if (snap) { this.camera.position.copy(this.desiredCamera); this.look.copy(target); }
    else {
      this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-dt * (this.reducedMotion ? 2 : 3.5)));
      this.look.lerp(target, 1 - Math.exp(-dt * 4));
    }
    // Smoothing must not carry the actual eye through a beam after the target
    // has already cleared it. Resolve the final position as well as the goal.
    this.cameraClearance(this.camera.position);
    this.camera.lookAt(this.look);
  }

  private cameraClearance(eye: T.Vector3) {
    const p = this.boat.position, origin = new T.Vector3(p.x,Math.max(.45,p.y+1.3),p.z);
    let fraction = 1;
    const solids = this.occluders.filter(object => object.parent?.visible !== false);
    for (const side of [-.65,.65]) {
      const from = origin.clone().add(new T.Vector3(side,0,0)), direction = eye.clone().sub(from), distance = direction.length();
      if (distance < .01) continue;
      this.raycaster.set(from,direction.normalize()); this.raycaster.far = distance;
      const hit = this.raycaster.intersectObjects(solids,false)[0];
      if (hit) fraction = Math.min(fraction,Math.max(.05,(hit.distance-.65)/distance));
    }
    if (fraction < 1) eye.lerp(origin,1-fraction);
    return fraction;
  }

  render(dt: number, now: number) {
    const snap = this.snapshot;
    this.time = snap ? snap.tick * DT + (snap.paused || snap.stage === 'lobby' ? 0 : Math.min(0.1, (performance.now() - this.lastSnapshotAt) / 1000)) : now;
    const blend = 1 - Math.exp(-dt * 12);
    this.position.lerp(this.targetPosition, blend); this.rotation.slerp(this.targetRotation, blend);
    this.boat.position.copy(this.position); this.boat.quaternion.copy(this.rotation);
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
    if (!snap) { this.boat.position.y = sampleWater(0, 0, now).height + .08; this.boat.rotation.z = Math.sin(now * 0.5) * 0.015;
      this.people.forEach((person, i) => { person.visible = true; const seat = SEATS[i]!; this.posePaddle(i, {x: seat.side * 1.45, y: .62 + Math.sin(now * .6 + i) * .05, z: seat.z }); });
    }
    if (snap?.condition === 'afloat') snap.blades.forEach((blade, i) => this.posePaddle(i, blade));

    const dummy = new T.Object3D();
    for (let i = 0; i < this.flowTracers.length; i++) {
      const tracer = this.flowTracers[i]!;
      const flow = sampleWater(tracer.x, tracer.y, this.time);
      const flowDt = snap?.paused || snap?.stage === 'lobby' ? 0 : dt;
      tracer.x += flow.velocity.x * flowDt; tracer.y += flow.velocity.z * flowDt;
      if(tracer.y<this.boat.position.z-18||tracer.y>this.boat.position.z+145)tracer.y=this.boat.position.z-16+((i*3.713)%160);
      const halfWidth=channelHalfWidth(tracer.y)-.3;
      if(tracer.x>halfWidth)tracer.x=-halfWidth;if(tracer.x<-halfWidth)tracer.x=halfWidth;
      dummy.position.set(tracer.x, sampleWater(tracer.x, tracer.y, this.time).height + .012, tracer.y);
      dummy.rotation.set(-Math.PI / 2, 0, Math.atan2(-flow.velocity.x, -flow.velocity.z));
      dummy.scale.setScalar((.6 + (i % 5) * .16)*(flow.zone==='rapids'?2.2:1)); dummy.updateMatrix(); this.foam.setMatrixAt(i, dummy.matrix);
    }
    this.foam.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.vortexTracers.length; i++) {
      const tracer = this.vortexTracers[i]!;
      const flow = sampleWater(tracer.x, tracer.y, this.time);
      const flowDt = snap?.paused || snap?.stage === 'lobby' ? 0 : dt;
      tracer.x += flow.velocity.x * flowDt; tracer.y += flow.velocity.z * flowDt;
      const radius = Math.hypot(tracer.x - WHIRLPOOL.x, tracer.y - WHIRLPOOL.z);
      if (radius < .9 || radius > 4.8) tracer.set(WHIRLPOOL.x + Math.cos(i * 2.399) * 4.4, WHIRLPOOL.z + Math.sin(i * 2.399) * 4.4);
      dummy.position.set(tracer.x, sampleWater(tracer.x, tracer.y, this.time).height + .02, tracer.y);
      dummy.rotation.set(-Math.PI / 2, 0, Math.atan2(-flow.velocity.x, -flow.velocity.z));
      dummy.scale.set(.5, .45 + Math.min(1, Math.hypot(flow.velocity.x, flow.velocity.z)), 1); dummy.updateMatrix();
      this.vortexFoam.setMatrixAt(i, dummy.matrix);
    }
    this.vortexFoam.instanceMatrix.needsUpdate = true;
    if (snap && snap.condition === 'breaking' && this.lastCrash !== snap.crashId) {
      this.lastCrash = snap.crashId;
      for (let i = 0; i < 40; i++) this.particles.push({ position: this.boat.position.clone().add(new T.Vector3(Math.sin(i * 2.4), .12, Math.cos(i * 2.4) * 1.5)), velocity: new T.Vector3(Math.sin(i * 2.4) * 1.4, 1.1 + (i % 7) * .28, Math.cos(i * 2.4) * 1.4), life: .9 });
    }
    if (snap?.condition === 'afloat' && now > this.nextSpray) {
      this.nextSpray = now + .07;
      snap.blades.forEach(blade => {
        if (blade.immersion > .1 && blade.force > 35) for (let i = 0; i < 3; i++) {
          const point = this.boat.localToWorld(new T.Vector3(blade.x, blade.y, blade.z));
          point.y = sampleWater(point.x, point.z, this.time).height + .04;
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
    if (snap) {
      snap.blades.forEach((blade, i) => {
        if (blade.force > 40 && blade.immersion > 0.1 && now - (this.ripples.filter(r => r.seat === i).at(-1)?.born ?? -1) > 0.15) {
          const geometry = new T.RingGeometry(0.06, 0.085, 14);
          const material = new T.MeshBasicMaterial({ color: '#e0efda', transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false });
          const mesh = new T.Mesh(geometry, material);
          const point = this.boat.localToWorld(new T.Vector3(blade.x, blade.y, blade.z));
          mesh.position.set(point.x, sampleWater(point.x, point.z, this.time).height + 0.025, point.z);
          mesh.rotation.x = -Math.PI / 2; this.scene.add(mesh); this.ripples.push({ mesh, born: now, seat: i });
        }
      });
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]!; const age = now - r.born;
      if (age > 1) { this.scene.remove(r.mesh); r.mesh.geometry.dispose(); (r.mesh.material as T.Material).dispose(); this.ripples.splice(i, 1); }
      else { r.mesh.scale.setScalar(1 + age * 7); (r.mesh.material as T.MeshBasicMaterial).opacity = 0.6 * (1 - age); }
    }

    // World-relative horizon and bounded look-ahead; hull roll never tilts camera.
    const p = this.boat.position;
    this.followCamera(dt);
    this.sun.position.set(p.x - 20, 36, p.z + 28); this.sun.target.position.copy(p);
    this.sweepers.forEach((log,i)=>{log.position.copy(sampleSweeper(this.time,SWEEPERS[i]!));log.visible=Math.abs(log.position.z-p.z)<165;});
    const wheelPose=sampleWaterwheel(this.time);this.wheel.quaternion.set(wheelPose.x,wheelPose.y,wheelPose.z,wheelPose.w);
    this.wheel.visible=Math.abs(WATERWHEEL.z-p.z)<165;
    for(const [id,chunk] of this.chunks)chunk.visible=id*60>p.z-100&&id*60<p.z+180;
    for(const lod of this.foliageLods)lod.mesh.geometry=this.lowQuality||Math.abs(lod.z-p.z)>65?lod.far:lod.near;
    for(const lod of this.undergrowthLods)lod.mesh.count=this.lowQuality?Math.ceil(lod.count*.55):lod.count;
    this.sky.position.z=p.z;
    const section=ROUTE_SECTIONS.find(section=>p.z>=section.start&&p.z<section.end);
    this.renderer.domElement.dataset.routeSection=section?.id??'headwaters';
    this.renderer.domElement.dataset.visibleChunks=String([...this.chunks.values()].filter(chunk=>chunk.visible).length);
    this.water.setTransmission(this.presentation === 'game');
    this.water.update(this.time, this.camera, this.boat.position, this.boat.quaternion, snap ? Math.hypot(snap.velocity.x, snap.velocity.z) : 0, !snap || snap.condition === 'afloat');
    this.renderer.info.reset();
    this.water.capture(this.renderer,this.scene,this.camera);
    const captureCalls = this.renderer.info.render.calls;
    const captureTriangles = this.renderer.info.render.triangles;
    this.renderer.render(this.scene, this.camera);
    this.renderer.domElement.dataset.renderInfo = JSON.stringify({ calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures, reflections: !this.lowQuality, refraction: this.water.material.uniforms.refractionReady!.value === 1, captureCalls, captureTriangles, captureSize: this.water.captureSize.toArray() });
    // Inspectable screen-space envelope for camera regression checks.
    const bounds = { left: 1, right: 0, top: 1, bottom: 0 };
    for (const x of [-2.1, 2.1]) for (const y of [-0.35, 1.5]) for (const z of [-2.3, 2.3]) {
      const point = this.boat.localToWorld(new T.Vector3(x, y, z)).project(this.camera);
      bounds.left = Math.min(bounds.left, (point.x + 1) / 2);
      bounds.right = Math.max(bounds.right, (point.x + 1) / 2);
      bounds.top = Math.min(bounds.top, (1 - point.y) / 2);
      bounds.bottom = Math.max(bounds.bottom, (1 - point.y) / 2);
    }
    this.renderer.domElement.dataset.boatBounds = JSON.stringify(bounds);
  }
}
