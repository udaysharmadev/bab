import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {
  FAN_SEATS,FAN_CYCLE,FAN_ROCKS,FAN_RAILS,FAN_SWEEPER,FAN_CHECKPOINTS,COURSE_END,COURSE_HALF_WIDTH,
  fanCentre,fanWater,fanBankVertices,railPosition,fanSweepAngle,fanStation,fanPower,type FanSnapshot,
} from '../shared/fan';

const up=new T.Vector3(0,1,0);
const solid=new Map<string,T.MeshLambertMaterial>();
function mat(color:string,smooth=false) {
  const key=`${color}:${smooth}`;
  let m=solid.get(key);if(!m){m=new T.MeshLambertMaterial({color,flatShading:!smooth});solid.set(key,m);}return m;
}
function mesh(g:T.BufferGeometry,m:T.Material|T.Material[],parent:T.Object3D,x=0,y=0,z=0) {
  const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function capsule(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,parent:T.Object3D) {
  const direction=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,direction.length(),7),m,parent);
  o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(up,direction.normalize());return o;
}
function batch(group:T.Group) {
  group.updateMatrixWorld(true);
  const bins=new Map<string,{material:T.Material;cast:boolean;receive:boolean;geometries:T.BufferGeometry[]}>();
  for(const child of [...group.children])if(child instanceof T.Mesh&&!Array.isArray(child.material)) {
    const key=`${child.material.uuid}:${child.castShadow}:${child.receiveShadow}`;
    let bin=bins.get(key);
    if(!bin){bin={material:child.material,cast:child.castShadow,receive:child.receiveShadow,geometries:[]};bins.set(key,bin);}
    const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();
    geo.deleteAttribute('uv');geo.applyMatrix4(child.matrix);bin.geometries.push(geo);
    child.geometry.dispose();group.remove(child);
  }
  for(const bin of bins.values()) {
    const geometry=mergeGeometries(bin.geometries);if(!geometry)throw new Error('Toy geometry batch failed');
    const o=mesh(geometry,bin.material,group);o.castShadow=bin.cast;o.receiveShadow=bin.receive;
    bin.geometries.forEach(g=>g.dispose());
  }
}
function bankGeometry(vertices:Float32Array) {
  const g=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(vertices,3));
  g.setIndex([0,3,2,0,2,1,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);
  g.computeVertexNormals();return g;
}

export class FanScene {
  readonly renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  readonly scene=new T.Scene();
  readonly camera=new T.PerspectiveCamera(44,1,.1,210);
  readonly boat=new T.Group();
  readonly people:T.Group[]=[];
  readonly fanPivots:T.Group[]=[];
  readonly air:T.Group[]=[];
  private readonly arms:T.Mesh[][]=[];
  private readonly armDirection=new T.Vector3();
  private readonly shoulder=new T.Vector3();
  private readonly grip=new T.Vector3();
  readonly sweeper=new T.Group();
  private readonly course=new T.Group();
  private readonly lagoon=new T.Group();
  private readonly courseWater:T.Mesh;
  private readonly contactShadow:T.Mesh;
  private readonly ownMarker:T.Mesh;
  private titleFrame={left:0,top:0,width:1,height:1};
  private titleDirty=true;
  private wasTitle=false;
  readonly water:T.ShaderMaterial;
  readonly sun=new T.DirectionalLight('#fff3cf',2.1);
  private readonly target=new T.Vector3(0,-.08,0);
  private readonly targetRotation=new T.Quaternion();
  private readonly cameraTarget=new T.Vector3();
  private readonly look=new T.Vector3(0,0,6);
  private readonly projected=new T.Vector3();
  readonly raftBounds={left:0,right:1,top:0,bottom:1};
  private readonly wakes:Array<{mesh:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>;born:number}> = [];
  private wakeAt=0;
  private wakeIndex=0;
  private receivedAt=0;
  snapshot:FanSnapshot|undefined;
  ownSeat=-1;
  low=false;
  reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private snapped=true;

  constructor(container:HTMLElement) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.setClearColor('#a6e5f2');container.append(this.renderer.domElement);
    this.scene.fog=new T.Fog('#b6e7ec',115,200);
    this.scene.add(new T.HemisphereLight('#e5f7ff','#e7ac7c',1.65));
    this.sun.position.set(-16,32,-12);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{left:-29,right:29,top:34,bottom:-24,near:.1,far:85});
    this.sun.shadow.bias=-.0006;this.sun.shadow.normalBias=.035;
    this.scene.add(this.sun,this.sun.target);
    this.water=new T.ShaderMaterial({
      uniforms:{time:{value:0},showcase:{value:0}},
      vertexShader:`attribute float side; varying float vSide; varying vec3 vWorld; uniform float time;
        void main(){vec3 p=position;p.y=.025*sin(p.z*.45-time*1.6)+.018*sin(p.x*.7+p.z*.21-time*1.1);
        vWorld=p;vSide=side;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`varying float vSide;varying vec3 vWorld;uniform float time;uniform float showcase;
        void main(){float wave=sin(vWorld.x*1.4+vWorld.z*.6-time*1.2)*sin(vWorld.z*1.8-time*1.5);
        vec3 c=mix(vec3(.015,.62,.82),vec3(.035,.76,.89),.5+.5*wave*.32);
        float edge=smoothstep(.974,.999,abs(vSide));
        float line=pow(max(0.,sin(vWorld.z*2.2+sin(vWorld.x*1.6)-time*1.7)),28.);
        line*=smoothstep(.35,.8,sin(vWorld.x*1.7+vWorld.z*.21)*.5+.5);
        c=mix(c,vec3(.63,.94,.97),line*.055);c=mix(c,vec3(.86,.99,.96),edge*.85);
        if(showcase>.5){float ripple=sin(vWorld.x*1.2+vWorld.z*.75+sin(vWorld.z*2.-time*.45));
          float sheen=pow(max(0.,ripple),18.)*smoothstep(.4,.8,sin(vWorld.z*1.7+time*.3));
          c=mix(c,vec3(.77,1.,.96),sheen*.10);}
        gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>
        #include <colorspace_fragment>}`.replace('1.);#','1.);\n#'),
    });
    const positions:number[]=[],sides:number[]=[],indices:number[]=[];
    const columns=13;
    for(let z=-16,row=0;z<=COURSE_END+18;z+=2,row++)for(let column=0;column<columns;column++) {
      const side=column/(columns-1)*2-1;
      positions.push(fanCentre(z)+COURSE_HALF_WIDTH*side,0,z);sides.push(side);
      const i=row*columns+column;
      if(row>0&&column>0)indices.push(i-columns-1,i-1,i,i-columns-1,i,i-columns);
    }
    const waterGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3))
      .setAttribute('side',new T.Float32BufferAttribute(sides,1)).setIndex(indices);
    waterGeometry.computeVertexNormals();
    this.courseWater=mesh(waterGeometry,this.water,this.scene);this.courseWater.castShadow=false;this.courseWater.receiveShadow=false;
    this.scene.add(this.course,this.lagoon);
    this.makeCourse();this.makeLagoon();this.makeRaft();
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
    const shadowContext=shadowCanvas.getContext('2d')!,gradient=shadowContext.createRadialGradient(32,32,8,32,32,32);
    gradient.addColorStop(0,'#174f5a66');gradient.addColorStop(1,'#174f5a00');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,64,64);
    this.contactShadow=new T.Mesh(new T.PlaneGeometry(4.8,4.8),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
    this.contactShadow.rotation.x=-Math.PI/2;this.scene.add(this.contactShadow);
    this.ownMarker=new T.Mesh(new T.RingGeometry(.30,.34,28),new T.MeshBasicMaterial({color:'#fff4bb',transparent:true,opacity:.9,side:T.DoubleSide}));
    this.ownMarker.rotation.x=-Math.PI/2;this.boat.add(this.ownMarker);
    for(let i=0;i<10;i++) {
      const m=new T.Mesh(new T.RingGeometry(.55,.59,20,1,0,Math.PI),new T.MeshBasicMaterial({color:'#d4ffff',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));
      m.rotation.x=-Math.PI/2;this.scene.add(m);this.wakes.push({mesh:m,born:-99});
    }
    this.camera.position.set(0,17,-18);this.camera.lookAt(this.look);
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  private makeCourse() {
    const fixed=new T.Group();this.course.add(fixed);
    for(let z=-16;z<COURSE_END+18;z+=2)for(const side of [-1,1]) {
      const vertices=fanBankVertices(z,side);
      if(side===1) { // Match winding after mirroring the left-hand bank.
        const g=bankGeometry(vertices);const index=g.index!;
        for(let i=0;i<index.count;i+=3){const a=index.getX(i);index.setX(i,index.getX(i+2));index.setX(i+2,a);}g.computeVertexNormals();
        mesh(g,mat('#f6977f'),fixed);
      }else mesh(bankGeometry(vertices),mat('#f6977f'),fixed);
      const x=fanCentre(z)+side*COURSE_HALF_WIDTH,next=fanCentre(z+2)+side*COURSE_HALF_WIDTH;
      capsule(new T.Vector3(x,3.18,z),new T.Vector3(next,3.18,z+2),.16,mat('#8ac84d'),fixed);
      // A bright broad lower bank band, safely above the waterline.
      const band=mesh(new T.BoxGeometry(.1,.35,2.04),mat('#ffbe76'),fixed,(x+next)/2,.28,z+1);
      band.rotation.y=Math.atan2(next-x,2);
    }
    for(let z=-12;z<COURSE_END+15;z+=8)for(const side of [-1,1]) {
      const x=fanCentre(z)+side*(10+(Math.sin(z*1.3)*.5+.5)*5);
      const h=1.5+(Math.sin(z*2.1)+1)*.4;
      mesh(new T.CylinderGeometry(.15,.25,h,7),mat('#af7950'),fixed,x,3.2+h/2,z);
      const crown=mesh(new T.IcosahedronGeometry(1.05,1),mat(z%16===0?'#86c34b':'#68b954'),fixed,x,3.2+h+.65,z);
      crown.scale.set(1,1.2,1);
      const small=mesh(new T.IcosahedronGeometry(.65,0),mat('#9dd351'),fixed,x+side*.7,3.5,z+1.4);small.scale.y=.7;
    }
    for(const rock of FAN_ROCKS) {
      const g=new T.IcosahedronGeometry(rock.radius,2); // Shared ball contact silhouette, faceted surface.
      mesh(g,mat('#9b9aaa'),fixed,fanCentre(rock.z)+rock.offset,-.25,rock.z);
      const foam=mesh(new T.RingGeometry(rock.radius*.9,rock.radius*1.1,24),new T.MeshBasicMaterial({color:'#c4f6f3',side:T.DoubleSide}),fixed,fanCentre(rock.z)+rock.offset,.045,rock.z);
      foam.rotation.x=-Math.PI/2;foam.castShadow=false;foam.receiveShadow=false;
    }
    for(const rail of FAN_RAILS) {
      const p=railPosition(rail);
      mesh(new T.BoxGeometry(.56,.64,rail.length),mat('#ad67d5'),fixed,p.x,.1,p.z);
      for(let z=-rail.length/2+.45;z<rail.length/2;z+=.75) {
        const tooth=mesh(new T.ConeGeometry(.2,.56,7),mat('#fff8df'),fixed,p.x-rail.side*.46,.12,p.z+z);
        tooth.rotation.z=rail.side*Math.PI/2;
      }
    }
    const pivot=FAN_SWEEPER;
    mesh(new T.CylinderGeometry(.58,.72,.45,12),mat('#8276a7'),fixed,pivot.x,.1,pivot.z);
    this.sweeper.position.set(pivot.x,.15,pivot.z);this.course.add(this.sweeper);
    const bar=mesh(new T.CapsuleGeometry(.26,pivot.length-.52,4,10),mat('#ed6da7'),this.sweeper,pivot.length/2,0,0);
    bar.rotation.z=Math.PI/2;
    mesh(new T.CylinderGeometry(.38,.38,.85,12),mat('#cf4e93'),this.sweeper,0,.2,0);
    for(let x=.5;x<pivot.length;x+=.65)for(const side of [-1,1]) {
      const tooth=mesh(new T.ConeGeometry(.18,.5,7),mat('#fff8df'),this.sweeper,x,0,side*.43);tooth.rotation.x=side*Math.PI/2;
    }
    batch(this.sweeper);
    for(const [z,text] of [[9,'FAN CAMP'],[FAN_CHECKPOINTS[1],'CHECKPOINT'],[COURSE_END,'FINISH']] as const) {
      for(const side of [-1,1])mesh(new T.CylinderGeometry(.19,.22,5,9),mat('#ffca52'),fixed,fanCentre(z)+side*6.8,2.1,z);
      const beam=mesh(new T.CylinderGeometry(.19,.19,14,9),mat('#ffca52'),fixed,fanCentre(z),4.6,z);beam.rotation.z=Math.PI/2;
      this.sign(text,fanCentre(z),3.95,z,text==='FINISH'?'#bb70d6':'#ffce54');
    }
    batch(fixed);
  }
  private sign(text:string,x:number,y:number,z:number,color:string) {
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=128;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#245568';ctx.fillRect(0,0,640,128);
    ctx.strokeStyle=color;ctx.lineWidth=14;ctx.strokeRect(7,7,626,114);
    ctx.font='900 70px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff5d3';ctx.fillText(text,320,66);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const o=new T.Sprite(new T.SpriteMaterial({map:texture}));o.position.set(x,y,z);o.scale.set(5.8,1.16,1);this.course.add(o);
  }
  private makeLagoon() {
    const waterGeometry=new T.PlaneGeometry(100,100,48,48);waterGeometry.rotateX(-Math.PI/2);
    const positions=waterGeometry.attributes.position!;
    const sides=new Float32Array(positions.count);
    waterGeometry.setAttribute('side',new T.Float32BufferAttribute(sides,1));
    const water=mesh(waterGeometry,this.water,this.lagoon);water.castShadow=false;water.receiveShadow=false;
    // Background scenery is softened under the separate logo/action scrim.
    const dressing=new T.Group();this.lagoon.add(dressing);
    for(const [x,z,r] of [[-4.8,-4,2.0],[4.5,-5.5,2.7]] as const) {
      mesh(new T.CylinderGeometry(r,r*1.05,.65,12),mat('#efa18b'),dressing,x,-.06,z);
      mesh(new T.CylinderGeometry(r*.99,r,.10,12),mat('#ffe0a2'),dressing,x,.32,z);
      mesh(new T.CylinderGeometry(r*.78,r*.84,.09,12),mat('#a0cf73'),dressing,x,.41,z);
      mesh(new T.CylinderGeometry(.09,.15,1.6,8),mat('#ba875b'),dressing,x,.8+.45,z);
      const crown=mesh(new T.IcosahedronGeometry(.85,1),mat('#74b96b'),dressing,x,2.3,z);crown.scale.y=1.15;
    }
    for(let i=0;i<5;i++)mesh(new T.BoxGeometry(1.25,.12,.30),mat(i%2?'#dfb679':'#f3cd95'),dressing,3.55,.17,.25+i*.35);
    for(const x of [3,4.1])for(const z of [.15,1.8])mesh(new T.CylinderGeometry(.08,.10,.8,8),mat('#ad8058'),dressing,x,.18,z);
    mesh(new T.CylinderGeometry(.68,.76,.28,10),mat('#efa18b'),dressing,-1.67,.04,-1.68);
    mesh(new T.CylinderGeometry(.65,.69,.08,10),mat('#ffe0a2'),dressing,-1.67,.22,-1.68);
    const trunk=mesh(new T.CylinderGeometry(.065,.11,1.24,8),mat('#ba875b'),dressing,-1.7,.86,-1.73);trunk.rotation.z=-.16;
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3;
      const leaf=mesh(new T.SphereGeometry(.36,10,6),mat(i%2?'#7cc75f':'#58aa68',true),dressing,-1.8+Math.sin(a)*.30,1.49,-1.73+Math.cos(a)*.30);
      leaf.scale.set(.47,.16,1.55);leaf.rotation.set(.20,a,0);
    }
    mesh(new T.IcosahedronGeometry(.30,1),mat('#8b9fa4'),dressing,1.85,.13,-1.55);
    mesh(new T.IcosahedronGeometry(.18,1),mat('#a2b6b4'),dressing,2.07,.10,-1.26);
    const float=mesh(new T.TorusGeometry(.20,.075,7,20),mat('#ffba58'),dressing,2.05,.10,.96);float.rotation.x=Math.PI/2;
    mesh(new T.CylinderGeometry(.035,.035,.45,7),mat('#fff3cf'),dressing,2.05,.28,.96);
    const flag=mesh(new T.BoxGeometry(.25,.15,.025),mat('#ee8294'),dressing,2.16,.48,.96);flag.rotation.z=.12;
    batch(dressing);
    const pad=mesh(new T.CylinderGeometry(.22,.22,.02,16,1,false,.2,5.7),mat('#9ecb7b'),this.lagoon,-1.9,.045,-1.4);
    pad.rotation.y=.8;pad.castShadow=false;
  }

  private makeRaft() {
    this.scene.add(this.boat);
    const rim=mesh(new T.TorusGeometry(1.55,.30,10,48),mat('#ffc64c'),this.boat,0,.1,0);rim.rotation.x=Math.PI/2;
    mesh(new T.CylinderGeometry(1.55,1.55,.13,40),mat('#edb979'),this.boat,0,.19,0);
    for(let z=-1.05;z<=1.1;z+=.38) {
      const width=Math.sqrt(1.49**2-z*z)*2;
      mesh(new T.BoxGeometry(width,.008,.014),mat('#c99157'),this.boat,0,.26,z);
    }
    // Four dividers between the diagonal stations keep every scoot corridor clear.
    for(let i=0;i<4;i++) {
      const a=i*Math.PI/2;
      const strap=mesh(new T.BoxGeometry(.15,.10,.58),mat('#f1f4d8'),this.boat,Math.sin(a)*1.55,.37,Math.cos(a)*1.55);strap.rotation.y=a;
    }
    batch(this.boat);
    for(let i=0;i<4;i++) {
      const person=new T.Group(),color=FAN_SEATS[i]!.color,skin=['#ffdcab','#e8b58b','#c99470','#ffd3b0'][i]!;
      const body=mesh(new T.CapsuleGeometry(.22,.24,4,16),mat(color,true),person,0,.39,0);body.scale.z=.9;
      const head=mesh(new T.SphereGeometry(.265,20,14),mat(skin,true),person,0,.83,.015);head.scale.y=1.08;
      const bib=mesh(new T.SphereGeometry(.14,12,8),mat('#fff9e8',true),person,0,.40,.175);bib.scale.set(.8,1,.25);
      const mouth=mesh(new T.TorusGeometry(.055,.012,4,12,Math.PI),mat('#213d53',true),person,0,.785,.275);mouth.rotation.z=Math.PI;
      if(i===0) {
        mesh(new T.SphereGeometry(.28,18,8,0,Math.PI*2,0,.95),mat(color,true),person,0,.83,.015);
        const brim=mesh(new T.SphereGeometry(.16,14,7),mat(color,true),person,0,1,.22);brim.scale.set(1.45,.10,1);
      }else if(i===1) {
        mesh(new T.SphereGeometry(.28,18,8,0,Math.PI*2,0,.95),mat(color,true),person,0,.83,.015);
        mesh(new T.SphereGeometry(.075,10,7),mat('#fff9e8',true),person,0,1.15,.015);
      }else if(i===2) {
        const band=mesh(new T.TorusGeometry(.263,.025,6,24),mat(color,true),person,0,.98,.015);band.rotation.x=Math.PI/2;
        const tuft=mesh(new T.SphereGeometry(.095,12,8),mat(color,true),person,-.04,1.09,-.025);tuft.scale.set(.9,.75,1.3);
      }else {
        for(const side of [-1,1]){const knot=mesh(new T.SphereGeometry(.11,12,8),mat(color,true),person,side*.19,1.03,.015);knot.scale.set(1,.7,.7);}
      }
      for(const side of [-1,1]) {
        const foot=mesh(new T.SphereGeometry(.15,12,8),mat(color,true),person,side*.17,.085,.12);foot.scale.set(.85,.5,1.35);
        const eye=mesh(new T.SphereGeometry(.07,12,9),mat('#fff9e8',true),person,side*.092,.88,.248);eye.scale.set(.8,1.1,.4);
        const pupil=mesh(new T.SphereGeometry(.029,10,8),mat('#213d53',true),person,side*.092,.88,.277);pupil.scale.z=.4;
      }
      batch(person);
      this.arms.push([-1,1].map(()=>mesh(new T.CylinderGeometry(.07,.075,1,10),mat(skin,true),person)));
      const fan=new T.Group();fan.position.set(0,.54,.42);person.add(fan);
      const positions:number[]=[],indices:number[]=[];
      const pieces=16,radius=.78;
      for(let s=0;s<pieces;s++) {
        const a=s/pieces*Math.PI,b=(s+1)/pieces*Math.PI;
        positions.push(0,0,0,Math.cos(a)*radius,Math.sin(a)*radius,s%2?.04:-.04,Math.cos(b)*radius,Math.sin(b)*radius,s%2?-.04:.04);
        indices.push(s*3,s*3+1,s*3+2);
      }
      const grouped=[...indices.filter((_,i)=>Math.floor(i/3)%2===0),...indices.filter((_,i)=>Math.floor(i/3)%2===1)];
      const leaf=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setIndex(grouped);
      leaf.addGroup(0,grouped.length/2,0);leaf.addGroup(grouped.length/2,grouped.length/2,1);
      leaf.computeVertexNormals();
      const light=new T.MeshLambertMaterial({color:new T.Color(color).lerp(new T.Color('#fff9e6'),.5),side:T.DoubleSide,flatShading:true});
      const dark=new T.MeshLambertMaterial({color,side:T.DoubleSide,flatShading:true});
      mesh(leaf,[light,dark],fan);
      capsule(new T.Vector3(0,-.17,0),new T.Vector3(0,.15,0),.026,mat('#b57b4d'),fan);
      const ribs=new T.Group();
      for(let s=0;s<=pieces;s+=2) {
        const a=s/pieces*Math.PI;
        capsule(new T.Vector3(0,0,.015),new T.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,.015),.009,mat('#f3cf8c'),ribs);
      }
      batch(ribs);fan.add(ribs);
      const air=new T.Group();person.add(air);
      const airMaterial=new T.MeshBasicMaterial({color:'#e5ffff'});
      for(let s=-1;s<=1;s++) {
        const streak=mesh(new T.CapsuleGeometry(.019,.38,2,5),airMaterial,air,s*.24,.73+Math.abs(s)*.12,1.35);
        streak.rotation.x=Math.PI/2;streak.castShadow=false;
      }
      batch(air);
      this.boat.add(person);this.people.push(person);this.fanPivots.push(fan);this.air.push(air);
    }
  }
  setSnapshot(s:FanSnapshot) {
    if(!this.snapshot||s.resetId!==this.snapshot.resetId){this.boat.position.copy(s.position);this.boat.quaternion.copy(s.rotation);this.snapped=true;for(const w of this.wakes)w.born=-99;}
    this.snapshot=s;this.receivedAt=performance.now()/1000;this.target.copy(s.position);this.targetRotation.copy(s.rotation);
  }
  setLow(low:boolean){this.low=low;this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.75));this.sun.castShadow=!low;this.resize();}
  setTitleFrame(frame:{left:number;top:number;width:number;height:number}){this.titleFrame={left:frame.left,top:frame.top,width:frame.width,height:frame.height};this.titleDirty=true;}
  resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.titleDirty=true;}
  private frameTitle() {
    const frame=this.titleFrame,w=innerWidth,h=innerHeight;
    if(frame.width<2||frame.height<2)return;
    this.camera.clearViewOffset();
    const focus=new T.Vector3(0,.6,0),direction=new T.Vector3(5,8,11).normalize();
    let distance=12,left=0,right=0,top=0,bottom=0;
    this.boat.updateMatrixWorld(true);
    // Fit the crew; harbour scenery extends into the protected background.
    for(let pass=0;pass<4;pass++) {
      this.camera.position.copy(direction).multiplyScalar(distance).add(focus);this.camera.lookAt(focus);this.camera.updateMatrixWorld();
      left=top=Infinity;right=bottom=-Infinity;
      this.boat.traverseVisible(o=>{
        if(!(o instanceof T.Mesh))return;
        const vertices=o.geometry.attributes.position!;
        for(let i=0;i<vertices.count;i++) {
          this.projected.fromBufferAttribute(vertices,i).applyMatrix4(o.matrixWorld).project(this.camera);
          const sx=(this.projected.x+1)*w/2,sy=(1-this.projected.y)*h/2;
          left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);
        }
      });
      if(pass<3)distance*=Math.max((right-left)/(frame.width*.84),(bottom-top)/(frame.height*.84));
    }
    const offsetX=(left+right)/2-(frame.left+frame.width/2),offsetY=(top+bottom)/2-(frame.top+frame.height/2);
    this.camera.setViewOffset(w,h,offsetX,offsetY,w,h);
    this.renderer.domElement.dataset.titleFit=JSON.stringify({left:left-offsetX,right:right-offsetX,top:top-offsetY,bottom:bottom-offsetY});
    this.titleDirty=false;
  }
  labelPoint(seat:number,target:T.Vector3) {return this.people[seat]!.localToWorld(target.set(0,1.6,0)).project(this.camera);}
  render(dt:number,now:number) {
    const s=this.snapshot,playing=s?.stage==='playing',moving=playing&&!s.paused&&!s.complete&&s.condition==='afloat';
    const title=!s;
    this.course.visible=this.courseWater.visible=!title;this.lagoon.visible=title;
    if(title!==this.wasTitle){this.titleDirty=true;this.snapped=true;this.renderer.setClearColor(title?'#e1f0df':'#a6e5f2');if(!title)this.camera.clearViewOffset();}
    const clock=s?s.clock+(moving?Math.min(.1,now-this.receivedAt):0):now;
    this.water.uniforms.time!.value=title&&this.reduced?0:playing?clock:now;
    this.water.uniforms.showcase!.value=title?1:0;
    this.boat.position.lerp(this.target,1-Math.exp(-dt*13));this.boat.quaternion.slerp(this.targetRotation,1-Math.exp(-dt*13));
    if(!playing) {
      if(title)this.boat.position.set(0,0,0);
      this.boat.position.y=this.reduced?-.08:fanWater(0,0,now)-.08+Math.sin(now*1.8)*.025;
      this.boat.rotation.set(this.reduced?0:Math.sin(now*1.2)*.018,title?-.14+(this.reduced?0:Math.sin(now*.4)*.07):0,this.reduced?0:Math.cos(now*1.6)*.018);
    }
    const failed=s?.condition==='wrecked';
    this.boat.scale.set(1,failed ? .62 : 1,1);
    for(let i=0;i<4;i++) {
      const person=this.people[i]!,pose=s?.fans[i],station=FAN_SEATS[i]!;
      person.visible=!s||s.crew.some(m=>m.seat===i);
      const position=fanStation(i,pose?.slide??0);person.position.set(position.x,.29,position.z);
      person.rotation.y=title ? .25 : Math.atan2(station.x,station.z);
      const phase=pose?Math.min(FAN_CYCLE,pose.phase+(moving?Math.min(.1,now-this.receivedAt):0)):(this.reduced?FAN_CYCLE:(now+i*.38)%1.9);
      const power=fanPower(phase);
      const fan=this.fanPivots[i]!;fan.position.set(title?(i%2 ? .68 : -.68):0,title ? .42 : .54,.42);
      fan.rotation.x=-.28+Math.sin(Math.min(1,phase/FAN_CYCLE)*Math.PI*2)*.65;
      fan.rotation.z=this.reduced?0:.04*Math.sin(now*1.7+i);
      for(let a=0;a<2;a++) {
        const side=a===0?-1:1,arm=this.arms[i]![a]!;
        this.shoulder.set(side*.19,.52,.06);this.grip.set(side*.08,-.08,0).applyEuler(fan.rotation).add(fan.position);
        this.armDirection.copy(this.grip).sub(this.shoulder);arm.position.copy(this.shoulder).add(this.grip).multiplyScalar(.5);
        arm.scale.y=this.armDirection.length();arm.quaternion.setFromUnitVectors(up,this.armDirection.normalize());
      }
      person.rotation.x=power*.08;
      this.air[i]!.visible=power>.1&&!failed;
      this.air[i]!.position.x=title?fan.position.x:0;
      this.air[i]!.position.z=power*.4;
      this.air[i]!.scale.z=.65+power*.8;
    }
    this.sweeper.rotation.y=fanSweepAngle(clock);
    const p=this.boat.position,speed=s?Math.hypot(s.velocity.x,s.velocity.z):0;
    this.contactShadow.position.set(p.x,.055,p.z);this.contactShadow.scale.setScalar(failed?.85:1);
    this.ownMarker.visible=!title&&this.ownSeat>=0&&!failed;
    if(this.ownMarker.visible){const station=fanStation(this.ownSeat,s?.fans[this.ownSeat]?.slide??0);this.ownMarker.position.set(station.x,.275,station.z);}
    if(moving&&speed>.25&&now-this.wakeAt>.22) {
      this.wakeAt=now;const w=this.wakes[this.wakeIndex++%this.wakes.length]!;w.born=now;
      w.mesh.position.set(p.x-s!.velocity.x/speed*1.65,.06,p.z-s!.velocity.z/speed*1.65);
      w.mesh.rotation.z=-Math.atan2(s!.velocity.x,s!.velocity.z);
    }
    for(const w of this.wakes){const age=now-w.born;w.mesh.visible=!title&&age<1.7;w.mesh.scale.setScalar(1+age*.55);w.mesh.material.opacity=Math.max(0,.30*(1-age/1.7));}
    if(title) {if(this.titleDirty)this.frameTitle();}
    else {
    const aspect=this.camera.aspect,portrait=aspect<.85;
    const lookZ=p.z+(playing?(portrait?4:5):.5),centre=fanCentre(lookZ);
    this.look.lerp(new T.Vector3(p.x*.7+centre*.3,.2,lookZ),this.snapped?1:1-Math.exp(-dt*5));
    this.cameraTarget.set(p.x*.7+centre*.3,portrait?(playing?17:15):(playing?14.5:10.5),p.z-(portrait?17:(playing?12:10)));
    this.camera.position.lerp(this.cameraTarget,this.snapped?1:1-Math.exp(-dt*5));
    this.camera.lookAt(this.look);
    }
    this.camera.updateMatrixWorld();this.scene.updateMatrixWorld(true);
    const b=this.raftBounds;b.left=b.top=Infinity;b.right=b.bottom=-Infinity;
    for(const x of [-2.2,2.2])for(const y of [-.3,1.9])for(const z of [-2.2,2.2]) {
      this.projected.set(x,y,z).applyMatrix4(this.boat.matrixWorld).project(this.camera);
      const sx=(this.projected.x+1)/2,sy=(1-this.projected.y)/2;
      b.left=Math.min(b.left,sx);b.right=Math.max(b.right,sx);b.top=Math.min(b.top,sy);b.bottom=Math.max(b.bottom,sy);
    }
    this.renderer.domElement.dataset.raftBounds=JSON.stringify(b);
    this.sun.position.set(p.x-16,32,p.z-12);this.sun.target.position.set(p.x,0,p.z+10);this.sun.target.updateMatrixWorld();
    this.wasTitle=title;this.snapped=false;this.renderer.render(this.scene,this.camera);
  }
}
