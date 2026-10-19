import {test} from 'node:test';
import assert from 'node:assert/strict';
import {soundCues} from '../src/client/audio';
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
