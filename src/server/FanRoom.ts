import {ClientState,Room,type Client,type AuthContext} from '@colyseus/core';
import {FanSimulation} from '../shared/fan-simulation';
import {FAN_DT,FAN_PROTOCOL,FAN_PHYSICS,FAN_WORLD,type FanSnapshot} from '../shared/fan';
import {playerName} from '../shared/names';
import {checkIpRate} from './BoatRoom';

type Member={seat:number;name:string;ready:boolean;connected:boolean;lastInputAt:number;droppedAt?:number};
export class FanRoom extends Room {
  maxClients=4;
  maxMessagesPerSecond=90;
  reconnectGrace=90;
  sim!:FanSimulation;
  members=new Map<string,Member>();
  mode:FanSnapshot['mode']='friends';
  stage:FanSnapshot['stage']='lobby';
  debt=0;
  droppedSteps=0;
  private countdown=0;
  private sinceSnapshot=0;
  private resetVotes=new Set<string>();
  private voteUntil=0;
  private lastReset=0;

  static async onAuth(_token:string,options:Record<string,unknown>,context:AuthContext) {
    if(options.protocol!==FAN_PROTOCOL||options.physics!==FAN_PHYSICS||options.world!==FAN_WORLD)
      throw new Error('The fan game changed. Reload this page.');
    if(!playerName(options.name))throw new Error('Enter your name before joining.');
    if(options.mode!=='friends'&&options.mode!=='practice')throw new Error('Choose a crew or practice.');
    if(options.saveToken!==undefined)throw new Error('Paddle voyages belong to the previous world. Start a new fan crew.');
    const req:unknown=context.req;
    if(context.ip&&req&&typeof req==='object'&&'url' in req&&typeof req.url==='string'
      &&/\/matchmake\/(create|joinOrCreate)\/fan-raft\/?$/.test(new URL(req.url,'http://localhost').pathname))checkIpRate(context.ip);
    return true;
  }
  onCreate(options:Record<string,unknown>) {
    if(options.protocol!==FAN_PROTOCOL||options.physics!==FAN_PHYSICS||options.world!==FAN_WORLD)throw new Error('Reload for the fan game.');
    if(options.saveToken!==undefined)throw new Error('Old voyages cannot be loaded into this course.');
    this.setPrivate(true);
    this.mode=options.mode==='practice'?'practice':'friends';
    this.stage=this.mode==='practice'?'playing':'lobby';
    this.maxClients=this.mode==='practice'?1:4;
    this.sim=new FanSimulation();
    this.onMessage('fan',(client,value:unknown)=>{
      const member=this.joinedMember(client);
      if(member&&!this.paused&&this.stage==='playing'&&this.sim.accept(member.seat,value))member.lastInputAt=Date.now();
    });
    this.onMessage('ready',(client,value:unknown)=>{
      const member=this.joinedMember(client);
      if(!member||this.stage!=='lobby'||typeof value!=='boolean')return;
      member.ready=value;
      this.countdown=this.allReady()?(this.countdown||Date.now()+3000):0;
      this.sendSnapshot();
    });
    this.onMessage('reset',client=>{
      if(!this.joinedMember(client)||this.paused||this.stage!=='playing'||Date.now()-this.lastReset<1500)return;
      if(this.sim.complete) {
        this.sim.reset(true);this.lastReset=Date.now();
        if(this.mode==='friends'){this.stage='lobby';for(const m of this.members.values())m.ready=false;}
        this.clearVotes();this.sendSnapshot();return;
      }
      if(this.sim.condition==='wrecked'){this.reset();return;}
      if(Date.now()>this.voteUntil){this.resetVotes.clear();this.voteUntil=Date.now()+15000;}
      this.resetVotes.add(client.sessionId);
      if(this.resetVotes.size>=this.resetNeeded)this.reset();else this.sendSnapshot();
    });
    this.onMessage('sync',client=>{
      if(!this.canSend(client))return;
      this.sendSeat(client);client.send('snapshot',this.snapshot());
    });
    this.onMessage('*',()=>{});
    this.setSimulationInterval(elapsed=>this.advance(elapsed),FAN_DT*1000);
  }
  private joinedMember(client:Client) {
    const member=this.members.get(client.sessionId);
    return client.state===ClientState.JOINED&&member?.connected?member:undefined;
  }
  private allReady(){return this.members.size===4&&[...this.members.values()].every(m=>m.connected&&m.ready);}
  get paused(){return this.mode==='friends'&&this.stage==='playing'&&!this.sim.complete&&
    (this.members.size<4||[...this.members].some(([id,m])=>!m.connected||!this.clients.some(c=>c.sessionId===id&&c.state===ClientState.JOINED)));}
  private get resetNeeded(){return Math.floor([...this.members.values()].filter(m=>m.connected).length/2)+1;}
  advance(elapsed:number) {
    this.sinceSnapshot+=elapsed;
    if(this.countdown&&Date.now()>=this.countdown) {
      this.countdown=0;
      if(this.allReady()){this.stage='playing';this.sim.reset();}
    }
    if(this.voteUntil&&Date.now()>this.voteUntil)this.clearVotes();
    if(this.stage==='playing'&&!this.paused&&!this.sim.complete&&this.sim.condition==='afloat') {
      // Simulation time can discard a long stall; freshness must use real time.
      for(const m of this.members.values())if(m.connected&&Date.now()-m.lastInputAt>550&&!this.sim.fans[m.seat]!.needsNeutral)this.sim.releaseSeat(m.seat);
      this.debt+=Math.max(0,elapsed/1000);
      let steps=0;
      while(this.debt>=FAN_DT&&steps<5&&!this.sim.complete&&this.sim.condition==='afloat') {
        this.sim.step();this.debt-=FAN_DT;steps++;
      }
      if(this.sim.complete||this.sim.condition!=='afloat')this.debt=0;
      else if(this.debt>=FAN_DT){this.droppedSteps+=Math.floor(this.debt/FAN_DT);this.debt%=FAN_DT;}
    }else this.debt=0;
    if(this.sinceSnapshot>=50){this.sinceSnapshot%=50;this.sendSnapshot();}
  }
  onJoin(client:Client,options:Record<string,unknown>) {
    const name=playerName(options.name);if(!name)throw new Error('Enter your name.');
    const occupied=new Set([...this.members.values()].map(m=>m.seat));
    const seat=(this.mode==='practice'?[2]:[0,1,2,3]).find(i=>!occupied.has(i));
    if(seat===undefined)throw new Error('This raft is full.');
    this.members.set(client.sessionId,{seat,name,ready:false,connected:true,lastInputAt:0});
    this.sim.setActive(seat,true);this.sendSeat(client);this.sendSnapshot();
  }
  onDrop(client:Client) {
    const member=this.members.get(client.sessionId);
    if(member){member.connected=false;member.droppedAt=Date.now();if(this.stage==='lobby')member.ready=false;this.sim.setActive(member.seat,false);}
    this.countdown=0;this.clearVotes();this.sim.releaseInputs();this.sendSnapshot();
    void this.allowReconnection(client,this.reconnectGrace).catch(()=>{});
  }
  onReconnect(client:Client) {
    const m=this.members.get(client.sessionId);
    if(m){m.connected=true;m.droppedAt=undefined;this.sim.setActive(m.seat,true);}
    this.sendSeat(client);this.sendSnapshot();
  }
  onLeave(client:Client) {
    const m=this.members.get(client.sessionId);if(m)this.sim.setActive(m.seat,false);
    this.members.delete(client.sessionId);this.clearVotes();this.countdown=0;this.sim.releaseInputs();
    if(this.mode==='friends'&&!this.sim.complete){this.stage='lobby';this.sim.reset();for(const m of this.members.values())m.ready=false;}
    this.sendSnapshot();
  }
  private clearVotes(){this.resetVotes.clear();this.voteUntil=0;}
  private reset(){this.lastReset=Date.now();this.sim.reset();this.clearVotes();this.sendSnapshot();}
  private sendSeat(client:Client){client.send('seat',{seat:this.members.get(client.sessionId)?.seat,roomId:this.roomId});}
  private canSend(client:Client) {
    if(client.state!==ClientState.JOINED)return false;
    const socket=client.ref;
    if('bufferedAmount' in socket&&typeof socket.bufferedAmount==='number'&&socket.bufferedAmount>65536){
      if('terminate' in socket&&typeof socket.terminate==='function')socket.terminate();
      else client.leave(4000,'Reconnect to catch up.');
      return false;
    }
    return true;
  }
  snapshot():FanSnapshot {
    const disconnected=[...this.members.values()].filter(m=>!m.connected);
    const firstDrop=Math.min(...disconnected.map(m=>m.droppedAt??Date.now()));
    return {
      protocol:FAN_PROTOCOL,physics:FAN_PHYSICS,world:FAN_WORLD,tick:this.sim.tick,clock:this.sim.tick*FAN_DT,
      position:this.sim.hull.translation(),rotation:this.sim.hull.rotation(),velocity:this.sim.hull.linvel(),
      fans:this.sim.fans.map(f=>({slide:f.slide,phase:f.phase,power:f.power,strokes:f.strokes})),ack:this.sim.fans.map(f=>f.input.seq),
      crew:[...this.members.values()].map(({seat,name,ready,connected})=>({seat,name,ready,connected})),
      mode:this.mode,stage:this.stage,paused:this.paused,condition:this.sim.condition,complete:this.sim.complete,
      checkpoint:this.sim.checkpoint,resetId:this.sim.resetId,crashId:this.sim.crashId,obstacle:this.sim.obstacle,
      seconds:this.sim.activeTicks*FAN_DT,countdown:this.countdown?Math.max(0,Math.ceil((this.countdown-Date.now())/1000)):0,
      reconnectSeconds:disconnected.length?Math.max(0,this.reconnectGrace-Math.floor((Date.now()-firstDrop)/1000)):this.reconnectGrace,
      resetVotes:this.resetVotes.size,resetNeeded:this.resetNeeded,
    };
  }
  sendSnapshot(){const snapshot=this.snapshot();for(const client of this.clients)if(this.canSend(client))client.send('snapshot',snapshot);}
  onDispose(){this.sim?.dispose();}
}
