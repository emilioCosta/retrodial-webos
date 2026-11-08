(() => {
"use strict";
const DEFAULT_API="http://192.168.1.33:8100/api";
const API=(()=>{try{return window.RETRODIAL_API||localStorage.getItem("retrodial.api")||DEFAULT_API;}catch(e){return DEFAULT_API;}})();
const $=id=>document.getElementById(id);
const state={channels:[],libraryCount:0,activeView:"home",items:[],channel:null,channelIndex:0,itemIndex:0,loading:false,live:null,skew:0,tz:"",guideOpen:false,guideData:null,sel:0,nowMap:{}};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const image=id=>API+"/image/"+encodeURIComponent(id);
let lastFocus=null;
const isPlayer=()=>$("player").hidden===false;
async function request(path){const ctl=typeof AbortController!=="undefined"?new AbortController():null;const t=ctl&&setTimeout(()=>ctl.abort(),15000);let r;try{r=await fetch(API+path,ctl?{signal:ctl.signal}:{});}catch(e){throw new Error("Sem resposta do servidor RetroDial");}finally{if(t)clearTimeout(t);}const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Falha ao consultar o RetroDial");return d;}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2200);}
function playerToast(message){const el=$("player-toast");el.textContent=message;el.classList.add("show");clearTimeout(playerToast.timer);playerToast.timer=setTimeout(()=>el.classList.remove("show"),1700);}
function channelCard(c){return `<button class="channel-card" data-channel="${esc(c.id)}"><div class="channel-art"><span>${esc((c.name||"R").slice(0,1))}</span><small>${String(c.number||0).padStart(2,"0")}</small></div><div class="channel-copy"><strong>${esc(c.name)}</strong><small>${Number(c.count||0).toLocaleString("pt-BR")} títulos · ${esc(c.description||"")}</small></div></button>`;}
function nowCard(c){const cur=state.nowMap[c.id];const title=cur?cur.item.name:((c.sample||[])[0]||{}).name||c.name;return `<button class="now-card" data-start-channel="${esc(c.id)}"><span class="now-mark">${esc((c.name||"R").slice(0,1))}</span><span class="now-copy"><strong>${esc(title)}</strong><small>${esc(c.name)} · ${cur?"AO VIVO desde "+esc(fmtTime(cur.start)):"Assistir agora"}</small></span></button>`;}
function renderHome(){
 const channels=state.channels.slice(0,5);
 $("home-channels").innerHTML=channels.map(channelCard).join("");
 $("on-now").innerHTML=state.channels.slice(0,4).map(nowCard).join("");
 const first=state.channels[0];
 $("hero-channel").disabled=!first;
 $("hero-channel").onclick=()=>{const id=lastChannelId();if(id)tune(id,{guide:false});};
 $("library-count").textContent=state.libraryCount.toLocaleString("pt-BR");
 $("footer-library").textContent=state.libraryCount.toLocaleString("pt-BR")+" TÍTULOS";
}
function renderChannels(){
 const q=$("search").value.trim().toLocaleLowerCase("pt-BR");
 const filtered=state.channels.filter(c=>!q||c.name.toLocaleLowerCase("pt-BR").includes(q)||String(c.description||"").toLocaleLowerCase("pt-BR").includes(q));
 $("all-channels").innerHTML=filtered.map(channelCard).join("");
}
function setView(name){
 state.activeView=name;
 ["home","channels","channel"].forEach(v=>{const el=$(v+"-view");if(el)el.hidden=v!==name;});
 document.querySelectorAll(".nav-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 if(name==="channels")renderChannels();
 window.scrollTo(0,0);
 const target=document.querySelector("#"+name+"-view button, #"+name+"-view [tabindex]");
 if(target)target.focus({preventScroll:true});
}
async function loadChannel(id,opts){opts=opts||{};
 const channel=state.channels.find(c=>c.id===id);if(!channel)throw new Error("Canal não encontrado");
 const data=await request("/channels/"+encodeURIComponent(id)+"/items");
 state.channel=channel;state.items=data.items||[];state.channelIndex=state.channels.findIndex(c=>c.id===id);
 $("channel-title").textContent=channel.name;$("channel-description").textContent=channel.description||"";
 $("channel-number").textContent=String(channel.number).padStart(2,"0");
 $("channel-count").textContent=state.items.length+" títulos";
 $("channel-programs").innerHTML=state.items.slice(0,24).map((item,i)=>`<button class="program-card" data-program-index="${i}"><span class="program-poster"><img loading="lazy" src="${image(item.id)}" onerror="this.style.display='none'"><b>${esc(item.name.slice(0,1))}</b></span><strong>${esc(item.name)}</strong><small>${esc(item.series||item.year||item.type||"")}</small></button>`).join("");
 if(!opts.silent)setView("channel");
}
async function openChannel(id){try{await loadChannel(id);}catch(e){toast(e.message);}}
function updatePlayerInfo(item){
 $("player-title").textContent=item.name||"Reproduzindo";
 $("player-program").textContent=item.name||"Agora";
 $("player-meta").textContent=[item.series,item.season!=null?"Temporada "+item.season:null,item.episode!=null?"Episódio "+item.episode:null,item.year].filter(Boolean).join(" · ")||"RetroDial";
 $("player-channel").textContent=state.channel?.name||"RETRODIAL";
}
function playIndex(index){
 if(index<0||index>=state.items.length){playerToast("Fim da programação deste canal");return;}
 leaveLive();state.itemIndex=index;const item=state.items[index];const video=$("video");
 if($("player").hidden)lastFocus=document.activeElement;
 updatePlayerInfo(item);$("player").hidden=false;
 $("player-back").focus();
 $("progress-fill").style.width="0%";
 video.pause();video.src=API+"/stream/"+encodeURIComponent(item.id);video.load();
 const p=video.play();if(p&&p.catch)p.catch(()=>playerToast("Pressione OK para iniciar a reprodução"));
 $("toggle-play").innerHTML="Ⅱ <span>PAUSAR</span>";
}
async function startChannel(id){
 try{await loadChannel(id);if(!state.items.length){toast("Este canal não tem itens disponíveis");return;}playIndex(0);}
 catch(e){toast(e.message);}
}
async function zapChannel(delta){
 if(state.live){zapLive(delta);return;}
 const next=state.channelIndex+delta;
 if(next<0||next>=state.channels.length){playerToast("Não há mais canais nesta direção");return;}
 const wasPlaying=!$("video").paused;
 try{const c=state.channels[next];await loadChannel(c.id,{silent:true});if(!state.items.length){playerToast("Canal "+String(c.number).padStart(2,"0")+" sem itens");return;}if(wasPlaying){playIndex(0);}else{state.itemIndex=0;updatePlayerInfo(state.items[0]);}playerToast("Canal "+String(c.number).padStart(2,"0")+" · "+c.name);}
 catch(e){playerToast(e.message);}
}
function closePlayer(){const wasLive=!!state.live;leaveLive();document.body.classList.remove("tv-mode");const v=$("video");v.pause();v.removeAttribute("src");v.load();$("player").hidden=true;const f=lastFocus&&document.contains(lastFocus)&&!lastFocus.closest("[hidden]")?lastFocus:document.querySelector("#"+state.activeView+"-view button");if(f&&f.focus)f.focus({preventScroll:true});if(wasLive)loadNowMap();}
function togglePlay(){const v=$("video");if(v.paused){v.play().catch(()=>playerToast("Não foi possível iniciar"));$("toggle-play").innerHTML="Ⅱ <span>PAUSAR</span>";}else{v.pause();$("toggle-play").innerHTML="▶ <span>REPRODUZIR</span>";}}
function moveFocus(direction){
 const active=document.activeElement;
 const candidates=[...document.querySelectorAll("button:not(:disabled),a[href],input:not(:disabled)")].filter(el=>el.offsetWidth||el.offsetHeight).filter(el=>!el.closest("[hidden]")&&!el.closest(".player[hidden]"));
 const origin=active&&active.getBoundingClientRect();if(!origin){(candidates[0]||{}).focus?.();return;}
 const ox=origin.left+origin.width/2,oy=origin.top+origin.height/2;
 const scored=candidates.filter(el=>el!==active).map(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-ox,dy=y-oy;const primary=direction==="ArrowLeft"?-dx:direction==="ArrowRight"?dx:direction==="ArrowUp"?-dy:dy;if(primary<=4)return null;const cross=(direction==="ArrowLeft"||direction==="ArrowRight")?Math.abs(dy):Math.abs(dx);return {el,score:primary+cross*2.3};}).filter(Boolean).sort((a,b)=>a.score-b.score);
 if(scored[0])scored[0].el.focus();
}
function handleBack(){if(isPlayer()){if(state.live&&state.guideOpen){flushTune();setGuide(false);return true;}closePlayer();return true;}if(state.activeView==="channel"){setView("channels");return true;}if(state.activeView!=="home"){setView("home");return true;}return false;}
function onKey(e){
 const key=e.key;const code=e.keyCode||e.which;
 const typing=document.activeElement&&document.activeElement.tagName==="INPUT";
 if(key==="Escape"||(key==="Backspace"&&!typing)||key==="GoBack"||code===461||(code===27&&!typing)){if(handleBack()){e.preventDefault();e.stopPropagation();}return;}
 if(isPlayer()){
  if(state.live){onLiveKey(e,key,code);return;}
  if(key==="ArrowUp"||key==="ChannelUp"||code===33){e.preventDefault();zapChannel(1);return;}
  if(key==="ArrowDown"||key==="ChannelDown"||code===34){e.preventDefault();zapChannel(-1);return;}
  if(key==="ArrowLeft"||key==="ArrowRight"){const v=$("video");if(Number.isFinite(v.duration)){e.preventDefault();v.currentTime=Math.max(0,Math.min(v.duration,v.currentTime+(key==="ArrowRight"?10:-10)));}return;}
  const onControl=document.activeElement&&document.activeElement.closest&&document.activeElement.closest(".player button");
  if(key==="Enter"&&onControl)return;
  if(key===" "||key==="Enter"||code===415||code===19){e.preventDefault();const v=$("video");if(code===415&&!v.paused)return;if(code===19&&v.paused)return;togglePlay();return;}
  if(code===412){e.preventDefault();playIndex(Math.max(0,state.itemIndex-1));return;}
  if(code===417){e.preventDefault();playIndex(state.itemIndex+1);return;}
  if(code===413){e.preventDefault();togglePlay();return;}
  return;
 }
 if(key.startsWith("Arrow")&&!(document.activeElement&&document.activeElement.tagName==="INPUT"&&(key==="ArrowLeft"||key==="ArrowRight"))){e.preventDefault();moveFocus(key);return;}
 if(key==="Enter"&&document.activeElement?.dataset?.channel){e.preventDefault();tune(document.activeElement.dataset.channel,{guide:false});}
}

/* ---------- RetroDial live TV ---------- */
const LAST_KEY="retrodial.lastChannel",SLOT=30*60000,WINDOW=3*3600000;
let tuneToken=0,tuneTimer=null,uiTimer=null,digitTimer=null,digitBuf="",guideLoading=false;
const nowMs=()=>Date.now()+state.skew;
function syncClock(serverTime,tz){if(serverTime)state.skew=serverTime-Date.now();if(tz)state.tz=tz;}
function fmtTime(ms){const o={hour:"2-digit",minute:"2-digit"};try{if(state.tz)o.timeZone=state.tz;return new Date(ms).toLocaleTimeString("pt-BR",o);}catch(e){return new Date(ms).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}}
function lastChannelId(){let id=null;try{id=localStorage.getItem(LAST_KEY);}catch(e){}return state.channels.some(c=>c.id===id)?id:(state.channels[0]||{}).id;}
function rememberChannel(id){try{localStorage.setItem(LAST_KEY,id);}catch(e){}}
function metaLine(item){return [item.series,item.season!=null?"T"+item.season:null,item.episode!=null?"E"+item.episode:null,item.year].filter(Boolean).join(" · ");}
function msg(m){(isPlayer()?playerToast:toast)(m);}
async function loadNowMap(){try{const d=await request("/guide?hours=1");syncClock(d.serverTime,d.timezone);const m={};d.channels.forEach(c=>{if(c.entries[0])m[c.id]=c.entries[0];});state.nowMap=m;if(state.channels.length)renderHome();}catch(e){}}
function leaveLive(){state.live=null;state.guideOpen=false;tuneToken++;clearTimeout(tuneTimer);clearTimeout(uiTimer);tuneTimer=null;const p=$("player");p.classList.remove("live","guide-open","ui-hidden");$("live-guide").hidden=true;$("player-next").textContent="";}
async function tune(channelId,opts){
 opts=opts||{};const token=++tuneToken;
 const channel=state.channels.find(c=>c.id===channelId);if(!channel)return;
 let data;
 try{data=await request("/channels/"+encodeURIComponent(channelId)+"/schedule?hours=6"+(opts.from?"&from="+opts.from:""));}
 catch(e){if(token===tuneToken)msg(e.message);return;}
 if(token!==tuneToken)return;
 syncClock(data.serverTime,data.timezone);
 if(!data.entries.length){msg("Este canal não tem itens disponíveis");return;}
 const p=$("player");
 if(p.hidden){lastFocus=document.activeElement;p.hidden=false;}
 p.classList.add("live");document.body.classList.add("tv-mode");
 state.live={channelId,entries:data.entries,index:0,errors:0};
 state.channel=channel;state.channelIndex=state.channels.findIndex(c=>c.id===channelId);
 rememberChannel(channelId);
 if(opts.guide!==undefined&&opts.guide!==state.guideOpen)setGuide(opts.guide);
 p.focus({preventScroll:true});
 playLive(0,data.entries[0].offset||0);
 if(state.guideOpen)renderLiveGuide();
 showLiveUi();
}
function playLive(index,offset){
 const L=state.live;if(!L)return;
 L.index=index;const e=L.entries[index];const video=$("video");
 video.pause();video.src=API+"/stream/"+encodeURIComponent(e.item.id);video.load();
 video.onloadedmetadata=()=>{video.onloadedmetadata=null;if(offset>5&&Number.isFinite(video.duration)&&offset<video.duration-5){try{video.currentTime=offset;}catch(err){}}};
 const p=video.play();if(p&&p.catch)p.catch(err=>{if(err&&err.name==="NotAllowedError"){L.needsGesture=true;playerToast("Pressione OK para iniciar a reprodução");}});
 $("progress-fill").style.width="0%";
 updateLiveInfo();
 if(state.guideOpen)renderLiveGuide();
}
function updateLiveInfo(){
 const L=state.live;if(!L)return;const e=L.entries[L.index],item=e.item,next=L.entries[L.index+1],ch=state.channel;
 const chLabel=ch?String(ch.number).padStart(2,"0")+" · "+ch.name:"AO VIVO";
 const range=fmtTime(e.start)+" – "+fmtTime(e.end);
 $("player-channel").textContent=chLabel;$("player-title").textContent=item.name;$("player-program").textContent=item.name;
 $("player-meta").textContent=[metaLine(item),range].filter(Boolean).join(" · ");
 $("player-next").textContent=next?"A SEGUIR · "+fmtTime(next.start)+" · "+next.item.name:"";
 $("lg-channel").textContent="CANAL "+chLabel;$("lg-title").textContent=item.name;
 $("lg-meta").textContent=[metaLine(item),range].filter(Boolean).join(" · ");
 $("lg-overview").textContent=item.overview||"";
}
function liveNext(){
 const L=state.live;if(!L)return;
 if(L.index+1<L.entries.length){playLive(L.index+1,0);return;}
 const last=L.entries[L.entries.length-1];
 request("/channels/"+encodeURIComponent(L.channelId)+"/schedule?hours=6&from="+last.end).then(d=>{if(state.live!==L||!d.entries.length)return;syncClock(d.serverTime,d.timezone);L.entries=d.entries;playLive(0,0);}).catch(e=>playerToast(e.message));
}
function liveError(){
 const L=state.live;if(!L)return;L.errors=(L.errors||0)+1;
 if(L.errors>=5){playerToast("Não foi possível reproduzir este canal");return;}
 playerToast("Item indisponível, pulando para o próximo");
 setTimeout(()=>{if(state.live===L&&!$("player").hidden)liveNext();},800);
}
function zapLive(delta){const n=state.channels.length;if(!n)return;state.channelIndex=(state.channelIndex+delta+n)%n;tune(state.channels[state.channelIndex].id);}
function showLiveUi(){const p=$("player");p.classList.remove("ui-hidden");clearTimeout(uiTimer);if(!state.guideOpen)uiTimer=setTimeout(()=>p.classList.add("ui-hidden"),5000);}
function flushTune(){if(tuneTimer){clearTimeout(tuneTimer);tuneTimer=null;const g=state.guideData;if(g&&g.channels[state.sel])tune(g.channels[state.sel].id);}}
async function loadGuide(){
 const start=Math.floor(nowMs()/SLOT)*SLOT;
 const d=await request("/guide?hours=3&from="+start);
 syncClock(d.serverTime,d.timezone);
 state.guideData={start,channels:d.channels};
 const m={};d.channels.forEach(c=>{const cur=c.entries.find(e=>e.start<=nowMs()&&nowMs()<e.end);if(cur)m[c.id]=cur;});state.nowMap=m;
}
function renderLiveGuide(){
 const L=state.live;if(!L)return;
 $("lg-times").innerHTML='<div class="lg-time-caption">PROGRAMAÇÃO DO CANAL</div><div class="lg-time-caption">'+esc(state.channel?.name||"")+' · '+esc(fmtTime(nowMs()))+'</div>';
 $("lg-rows").innerHTML='<div class="lg-row"><div class="lg-track">'+L.entries.map((e,i)=>{
  const active=i===L.index;
  const meta=[e.item.series,e.item.year].filter(Boolean).join(" · ");
  return '<div class="lg-cell'+(active?' now':'')+'"><small>'+esc(fmtTime(e.start))+' – '+esc(fmtTime(e.end))+'</small><strong>'+esc(e.item.name)+'</strong><em>'+esc(meta||e.item.type||"")+'</em></div>';
 }).join("")+'</div></div>';
 $("lg-clock").textContent=fmtTime(nowMs());
 updateLiveInfo();
}
function setGuide(open){
 const p=$("player");state.guideOpen=!!open;p.classList.toggle("guide-open",!!open);$("live-guide").hidden=!open;
 if(open){clearTimeout(uiTimer);p.classList.remove("ui-hidden");renderLiveGuide();}
 else showLiveUi();
}
function onLiveKey(e,key,code){
 const up=key==="ArrowUp",down=key==="ArrowDown",chUp=key==="ChannelUp"||code===33||code===427,chDown=key==="ChannelDown"||code===34||code===428,ok=key==="Enter"||code===13;
 if(/^[0-9]$/.test(key)){e.preventDefault();digitBuf=(digitBuf+key).slice(-3);playerToast("Canal "+digitBuf);clearTimeout(digitTimer);digitTimer=setTimeout(()=>{const n=Number(digitBuf);digitBuf="";const c=state.channels.find(x=>x.number===n);if(!c){playerToast("Canal "+n+" não existe");return;}clearTimeout(tuneTimer);tuneTimer=null;const g=state.guideData;if(state.guideOpen&&g){const i=g.channels.findIndex(x=>x.id===c.id);if(i>=0)selectRow(i);}tune(c.id);},1200);return;}
 if(ok&&state.live&&state.live.needsGesture){e.preventDefault();state.live.needsGesture=false;togglePlay();return;}
 if(state.guideOpen){
  if(up||chUp){e.preventDefault();zapLive(1);return;}
  if(down||chDown){e.preventDefault();zapLive(-1);return;}
  if(key==="ArrowLeft"||key==="ArrowRight"){e.preventDefault();return;}
  if(ok){e.preventDefault();setGuide(false);return;}
  return;
 }
 showLiveUi();
 if(up||chUp){e.preventDefault();zapLive(1);return;}
 if(down||chDown){e.preventDefault();zapLive(-1);return;}
 if(ok){e.preventDefault();setGuide(true);return;}
 if(key==="ArrowLeft"||key==="ArrowRight"){e.preventDefault();return;}
 if(key===" "||code===415||code===19){e.preventDefault();const v=$("video");if(code===415&&!v.paused)return;if(code===19&&v.paused)return;togglePlay();return;}
}
setInterval(()=>{if(!state.live||$("player").hidden||!state.guideOpen)return;$("lg-clock").textContent=fmtTime(nowMs());},1000);
async function init(){
 try{
  const health=await request("/health");const data=await request("/channels");
  state.channels=data.channels||[];state.libraryCount=data.libraryCount||0;
  $("connection-status").textContent=health.jellyfin==="connected"?"CONECTADO AO JELLYFIN":"SERVIDOR ONLINE";
  $("library-count").textContent=state.libraryCount.toLocaleString("pt-BR");
  renderHome();renderChannels();loadNowMap();
  setView("home");
  const initial=lastChannelId();if(initial)tune(initial,{guide:true});
 }catch(e){$("connection-status").textContent="SERVIDOR INDISPONÍVEL";$("error-message").textContent=e.message;$("error-view").hidden=false;}
}
document.addEventListener("click",e=>{
 const view=e.target.closest("[data-view]");if(view){setView(view.dataset.view);return;}
 const act=e.target.closest("[data-action]");if(act&&act.dataset.action==="live-guide"){const id=lastChannelId();if(id)tune(id,{guide:true});return;}
 const channel=e.target.closest("[data-channel]");if(channel){tune(channel.dataset.channel,{guide:false});return;}
 const start=e.target.closest("[data-start-channel]");if(start){tune(start.dataset.startChannel,{guide:false});return;}
 const program=e.target.closest("[data-program-index]");if(program){playIndex(Number(program.dataset.programIndex));}
});
document.querySelectorAll(".nav-tab[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
$("brand-home").addEventListener("click",e=>{e.preventDefault();setView("home");});
$("hero-guide").addEventListener("click",()=>{const id=lastChannelId();if(id)tune(id,{guide:true});});
$("video").addEventListener("click",()=>{if(state.live)setGuide(!state.guideOpen);});
$("channel-back").addEventListener("click",()=>setView("channels"));
$("channel-play").addEventListener("click",()=>state.channel&&startChannel(state.channel.id));
$("player-back").addEventListener("click",closePlayer);
$("toggle-play").addEventListener("click",togglePlay);
$("next-item").addEventListener("click",()=>playIndex(state.itemIndex+1));
$("previous-item").addEventListener("click",()=>playIndex(Math.max(0,state.itemIndex-1)));
$("channel-up").addEventListener("click",()=>zapChannel(1));
$("channel-down").addEventListener("click",()=>zapChannel(-1));
$("video").addEventListener("ended",()=>{if(state.live){liveNext();return;}if(state.itemIndex+1<state.items.length)playIndex(state.itemIndex+1);else playerToast("Fim dos episódios deste canal");});
$("video").addEventListener("playing",()=>{if(state.live){state.live.errors=0;state.live.needsGesture=false;}});
$("video").addEventListener("error",()=>{if(state.live&&!$("player").hidden){liveError();return;}if(!state.items.length||$("player").hidden)return;if(state.itemIndex+1<state.items.length){playerToast("Item indisponível, pulando para o próximo");setTimeout(()=>{if(!$("player").hidden)playIndex(state.itemIndex+1);},800);}else playerToast("Não foi possível reproduzir este item");});
$("video").addEventListener("play",()=>{$("toggle-play").innerHTML="Ⅱ <span>PAUSAR</span>";});
$("video").addEventListener("pause",()=>{if(!$("video").ended)$("toggle-play").innerHTML="▶ <span>REPRODUZIR</span>";});
$("video").addEventListener("timeupdate",()=>{const v=$("video");$("progress-fill").style.width=(v.duration?100*v.currentTime/v.duration:0)+"%";});
$("search").addEventListener("input",renderChannels);
$("retry").addEventListener("click",()=>{$("error-view").hidden=true;init();});
document.addEventListener("keydown",onKey);
init();
})();