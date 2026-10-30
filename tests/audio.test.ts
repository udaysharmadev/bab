import {test} from 'node:test';
import assert from 'node:assert/strict';
import {soundCues,waterMix} from '../src/client/audio';
import {sampleWater} from '../src/shared/world';
import {type Snapshot,PHYSICS_VERSION,PROTOCOL_VERSION} from '../src/shared/protocol';
const snap=(extra:Partial<Snapshot>={}):Snapshot=>({protocol:PROTOCOL_VERSION,physics:PHYSICS_VERSION,tick:100,position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0,w:1},velocity:{x:0,y:0,z:0},blades:[],ack:[0,0,0,0],crew:[],checkpoint:0,revision:0,resetId:1,mode:'expedition',paused:false,complete:false,stage:'playing',condition:'afloat',wreckAge:0,crashId:0,obstacleId:null,strokes:[0,0,0,0],droppedSteps:0,...extra});
test('Audio follows actual one-shot events without replaying old sounds after join, reset, pause or reconnect',()=>{
 const start=snap(),stroke=snap({tick:101,strokes:[1,0,2,0]});
 assert.deepEqual(soundCues(undefined,stroke),[]);
 assert.deepEqual(soundCues(start,stroke).map(c=>c.kind==='stroke'?c.seat:c.kind),[0,2]);
 assert.deepEqual(soundCues(stroke,stroke),[]);
 assert.deepEqual(soundCues(start,{...stroke,resetId:2}),[]);
 assert.deepEqual(soundCues(start,{...stroke,paused:true}),[]);
 assert.deepEqual(soundCues(start,{...stroke,stage:'lobby'}),[]);
 assert.deepEqual(soundCues(start,{...stroke,tick:0}),[]);
 const breaking=snap({condition:'breaking',crashId:1});
 assert.deepEqual(soundCues(start,breaking),[{kind:'break'}]);
 assert.deepEqual(soundCues(breaking,{...breaking,condition:'sunk'}),[]);
 assert.deepEqual(soundCues(start,snap({checkpoint:1})),[{kind:'checkpoint'}]);
 assert.deepEqual(soundCues(start,snap({complete:true})),[{kind:'finish'}]);
});

test('Lobby countdown beeps once per beat and never replays on join, pause or repeated snapshots',()=>{
 const lobby=snap({stage:'lobby',tick:0});
 const three={...lobby,countdownSeconds:3};
 assert.deepEqual(soundCues(lobby,three),[{kind:'countdown',beat:3}]);
 assert.deepEqual(soundCues(three,three),[]);
 assert.deepEqual(soundCues(three,{...three,countdownSeconds:2}),[{kind:'countdown',beat:2}]);
 assert.deepEqual(soundCues(undefined,three),[]);
 assert.deepEqual(soundCues(lobby,{...three,paused:true}),[]);
 assert.deepEqual(soundCues(three,lobby),[]);
});

test('Water wash follows relative flow and continuous rapids, with bounded seat-specific immersion',()=>{
 const base=snap(),flow=sampleWater(0,0,base.tick/60).velocity;
 const drifting=waterMix({...base,velocity:flow});
 assert.equal(drifting.hull,0); assert(drifting.river>0); assert.equal(drifting.rapids,0);
 assert(waterMix({...base,velocity:{...flow,z:flow.z+2}}).hull>drifting.hull);
 for(let z=0;z<=1400;z+=.25){
  const mix=waterMix({...base,position:{x:0,y:0,z},velocity:{x:100,y:0,z:-100}});
  assert(mix.hull<=.14&&mix.rapids>=0&&mix.rapids<=.16);
  const next=waterMix({...base,position:{x:0,y:0,z:z+.01}});
  assert(Math.abs(mix.rapids-next.rapids)<.0003,'No hard zone-edge audio jump');
 }
 const blade={x:0,y:0,z:0,immersion:1,force:420,state:'BRACE' as const};
 for(let seat=0;seat<4;seat++){
  const blades=Array.from({length:4},(_,i)=>({...blade,state:i===seat?'BRACE' as const:'AIR' as const}));
  const mix=waterMix({...base,blades});
  assert.equal(mix.braces[seat],.12); assert.equal(mix.braces.filter(Boolean).length,1);
  assert.equal(waterMix({...base,blades:blades.map(b=>({...b,immersion:0}))}).braces[seat],0);
 }
 for(const change of [{paused:true},{complete:true},{condition:'breaking' as const},{condition:'sunk' as const}]){
  const mix=waterMix({...base,...change,blades:[blade]});
  assert.deepEqual([mix.river,mix.hull,mix.rapids,...mix.braces],[0,0,0,0,0,0,0]);
 }
 const dock=waterMix({...base,stage:'lobby',blades:[blade]});
 assert(dock.river>0&&dock.river<drifting.river); assert.deepEqual([dock.hull,dock.rapids,...dock.braces],[0,0,0,0,0,0]);
});
