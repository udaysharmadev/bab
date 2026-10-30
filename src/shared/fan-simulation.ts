import RAPIER from '@dimforge/rapier3d-compat';
import {localToWorld,rotate} from './protocol';
import {
  FAN_DT as DT,FAN_CYCLE,FAN_SLIDE,FAN_FORCE,FAN_SEATS,RAFT_RADIUS,FAN_CHECKPOINTS,
  FAN_ROCKS,FAN_RAILS,FAN_SWEEPER,COURSE_END,fanCentre,fanCurrent,fanWater,
  fanStation,fanPower,fanBankVertices,railPosition,fanSweepAngle,validFanInput,
  type FanInput,type FanPose,
} from './fan';

type FanState=FanPose&{input:FanInput;active:boolean;age:number;needsNeutral:boolean};
const neutral=(seq:number):FanInput=>({seq,fan:false,scoot:0});
const mass=280;
const probes=Array.from({length:8},(_,i)=>({x:Math.cos(i*Math.PI/4)*1.3,y:-.16,z:Math.sin(i*Math.PI/4)*1.3}));
probes.push({x:0,y:-.16,z:0});
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

export class FanSimulation {
  readonly world=new RAPIER.World({x:0,y:-9.81,z:0});
  readonly events=new RAPIER.EventQueue(true);
  readonly hull:RAPIER.RigidBody;
  readonly collider:RAPIER.Collider;
  readonly hazards=new Map<number,string>();
  readonly sweeper:RAPIER.RigidBody|undefined;
  readonly fans:FanState[]=FAN_SEATS.map(()=>({slide:0,phase:FAN_CYCLE,strokes:0,power:0,input:neutral(0),active:false,age:999,needsNeutral:true}));
  tick=0;
  activeTicks=0;
  checkpoint=0;
  resetId=0;
  crashId=0;
  obstacle:string|null=null;
  condition:'afloat'|'wrecked'='afloat';
  complete=false;
  private inverted=0;

  // Fan Camp is still water: animated ripples must not supply passive propulsion.
  constructor(readonly currentScale=0,obstacles=true) {
    this.world.timestep=DT;
    this.hull=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,-.08,0)
      .setCcdEnabled(true).setCanSleep(false));
    this.collider=this.world.createCollider(RAPIER.ColliderDesc.cylinder(.3,RAFT_RADIUS)
      .setMass(mass).setFriction(.12).setRestitution(.32)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),this.hull);
    if(obstacles) {
      for(let z=-16;z<COURSE_END+18;z+=2)for(const side of [-1,1]) {
        const shape=RAPIER.ColliderDesc.convexHull(fanBankVertices(z,side));
        if(!shape)throw new Error('Invalid toy bank');
        this.world.createCollider(shape.setFriction(.08).setRestitution(.3));
      }
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(30,1,.5).setTranslation(0,0,-15));
      for(const rock of FAN_ROCKS)this.world.createCollider(RAPIER.ColliderDesc.ball(rock.radius)
        .setTranslation(fanCentre(rock.z)+rock.offset,-.25,rock.z).setRestitution(.3).setFriction(.12));
      for(const rail of FAN_RAILS) {
        const p=railPosition(rail);
        // Bar and teeth are both visibly dangerous. No invisible lethal rock volume.
        const bar=this.world.createCollider(RAPIER.ColliderDesc.cuboid(.28,.32,rail.length/2).setTranslation(p.x,.1,p.z));
        this.hazards.set(bar.handle,rail.id);
        for(let z=-rail.length/2+.45;z<rail.length/2;z+=.75) {
          const tooth=this.world.createCollider(RAPIER.ColliderDesc.cone(.28,.2)
            .setRotation({x:0,y:0,z:rail.side*Math.SQRT1_2,w:Math.SQRT1_2})
            .setTranslation(p.x-rail.side*.46,.12,p.z+z));
          this.hazards.set(tooth.handle,rail.id);
        }
      }
      this.sweeper=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(FAN_SWEEPER.x,.15,FAN_SWEEPER.z));
      const bar=this.world.createCollider(RAPIER.ColliderDesc.capsule(FAN_SWEEPER.length/2-.26,.26)
        .setTranslation(FAN_SWEEPER.length/2,0,0)
        .setRotation({x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2}),this.sweeper);
      this.hazards.set(bar.handle,'spiked-sweeper');
      for(let x=.5;x<FAN_SWEEPER.length;x+=.65)for(const side of [-1,1]) {
        const tooth=this.world.createCollider(RAPIER.ColliderDesc.cone(.25,.18)
          .setTranslation(x,0,side*.43).setRotation({x:side*Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2}),this.sweeper);
        this.hazards.set(tooth.handle,'spiked-sweeper');
      }
    }
  }

  setActive(seat:number,active:boolean) {
    const fan=this.fans[seat];if(!fan)return;
    fan.active=active;this.clearFan(fan);
  }
  private clearFan(fan:FanState) {
    fan.input=neutral(fan.input.seq);fan.phase=FAN_CYCLE;fan.power=0;fan.age=999;fan.needsNeutral=true;
  }
  releaseInputs() {for(const fan of this.fans)this.clearFan(fan);}
  releaseSeat(seat:number) {const fan=this.fans[seat];if(fan)this.clearFan(fan);}
  accept(seat:number,value:unknown) {
    const fan=this.fans[seat];
    if(!fan?.active||this.condition!=='afloat'||this.complete||!validFanInput(value,fan.input.seq))return false;
    if(fan.needsNeutral&&(value.fan||value.scoot!==0))return false;
    fan.needsNeutral=false;fan.input={...value};fan.age=0;return true;
  }

  step() {
    if(this.complete||this.condition!=='afloat')return;
    this.tick++;this.activeTicks++;
    const time=this.tick*DT;
    if(this.sweeper) {
      const a=fanSweepAngle(time);
      this.sweeper.setNextKinematicRotation({x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)});
    }
    const body=this.hull,p=body.translation(),q=body.rotation(),v=body.linvel(),omega=body.angvel();
    body.resetForces(true);body.resetTorques(true);
    for(const probe of probes) {
      const point=localToWorld(probe,p,q),r={x:point.x-p.x,y:point.y-p.y,z:point.z-p.z};
      const vy=v.y+omega.z*r.x-omega.x*r.z;
      const depth=fanWater(point.x,point.z,time)-point.y;
      const lift=clamp(depth*mass*9.81/(probes.length*.25)-vy*mass*3/probes.length,0,mass*9.81/probes.length*2.8);
      body.addForceAtPoint({x:0,y:lift,z:0},point,true);
    }
    const current=fanCurrent(p.x,p.z,this.currentScale),dx=v.x-current.x,dz=v.z-current.z,speed=Math.hypot(dx,dz);
    body.addForce({x:-dx*(185+70*speed),y:-v.y*30,z:-dz*(185+70*speed)},true);
    body.addTorque({x:-omega.x*230,y:-omega.y*(200+65*Math.abs(omega.y)),z:-omega.z*230},true);
    for(let i=0;i<this.fans.length;i++) {
      const fan=this.fans[i]!;
      fan.age+=DT;
      if(!fan.active||fan.age>.55) {this.clearFan(fan);continue;}
      fan.slide=clamp(fan.slide+fan.input.scoot*.42*DT,-FAN_SLIDE,FAN_SLIDE);
      if(fan.phase>=FAN_CYCLE&&fan.input.fan){fan.phase=0;fan.strokes++;}
      fan.power=fanPower(fan.phase);
      if(fan.power>0) {
        const s=FAN_SEATS[i]!,air=rotate({x:s.x,y:0,z:s.z},q),length=Math.hypot(air.x,air.z);
        if(length>.1) {
          const point=localToWorld({...fanStation(i,fan.slide),y:0},p,q);
          // Keep reaction horizontal at COM height; visible movement supplies the yaw lever.
          point.y=p.y;
          body.addForceAtPoint({x:-air.x/length*FAN_FORCE*fan.power,y:0,z:-air.z/length*FAN_FORCE*fan.power},point,true);
        }
      }
      fan.phase=Math.min(FAN_CYCLE,fan.phase+DT);
    }
    this.world.step(this.events);
    // Remove only the imperceptible drag tail in still water, retaining buoyancy/heel.
    if(this.currentScale===0&&this.fans.every(f=>f.power===0)) {
      const velocity=body.linvel(),spin=body.angvel();
      if(Math.hypot(velocity.x,velocity.z)<.04)body.setLinvel({x:0,y:velocity.y,z:0},true);
      if(Math.abs(spin.y)<.015)body.setAngvel({x:spin.x,y:0,z:spin.z},true);
    }
    this.events.drainCollisionEvents(()=>{});
    // Predictive pairs can start before contact. Recheck actual separation every
    // tick so near misses survive and a persistent pair still fails on touch.
    this.world.contactPairsWith(this.collider,other=>{
      const hazard=this.hazards.get(other.handle);if(!hazard||this.condition!=='afloat')return;
      this.world.contactPair(this.collider,other,manifold=>{
        for(let i=0;i<manifold.numContacts();i++)if(manifold.contactDist(i)<=.001){this.wreck(hazard);break;}
      });
    });
    const after=body.translation(),up=rotate({x:0,y:1,z:0},body.rotation());
    this.inverted=up.y<.15?this.inverted+1:0;
    if(![after.x,after.y,after.z,...Object.values(body.linvel())].every(Number.isFinite)
      ||after.y < -2||this.inverted>120)this.wreck('raft-overturned');
    if(this.condition==='afloat') {
      if(this.checkpoint===0&&after.z>=FAN_CHECKPOINTS[1]&&after.z<FAN_CHECKPOINTS[1]+8
        &&Math.abs(after.x-fanCentre(after.z))<4.8&&up.y>.7)this.checkpoint=1;
      if(this.checkpoint===FAN_CHECKPOINTS.length-1&&after.z>=COURSE_END&&Math.abs(after.x-fanCentre(after.z))<5&&up.y>.7) {
        this.complete=true;this.releaseInputs();body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
      }
    }
  }
  private wreck(id:string) {
    if(this.condition!=='afloat')return;
    this.condition='wrecked';this.obstacle=id;this.crashId++;this.releaseInputs();
    this.hull.setLinvel({x:0,y:0,z:0},true);this.hull.setAngvel({x:0,y:0,z:0},true);
  }
  reset(start=false) {
    if(start){this.checkpoint=0;this.activeTicks=0;}
    const z=FAN_CHECKPOINTS[this.checkpoint]??0;
    this.hull.setTranslation({x:fanCentre(z),y:-.08,z},true);
    this.hull.setRotation({x:0,y:0,z:0,w:1},true);
    this.hull.setLinvel({x:0,y:0,z:0},true);this.hull.setAngvel({x:0,y:0,z:0},true);
    this.hull.resetForces(true);this.hull.resetTorques(true);
    this.condition='afloat';this.complete=false;this.obstacle=null;this.inverted=0;this.resetId++;
    for(const fan of this.fans){fan.slide=0;if(start)fan.strokes=0;this.clearFan(fan);}
  }
  dispose(){this.events.free();this.world.free();}
}
