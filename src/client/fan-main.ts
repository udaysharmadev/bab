import {Client,type Room} from '@colyseus/sdk';
import {Vector3} from 'three';
import {FanScene} from './fan-scene';
import {FanControls,fanKey} from './fan-input';
import {advanceFanLesson,fanFeedback,lessonCopy,type FanLesson} from './fan-feedback';
import {FAN_PROTOCOL,FAN_PHYSICS,FAN_WORLD,FAN_SEATS,COURSE_END,type FanSnapshot} from '../shared/fan';
import {playerName} from '../shared/names';
import './fan.css';

function el<T extends HTMLElement=HTMLElement>(id:string) {
  const element=document.getElementById(id);if(!element)throw new Error(`Missing ${id}`);return element as T;
}
const scene=new FanScene(el('world'));
const titleStage=el('title-stage');
new ResizeObserver(()=>{
  const r=titleStage.getBoundingClientRect();
  if(r.width>0&&r.height>0)scene.setTitleFrame(r);
}).observe(titleStage);
const surface=scene.renderer.domElement;surface.tabIndex=-1;surface.setAttribute('role','application');surface.setAttribute('aria-hidden','true');
surface.setAttribute('aria-label','Shared fan raft. A and D or left and right arrows scoot your player. Space operates your fan.');
const client=new Client(`${location.protocol==='https:'?'wss':'ws'}://${location.host}${import.meta.env.DEV?'/game':''}`);
const input=new FanControls();
const names=el<HTMLDialogElement>('name-dialog'),menu=el<HTMLDialogElement>('settings-dialog'),inviteDialog=el<HTMLDialogElement>('invite-dialog');
let room:Room|undefined,snapshot:FanSnapshot|undefined,seat=-1,seq=0,connected=false,busy=false,graphicsLost=false;
let pending:{mode:'friends'|'practice';id?:string}|undefined;
let lastSnapshot=0,lastCrew='',toastTimer=0,profile='';
let lesson:FanLesson={step:0,resetId:-1,startStrokes:0};
try{profile=playerName(localStorage.getItem('bad-at-boating-name'))??'';}catch{}
function toast(text:string){el('toast').textContent=text;el('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el('toast').classList.remove('show'),2400);}
const dialogOpen=()=>!!document.querySelector('dialog[open]');
const canFan=()=>!!room&&connected&&!graphicsLost&&!document.hidden&&!dialogOpen()&&performance.now()-lastSnapshot<1000
  &&snapshot?.stage==='playing'&&!snapshot.paused&&!snapshot.complete&&snapshot.condition==='afloat';
function send(){if(room&&connected&&room.connection.isOpen&&snapshot?.stage==='playing')room.send('fan',{seq:++seq,...(canFan()?input.action():{fan:false,scoot:0})});}
function clear(){input.clear();for(const b of document.querySelectorAll('.held'))b.classList.remove('held');send();}
function focus(){if(connected&&!dialogOpen())surface.focus({preventScroll:true});}
function saveSession(){if(!room)return;try{sessionStorage.setItem('fan-raft-session',JSON.stringify({id:room.roomId,token:room.reconnectionToken}));}catch{}}
function notice(title:string,copy:string){el('notice').hidden=false;el('notice-title').textContent=title;el('notice-copy').textContent=copy;}
function title(message=''){
  surface.tabIndex=-1;surface.setAttribute('aria-hidden','true');
  el('title-screen').hidden=false;el('menu-message').textContent=message;
  for(const id of ['lobby','run-hud','play-hint','lesson','touch-controls','result','notice','reset-vote'])el(id).hidden=true;
  el('crew-labels').replaceChildren();snapshot=undefined;scene.snapshot=undefined;lastCrew='';
}
async function leave(){
  clear();const old=room;room=undefined;connected=false;snapshot=undefined;seat=-1;
  try{sessionStorage.removeItem('fan-raft-session');}catch{}
  for(const dialog of [menu,names,inviteDialog])dialog.close();
  if(old){old.reconnection.enabled=false;await old.leave().catch(()=>{});}
  history.replaceState(null,'',location.pathname);location.reload();
}
function ask(mode:'friends'|'practice',id?:string){pending={mode,id};el<HTMLInputElement>('player-name').value=profile;el('name-message').textContent='Up to 20 letters, numbers or spaces.';names.showModal();}
async function copyInvite(){
  if(!room)return;const url=new URL(location.href);url.search='';url.searchParams.set('raft',room.roomId);
  try{await navigator.clipboard.writeText(url.href);toast('Invite copied. Bring your fan club!');}
  catch{menu.close();el<HTMLInputElement>('invite-link').value=url.href;inviteDialog.showModal();el<HTMLInputElement>('invite-link').select();}
}
function labels(s:FanSnapshot){
  const key=JSON.stringify([s.crew,seat,s.stage,s.mode]);if(key===lastCrew)return;lastCrew=key;
  el('crew-labels').replaceChildren();
  for(let i=0;i<4;i++) {
    const member=s.crew.find(m=>m.seat===i);if(!member&&s.mode==='practice')continue;
    const label=document.createElement(member?'span':'button');label.className=`crew-label${i===seat?' mine':''}${member?'':' empty'}`;label.dataset.seat=String(i);
    if(member){label.textContent=i===seat?'You':member.name;label.title=member.name;if(!member.connected)label.textContent+=' · reconnecting';
      if(member.ready&&s.stage==='lobby'){const tick=document.createElement('span');tick.className='tick';tick.textContent=' ✓';label.append(tick);}}
    else{label.textContent='+';label.setAttribute('aria-label',`Invite friend to ${FAN_SEATS[i]!.name}`);label.addEventListener('click',()=>void copyInvite());}
    el('crew-labels').append(label);
  }
}
function update(s:FanSnapshot){
  if(s.protocol!==FAN_PROTOCOL||s.physics!==FAN_PHYSICS||s.world!==FAN_WORLD){clear();notice('Game updated.','Reload to join the latest raft.');connected=false;return;}
  const changed=snapshot?.stage!==s.stage||snapshot?.resetId!==s.resetId||snapshot?.paused!==s.paused||snapshot?.condition!==s.condition||snapshot?.complete!==s.complete;
  const checkpoint=snapshot?.checkpoint??s.checkpoint;
  snapshot=s;lastSnapshot=performance.now();if(seat>=0)seq=Math.max(seq,s.ack[seat]??0);
  surface.tabIndex=s.stage==='playing'?0:-1;surface.setAttribute('aria-hidden','false');
  if(changed)clear();scene.setSnapshot(s);labels(s);
  el('title-screen').hidden=true;el('run-hud').hidden=false;el('lobby').hidden=s.stage!=='lobby';
  el('crew-count').textContent=`${s.crew.filter(m=>m.connected).length} / 4 aboard`;
  const me=s.crew.find(m=>m.seat===seat);el('ready').textContent=me?.ready?'Not Ready':'Ready';el('ready').setAttribute('aria-pressed',String(!!me?.ready));
  el<HTMLButtonElement>('ready').disabled=!connected;
  el('countdown').textContent=s.countdown?`Fans up! Starting in ${s.countdown}…`:'';
  el('course-label').textContent=s.stage==='lobby'?'The Fan Club':s.position.z<23?'Fan Camp':s.position.z<72?'Coral Bends':s.position.z<108?'Sweeper Workshop':'Home Stretch';
  el('timer').textContent=`${Math.floor(s.seconds/60)}:${String(Math.floor(s.seconds%60)).padStart(2,'0')}`;
  el<HTMLProgressElement>('progress').value=Math.max(0,Math.min(COURSE_END,s.position.z));
  const stopped=s.stage!=='playing'||s.paused||s.complete||s.condition!=='afloat';
  const blocked=dialogOpen()||graphicsLost||!connected||document.hidden;
  el('play-hint').hidden=stopped||blocked;el('touch-controls').hidden=stopped||blocked;
  const feedback=fanFeedback(s,seat);
  el('fan-feedback').textContent=feedback.label;el('play-hint').dataset.phase=feedback.phase;
  el<HTMLProgressElement>('fan-meter').value=feedback.recovery;
  document.querySelector('.crew-label.mine')?.classList.toggle('pushing',feedback.phase==='push');
  lesson=advanceFanLesson(lesson,s,seat,{blocked,fanHeld:input.action().fan});
  el('lesson').hidden=stopped||blocked||s.mode!=='practice'||s.position.z>15;
  if(el('lesson').textContent!==lessonCopy[lesson.step])el('lesson').textContent=lessonCopy[lesson.step];
  el('result').hidden=!s.complete&&s.condition!=='wrecked';
  if(s.complete){el('result-title').textContent='Still afloat. Still friends.';el('result-copy').textContent=`Fan Camp complete in ${el('timer').textContent} · ${s.fans.reduce((sum,f)=>sum+f.strokes,0)} crew flaps.`;el('retry').textContent='Go Again';}
  else if(s.condition==='wrecked'){el('result-title').textContent='Pop goes the raft.';el('result-copy').textContent=s.obstacle==='raft-overturned'?'A little too much chaos. Try again together.':'Those teeth mean trouble. Your checkpoint is safe.';el('retry').textContent='Retry Checkpoint';}
  el('reset-vote').hidden=!s.resetVotes;el('reset-vote').textContent=`Return to checkpoint: ${s.resetVotes}/${s.resetNeeded}. Agree from the menu.`;
  if(s.paused)notice('Waiting for your fan club.',`Raft paused safely. Rejoining crewmate · ${s.reconnectSeconds}s`);
  else if(!graphicsLost)el('notice').hidden=true;
  if(s.checkpoint>checkpoint)toast('Checkpoint! Your fan club made it.');
  const data=document.body.dataset;data.stage=s.stage;data.seat=String(seat);data.paused=String(s.paused);data.condition=s.condition;
  data.tick=String(s.tick);data.position=JSON.stringify(s.position);data.rotation=JSON.stringify(s.rotation);data.fans=JSON.stringify(s.fans);data.ack=JSON.stringify(s.ack);data.resetId=String(s.resetId);data.checkpoint=String(s.checkpoint);data.complete=String(s.complete);
  data.fanFeedback=feedback.phase;data.lessonStep=String(lesson.step);
  if(changed&&s.stage==='playing')focus();
}
async function connect(mode:'friends'|'practice',id?:string,token?:string){
  if(busy||room)return;busy=true;el<HTMLButtonElement>('name-submit').disabled=true;notice('Finding your raft…','Fans at the ready.');
  try {
    const options={protocol:FAN_PROTOCOL,physics:FAN_PHYSICS,world:FAN_WORLD,name:profile,mode};
    const joined=token?await client.reconnect(token):id?await client.joinById(id,options):await client.create('fan-raft',options);
    room=joined;connected=true;seq=0;lastSnapshot=performance.now();
    Object.assign(joined.reconnection,{minUptime:0,minDelay:200,maxDelay:2000,maxRetries:40,maxEnqueuedMessages:0});
    saveSession();const url=new URL(location.href);url.search='';url.searchParams.set('raft',joined.roomId);history.replaceState(null,'',url);
    joined.onMessage<{seat:number}>('seat',value=>{if(room!==joined)return;seat=value.seat;scene.ownSeat=seat;lastCrew='';if(snapshot)labels(snapshot);});
    joined.onMessage<FanSnapshot>('snapshot',value=>{if(room===joined)update(value);});
    joined.onDrop(()=>{if(room!==joined)return;connected=false;clear();notice('Rejoining your fan club…','Your crew is waiting safely.');});
    joined.onReconnect(()=>queueMicrotask(()=>{if(room!==joined)return;connected=true;clear();saveSession();joined.send('sync');focus();}));
    joined.onLeave(()=>{if(room!==joined)return;room=undefined;connected=false;clear();try{sessionStorage.removeItem('fan-raft-session');}catch{}title('This crew has ended. Start a new fan club.');});
    joined.onError((_code,message)=>{if(room===joined)toast(message??'Connection trouble.');});
    names.close();joined.send('sync');focus();
  }catch(error){el('notice').hidden=true;const message=error instanceof Error?error.message:'Could not reach the crew.';
    el('name-message').textContent=message;el('menu-message').textContent=message;
    if(token){try{sessionStorage.removeItem('fan-raft-session');}catch{}if(id)ask('friends',id);}
  }finally{busy=false;el<HTMLButtonElement>('name-submit').disabled=false;}
}

el('play-friends').addEventListener('click',()=>ask('friends'));
el('practice').addEventListener('click',()=>ask('practice'));
el('cancel-name').addEventListener('click',()=>names.close());
el('name-form').addEventListener('submit',event=>{
  event.preventDefault();const name=playerName(el<HTMLInputElement>('player-name').value);
  if(!name){el('name-message').textContent='Enter a name using up to 20 letters, numbers or spaces.';return;}
  profile=name;try{localStorage.setItem('bad-at-boating-name',name);}catch{}
  if(pending)void connect(pending.mode,pending.id);
});
el('ready').addEventListener('click',()=>{clear();room?.send('ready',!snapshot?.crew.find(m=>m.seat===seat)?.ready);});
for(const id of ['invite','menu-invite'])el(id).addEventListener('click',()=>void copyInvite());
el('close-invite').addEventListener('click',()=>{inviteDialog.close();focus();});
el('menu-button').addEventListener('click',()=>{clear();menu.showModal();el('touch-controls').hidden=el('play-hint').hidden=el('lesson').hidden=true;});
el('resume').addEventListener('click',()=>menu.close());
menu.addEventListener('close',()=>{clear();if(snapshot)el('touch-controls').hidden=el('play-hint').hidden=!canFan();focus();});
el('reset').addEventListener('click',()=>{clear();room?.send('reset');menu.close();});
el('retry').addEventListener('click',()=>{clear();room?.send('reset');focus();});
for(const id of ['leave','notice-leave'])el(id).addEventListener('click',()=>void leave());
el<HTMLInputElement>('low-graphics').addEventListener('change',event=>scene.setLow((event.currentTarget as HTMLInputElement).checked));
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&room&&!dialogOpen()){event.preventDefault();clear();menu.showModal();el('touch-controls').hidden=true;return;}
  const key=fanKey(event);if(!key||!canFan()||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
  event.preventDefault();if(!event.repeat){input.keys.add(key);send();}
});
window.addEventListener('keyup',event=>{const key=fanKey(event);if(key){input.keys.delete(key);if(canFan())event.preventDefault();send();}});
window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);surface.addEventListener('pointerdown',focus);
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-control]')) {
  button.addEventListener('pointerdown',event=>{if(!canFan())return;event.preventDefault();button.setPointerCapture(event.pointerId);input.touches.set(event.pointerId,button.dataset.control!);button.classList.add('held');send();});
  const end=(event:PointerEvent)=>{input.touches.delete(event.pointerId);if(![...input.touches.values()].includes(button.dataset.control!))button.classList.remove('held');send();};
  for(const type of ['pointerup','pointercancel','lostpointercapture'] as const)button.addEventListener(type,end);
}
surface.addEventListener('webglcontextlost',event=>{event.preventDefault();graphicsLost=true;clear();notice('Graphics recovering…','Your fan is released. The crew is still connected.');});
surface.addEventListener('webglcontextrestored',()=>{graphicsLost=false;clear();el('notice').hidden=false;toast('Graphics restored.');if(snapshot)update(snapshot);});
setInterval(send,1000/30);
const point=new Vector3();let previous=performance.now()/1000,metricAt=0;
function frame(ms:number){
  const now=ms/1000,dt=Math.min(.05,now-previous);previous=now;
  if(!graphicsLost){scene.render(dt,now);
    for(const node of el('crew-labels').children)if(node instanceof HTMLElement){scene.labelPoint(Number(node.dataset.seat),point);node.hidden=point.z>1||point.x < -1.2||point.x>1.2;node.style.left=`${(point.x+1)*innerWidth/2}px`;node.style.top=`${(1-point.y)*innerHeight/2}px`;}
    if(now-metricAt>1){metricAt=now;document.body.dataset.drawCalls=String(scene.renderer.info.render.calls);document.body.dataset.triangles=String(scene.renderer.info.render.triangles);}
  }
  if(room&&connected&&now*1000-lastSnapshot>1200){clear();notice('Waiting for the river…','Connection is slow. Your fan has stopped safely.');}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
const query=new URLSearchParams(location.search),id=query.get('raft');
if(id){
  let saved:{id?:string;token?:string}|undefined;try{saved=JSON.parse(sessionStorage.getItem('fan-raft-session')??'null');}catch{}
  const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  if(navigation?.type==='reload'&&saved?.id===id&&typeof saved.token==='string')void connect('friends',id,saved.token);
  else ask('friends',id);
}else if(query.has('crew')){el('menu-message').textContent='This invite belongs to the previous boat. Start a new fan club or open your previous crew.';el('legacy-link').hidden=false;el<HTMLAnchorElement>('legacy-link').href=`/legacy.html${location.search}`;}
