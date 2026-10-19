import * as T from 'three';
import { HULL_RING } from './hull';
import { Water } from 'three/addons/objects/Water.js';
import { sampleWater, channelHalfWidth, ROCKS, PYLONS, SPIKES } from '../shared/world';

// Periodic slope texture, generated locally. Fine ripples are cosmetic; the
// displaced geometry below samples the exact authoritative water surface.
function rippleNormals() {
  const size = 128, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const dx = Math.cos(u * 3 + Math.sin(v * 2)) * .38 + Math.cos(u * 7 + v * 5) * .2;
    const dz = Math.cos(v * 4 + Math.sin(u * 3)) * .38 + Math.cos(v * 9 - u * 4) * .16;
    const n = new T.Vector3(dx, dz, 1).normalize(), i = (y * size + x) * 4;
    pixels[i] = (n.x * .5 + .5) * 255; pixels[i + 1] = (n.y * .5 + .5) * 255;
    pixels[i + 2] = (n.z * .5 + .5) * 255; pixels[i + 3] = 255;
  }
  const texture = new T.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter; texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

export class RiverWater extends Water {
  private lastGeometryTime = -1;
  private low = false;
  private transmission = true;
  private refractionTarget?: T.WebGLRenderTarget;
  private depthTarget?: T.WebGLRenderTarget;
  private readonly depthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, blending: T.NoBlending });
  readonly captureSize = new T.Vector2();
  captureFrames = 0;
  private readonly normalizedX: Float32Array;
  private readonly foamObstacles = [...ROCKS.map(r => new T.Vector3(r.x, r.z, r.radius)), ...PYLONS.map(p => new T.Vector3(p.x, p.z, .27)), ...SPIKES.map(p => new T.Vector3(p.x, p.z, p.radius))];
  // Cached scratch objects for the per-frame update() hot path — avoids GC pressure.
  private readonly _scaleOne = new T.Vector3(1, 1, 1);
  private readonly _forward = new T.Vector3(0, 0, 1);
  constructor() {
    super(new T.PlaneGeometry(26, 174, 48, 320), {
      textureWidth: 768, textureHeight: 768, waterNormals: rippleNormals(),
      sunDirection: new T.Vector3(-.42, .7, .58).normalize(), sunColor: '#fff0ce',
      waterColor: '#197b77', distortionScale: 1.3, fog: true,
    });
    this.rotation.x = -Math.PI / 2; this.position.z = 65;
    this.receiveShadow = true;
    const vertices = this.geometry.getAttribute('position');
    this.normalizedX = Float32Array.from({length:vertices.count}, (_,i)=>vertices.getX(i)/13);
    this.geometry.setAttribute('channelWidth', new T.Float32BufferAttribute(new Float32Array(vertices.count).fill(12.5),1));
    const material = this.material;
    material.uniforms.boatPosition = { value: new T.Vector2() };
    material.uniforms.boatDirection = { value: new T.Vector2(0, 1) };
    material.uniforms.boatSpeed = { value: 0 };
    material.uniforms.hullWorldInverse = { value: new T.Matrix4() };
    material.uniforms.dryHull = { value: 1 };
    material.uniforms.hullOutline = { value: HULL_RING.map(([x,z])=>new T.Vector2(x,z)) };
    material.uniforms.lowQuality = { value: 0 };
    material.uniforms.sceneColor = { value: null };
    material.uniforms.sceneDepth = { value: null };
    material.uniforms.refractionReady = { value: 0 };
    material.uniforms.cameraNearFar = { value: new T.Vector2(.1, 400) };
    const obstacles = Array.from({length:12},()=>new T.Vector3(1000,1000,0));
    material.uniforms.obstacles = { value: obstacles };
    material.vertexShader = material.vertexShader
      .replace('varying vec4 mirrorCoord;', 'attribute float channelWidth; varying float riverHalfWidth; varying vec3 riverNormal; varying vec4 riverClip; varying vec4 mirrorCoord;')
      .replace('gl_Position = projectionMatrix * mvPosition;', 'gl_Position = projectionMatrix * mvPosition; riverClip = gl_Position;')
      .replace('mirrorCoord = modelMatrix', 'riverHalfWidth = channelWidth; riverNormal = normalize(mat3(modelMatrix) * normal);\n mirrorCoord = modelMatrix');
    material.fragmentShader = material.fragmentShader
      .replace('varying vec4 mirrorCoord;', `varying float riverHalfWidth; varying vec3 riverNormal; varying vec4 riverClip;
        uniform sampler2D sceneColor; uniform sampler2D sceneDepth;
        uniform float refractionReady; uniform vec2 cameraNearFar;
        uniform mat4 hullWorldInverse; uniform float dryHull;
        uniform vec2 hullOutline[${HULL_RING.length}];
        uniform vec2 boatPosition; uniform vec2 boatDirection;
        uniform float boatSpeed; uniform float lowQuality;
        uniform vec3 obstacles[${obstacles.length}]; varying vec4 mirrorCoord;`)
      .replace('void main() {', `void main() {
        // The river cannot occupy the watertight intact hull. Evaluate in the
        // rendered boat frame, including draft, roll and pitch; wrecks flood.
        if (dryHull > .5) {
          vec3 local = (hullWorldInverse * vec4(worldPosition.xyz,1.0)).xyz;
          if (abs(local.x) < 1.0 && abs(local.z) < 2.3 && local.y >= -.30 && local.y <= .47) {
            float height = clamp((local.y + .25)/.72,0.0,1.0);
            vec2 section = local.xz / vec2(.65+.35*height,.88+.12*height);
            bool positive = false; bool negative = false;
            for (int i=0;i<${HULL_RING.length};i++) {
              vec2 a=hullOutline[i], b=hullOutline[(i+1)%${HULL_RING.length}];
              float edge=(b.x-a.x)*(section.y-a.y)-(b.y-a.y)*(section.x-a.x);
              positive = positive || edge > .0001;
              negative = negative || edge < -.0001;
            }
            if (!(positive && negative)) discard;
          }
        }
      `)
      .replace('worldPosition.xz * size' , 'worldPosition.xz * 7.0')
      .replace('normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) )',
        'normalize(riverNormal + vec3(noise.x, 0.0, noise.y) * 0.55)')
      .replace('vec3 outgoingLight = albedo;', `
        // Low keeps the inexpensive analytic tint. High samples the actual
        // opaque scene behind the surface, with view-depth absorption.
        float depth = .45 + 2.7 * (1.0 - pow(clamp(abs(worldPosition.x)/(riverHalfWidth+.4),0.0,1.0), 4.0));
        float bed = sin(worldPosition.x * 2.8 + sin(worldPosition.z * 1.7)) * sin(worldPosition.z * 3.1) * .05;
        float caustic = pow(max(0.0, sin(worldPosition.x*4.0+time*.9+sin(worldPosition.z*3.0-time*.7))), 10.0);
        vec3 transmitted = mix(vec3(.018,.16,.13), vec3(.22,.33,.15) + bed + caustic*.055, exp(-depth*.8));
        float contactFoam = 0.0;
        if (refractionReady > .5) {
          vec2 screenUV = riverClip.xy / riverClip.w * .5 + .5;
          float surfaceZ = -perspectiveDepthToViewZ(riverClip.z / riverClip.w * .5 + .5, cameraNearFar.x, cameraNearFar.y);
          float sceneDepthSample = unpackRGBAToDepth(texture2D(sceneDepth,screenUV));
          float sceneZ = -perspectiveDepthToViewZ(sceneDepthSample,cameraNearFar.x,cameraNearFar.y);
          float thickness = clamp(sceneZ - surfaceZ, 0.0, 12.0);
          vec2 refractedUV = clamp(screenUV + surfaceNormal.xz * .012 * smoothstep(0.0,1.0,thickness),vec2(.002),vec2(.998));
          float refractedDepth = unpackRGBAToDepth(texture2D(sceneDepth,refractedUV));
          float refractedZ = -perspectiveDepthToViewZ(refractedDepth,cameraNearFar.x,cameraNearFar.y);
          // Do not pull above-water players, banks or hull into the river.
          if (refractedZ < surfaceZ + .025) { refractedUV = screenUV; refractedDepth = sceneDepthSample; refractedZ = sceneZ; }
          if (refractedDepth < .99999 && refractedZ > surfaceZ + .015) {
            vec3 absorption = exp(-vec3(.68,.31,.22) * clamp(refractedZ-surfaceZ,0.0,12.0));
            vec3 below = texture2D(sceneColor,refractedUV).rgb;
            transmitted = below * absorption + vec3(.018,.16,.13) * (vec3(1.0)-absorption);
            transmitted += caustic * .025 * exp(-thickness * .6);
          }
          contactFoam = (1.0-smoothstep(.025,.23,thickness)) * smoothstep(.0,.025,thickness) * (.65+.35*sin(worldPosition.z*16.0+time*2.0));
        }
        vec3 skyReflection = mix(vec3(.61,.77,.78),vec3(.15,.37,.44),clamp(surfaceNormal.y,.0,1.0));
        reflectionSample = reflectionSample / (vec3(1.0) + reflectionSample);
        reflectionSample = mix(reflectionSample, skyReflection, lowQuality);
        float fresnel = .085 + .76 * pow(1.0-theta, 3.0);
        vec3 outgoingLight = mix(transmitted * (0.65+getShadowMask()*.35), reflectionSample*.6, fresnel) + specularLight*.42;
        float nearest = 100.0;
        for(int i=0;i<${obstacles.length};i++) nearest = min(nearest, abs(length(worldPosition.xz-obstacles[i].xy)-obstacles[i].z));
        float edgeFoam = (1.0-smoothstep(.025,.20,nearest)) * (.6+.4*sin(worldPosition.z*18.0+time*3.0));
        edgeFoam += smoothstep(riverHalfWidth-.05,riverHalfWidth+.4,abs(worldPosition.x))*.45;
        vec2 relative = worldPosition.xz - boatPosition;
        float aft = -dot(relative,boatDirection), lateral = abs(dot(relative,vec2(boatDirection.y,-boatDirection.x)));
        float wake = (1.0-smoothstep(.04,.18,abs(lateral-(.85+aft*.29)))) * smoothstep(1.0,2.0,aft) * (1.0-smoothstep(2.0,8.5,aft)) * clamp(boatSpeed*.5,0.0,.65);
        // Break long chalk-white wake lines into softer, moving froth.
        float froth = smoothstep(-.25,.55,sin(worldPosition.x*35.0+time)*sin(worldPosition.z*29.0-time*1.7)+noise.z*.35);
        wake *= .28 + .4 * froth;
        outgoingLight = mix(outgoingLight, vec3(.78,.91,.84),clamp(edgeFoam*.38+contactFoam*.34+wake,0.0,.65));
      `);
    const reflect = this.onBeforeRender;
    this.onBeforeRender = (...args) => {
      if (!this.low) reflect.apply(this, args);
    };
  }
  setLowQuality(low: boolean) {
    this.low = low; this.material.uniforms.lowQuality!.value = low ? 1 : 0;
    if (low) {
      this.refractionTarget?.dispose(); this.refractionTarget = undefined; this.captureSize.set(0,0);
      this.depthTarget?.dispose(); this.depthTarget = undefined;
      for (const name of ['sceneColor','sceneDepth']) this.material.uniforms[name]!.value = null;
      this.material.uniforms.refractionReady!.value = 0;
    }
  }
  setTransmission(enabled: boolean) {
    if (this.transmission === enabled) return;
    this.transmission = enabled;
    if (!enabled) {
      // The menu keeps the reflective water treatment, but does not bind a
      // depth texture before a playable river frame exists.
      this.material.uniforms.sceneColor!.value = null;
      this.material.uniforms.sceneDepth!.value = null;
      this.material.uniforms.refractionReady!.value = 0;
    }
  }
  capture(renderer: T.WebGLRenderer, scene: T.Scene, camera: T.PerspectiveCamera) {
    if (this.low || !this.transmission) return;
    const size = renderer.getDrawingBufferSize(new T.Vector2());
    const scale = Math.min(.65, 1280 / size.x, 960 / size.y);
    const width = Math.max(1, Math.round(size.x * scale)), height = Math.max(1, Math.round(size.y * scale));
    if (!this.refractionTarget || !this.depthTarget) {
      this.refractionTarget = new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType});
      this.depthTarget = new T.WebGLRenderTarget(width,height);
      this.depthTarget.texture.minFilter = this.depthTarget.texture.magFilter = T.NearestFilter;
      this.refractionTarget.texture.name = 'river-scene-transmission';
      this.depthTarget.texture.name = 'river-scene-packed-depth';
    }
    if (this.refractionTarget.width !== width || this.refractionTarget.height !== height) {
      this.refractionTarget.setSize(width,height); this.depthTarget.setSize(width,height);
    }
    const target = renderer.getRenderTarget(), visible = this.visible, layers = camera.layers.mask;
    const shadows = renderer.shadowMap.autoUpdate, shadowEnabled = renderer.shadowMap.enabled, xr = renderer.xr.enabled;
    const viewport = renderer.getViewport(new T.Vector4()), scissor = renderer.getScissor(new T.Vector4()), scissorTest = renderer.getScissorTest();
    const overrideMaterial = scene.overrideMaterial, clearColor = renderer.getClearColor(new T.Color()), clearAlpha = renderer.getClearAlpha();
    try {
      // Riverbed transmission needs material color and geometry depth, not
      // sunlight shadows. Keeping shadow samplers out of this offscreen pass
      // also makes the capture compatible with the reflected-water program.
      this.visible = false; camera.layers.set(1); renderer.shadowMap.autoUpdate = false; renderer.shadowMap.enabled = false; renderer.xr.enabled = false;
      renderer.setRenderTarget(this.refractionTarget); renderer.setScissorTest(false); renderer.clear(); renderer.render(scene,camera);
      scene.overrideMaterial = this.depthMaterial; renderer.setClearColor(0xffffff,1);
      renderer.setRenderTarget(this.depthTarget); renderer.clear(); renderer.render(scene,camera);
      this.captureSize.set(width,height); this.captureFrames++;
      this.material.uniforms.sceneColor!.value = this.refractionTarget.texture;
      this.material.uniforms.sceneDepth!.value = this.depthTarget.texture;
      this.material.uniforms.refractionReady!.value = 1;
      (this.material.uniforms.cameraNearFar!.value as T.Vector2).set(camera.near,camera.far);
    } finally {
      this.visible = visible; camera.layers.mask = layers; renderer.shadowMap.autoUpdate = shadows; renderer.shadowMap.enabled = shadowEnabled; renderer.xr.enabled = xr;
      scene.overrideMaterial = overrideMaterial; renderer.setClearColor(clearColor,clearAlpha);
      renderer.setRenderTarget(target); renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(scissorTest);
    }
  }
  update(time: number, camera: T.Camera, position: T.Vector3, rotation: T.Quaternion, speed: number, intact = true) {
    const uniforms = this.material.uniforms;
    uniforms.time!.value = time;
    uniforms.dryHull!.value = intact ? 1 : 0;
    (uniforms.hullWorldInverse!.value as T.Matrix4).compose(position,rotation,this._scaleOne).invert();
    (uniforms.eye!.value as T.Vector3).copy(camera.position);
    (uniforms.boatPosition!.value as T.Vector2).set(position.x, position.z);
    this._forward.set(0, 0, 1).applyQuaternion(rotation);
    (uniforms.boatDirection!.value as T.Vector2).set(this._forward.x, this._forward.z).normalize();
    uniforms.boatSpeed!.value = speed;
    // Geometry runs at 20 Hz; shader normals/reflections run at display rate.
    // Checkpoint/reconnect can relocate the hull without advancing server time.
    // Do not leave the water window behind during a same-tick reset.
    if (Math.abs(time - this.lastGeometryTime) < .05 && Math.abs(position.z + 65 - this.position.z) < .5) return;
    this.lastGeometryTime = time;
    this.position.z = position.z + 65;
    const p = this.geometry.getAttribute('position'), widths = this.geometry.getAttribute('channelWidth');
    let width = 12.5;
    for (let i = 0; i < p.count; i++) {
      const z = this.position.z - p.getY(i);
      if(i%49===0)width=channelHalfWidth(z);
      p.setX(i, this.normalizedX[i]! * (width + .4)); widths.setX(i,width);
      p.setZ(i, sampleWater(p.getX(i), z, time).height - .015);
    }
    const nearest = this.foamObstacles.slice().sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.z)-Math.hypot(b.x-position.x,b.y-position.z)).slice(0,12);
    const foam = uniforms.obstacles!.value as T.Vector3[]; nearest.forEach((point,i)=>foam[i]!.copy(point));
    widths.needsUpdate = true; p.needsUpdate = true; this.geometry.computeVertexNormals();
  }
}
