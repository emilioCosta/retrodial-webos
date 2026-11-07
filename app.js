(() => {
"use strict";
const API="http://192.168.1.33:8100/api";
const $=id=>document.getElementById(id);
const state={channels:[],libraryCount:0,activeView:"home",items:[],channel:null,channelIndex:0,itemIndex:0,loading:false};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;",'"':"&quot;","'":"&#39;"}[c]));
const image=id=>API+"/image/"+encodeURIComponent(id);
const isPlayer=()=>$("player").hidden===false;
async function request(path){const r=await fetch(API+path);const d=await r.json();if(!r.ok)throw new Error(d.error||"Falha ao consultar o RetroDial");return d;}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2200);}
function playerToast(message){const el=$("player-toast");el.textContent=message;el.classList.add("show");clearTimeout(playerToast.timer);playerToast.timer=setTimeout(()=>el.classList.remove("show"),1700);}
function channelCard(c){return `<button class="channel-card" data-channel="${esc(c.id)}"><div class="channel-art"><span>${esc((c.name||"R").slice(0,1))}</span><small>${String(c.number||0).padStart(2,"0")}</small></div><div class="channel-copy"><strong>${esc(c.name)}</strong><small>${Number(c.count||0).toLocaleString("pt-BR")} títulos · ${esc(c.description||"")}</small></div></button>`;}
function nowCard(c){const item=(c.sample||[])[0];return `<button class="now-card" data-start-channel="${esc(c.id)}"><span class="now-mark">${esc((c.name||"R").slice(0,1))}</span><span class="now-copy"><strong>${esc(item?.name||c.name)}</strong><small>${esc(c.name)} · Assistir agora</small></span></button>`;}
function renderHome(){
 const channels=state.channels.slice(0,5);
 $("home-channels").innerHTML=channels.map(channelCard).join("");
 $("on-now").innerHTML=state.channels.slice(0,4).map(nowCard).join("");
 const first=state.channels[0];
 $("hero-channel").disabled=!first;
 $("hero-channel").onclick=()=>first&&startChannel(first.id);
 $("library-count").textContent=state.libraryCount.toLocaleString("pt-BR");
 $("footer-library").textContent=state.libraryCount.toLocaleString("pt-BR")+" TÍTULOS";
}
function renderChannels(){
 const q=$("search").value.trim().toLocaleLowerCase("pt-BR");
 const filtered=state.channels.filter(c=>!q||c.name.toLocaleLowerCase("pt-BR").includes(q)||String(c.description||"").toLocaleLowerCase("pt-BR").includes(q));
 $("all-channels").innerHTML=filtered.map(channelCard).join("");
}
function timeLabel(offset){const d=new Date(Date.now()+offset*60000);return d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}
function renderGuide(){
 const q=$("search").value.trim().toLocaleLowerCase("pt-BR");
 const channels=state.channels.filter(c=>!q||c.name.toLocaleLowerCase("pt-BR").includes(q));
 $("guide-date").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"});
 $("guide-grid").innerHTML=channels.map((c,i)=>{
  const sample=c.sample||[];
  const offset=(i*3)%Math.max(sample.length,1);
  const slots=[0,1,2].map((n)=>{
   const item=sample[(offset+n)%Math.max(sample.length,1)];
   return `<button class="guide-program ${n===0?"current":""}" data-guide-channel="${esc(c.id)}" data-guide-item="${esc(item?.id||"")}"><small>${n===0?"AGORA":timeLabel(n*30)}</small><strong>${esc(item?.name||"Programação do canal")}</strong><em>${esc(item?.series||item?.year||"Do seu acervo")}</em></button>`;
  }).join("");
  return `<div class="guide-row"><div class="guide-channel"><span class="guide-channel-mark">${esc((c.name||"R").slice(0,1))}</span><span><strong>${esc(c.name)}</strong><small>CANAL ${String(c.number).padStart(2,"0")} · ${c.count} itens</small></span></div><div class="guide-programs">${slots}</div></div>`;
 }).join("")||'<p class="subtle">Nenhum canal encontrado.</p>';
}
function setView(name){
 state.activeView=name;
 ["home","guide","channels","channel"].forEach(v=>{const el=$(v+"-view");if(el)el.hidden=v!==name;});
 document.querySelectorAll(".nav-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 if(name==="guide")renderGuide();
 if(name==="channels")renderChannels();
 window.scrollTo(0,0);
 const target=document.querySelector("#"+name+"-view button, #"+name+"-view [tabindex]");
 if(target)target.focus({preventScroll:true});
}
async function loadChannel(id){
 const channel=state.channels.find(c=>c.id===id);if(!channel)throw new Error("Canal não encontrado");
 const data=await request("/channels/"+encodeURIComponent(id)+"/items");
 state.channel=channel;state.items=data.items||[];state.channelIndex=state.channels.findIndex(c=>c.id===id);$("channel-play").onclick=()=>startChannel(channel.id);
 $("channel-title").textContent=channel.name;$("channel-description").textContent=channel.description||"";
 $("channel-number").textContent=String(channel.number).padStart(2,"0");
 $("channel-count").textContent=state.items.length+" títulos";
 $("channel-programs").innerHTML=state.items.slice(0,24).map((item,i)=>`<button class="program-card" data-program-index="${i}"><span class="program-poster"><img loading="lazy" src="${image(item.id)}" onerror="this.style.display='none'"><b>${esc(item.name.slice(0,1))}</b></span><strong>${esc(item.name)}</strong><small>${esc(item.series||item.year||item.type||"")}</small></button>`).join("");
 setView("channel");
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
 state.itemIndex=index;const item=state.items[index];const video=$("video");
 updatePlayerInfo(item);$("player").hidden=false;
 $("player-back").focus();
 video.pause();video.src=API+"/stream/"+encodeURIComponent(item.id);video.load();
 const p=video.play();if(p&&p.catch)p.catch(()=>playerToast("Pressione OK para iniciar a reprodução"));
 $("toggle-play").innerHTML="Ⅱ <span>PAUSAR</span>";
}
async function startChannel(id){
 try{await loadChannel(id);if(!state.items.length){toast("Este canal não tem itens disponíveis");return;}playIndex(0);}
 catch(e){toast(e.message);}
}
async function zapChannel(delta){
 const next=state.channelIndex+delta;
 if(next<0||next>=state.channels.length){playerToast("Não há mais canais nesta direção");return;}
 const wasPlaying=!$("video").paused;
 try{const c=state.channels[next];await loadChannel(c.id);if(state.items.length&&wasPlaying)playIndex(0);else playerToast("Canal "+String(c.number).padStart(2,"0")+" · "+c.name);}
 catch(e){playerToast(e.message);}
}
function closePlayer(){const v=$("video");v.pause();v.removeAttribute("src");v.load();$("player").hidden=true;const focus=$("channel-play");if(focus)focus.focus();}
function togglePlay(){const v=$("video");if(v.paused){v.play().catch(()=>playerToast("Não foi possível iniciar"));$("toggle-play").innerHTML="Ⅱ <span>PAUSAR</span>";}else{v.pause();$("toggle-play").innerHTML="▶ <span>REPRODUZIR</span>";}}
function moveFocus(direction){
 const active=document.activeElement;
 const candidates=[...document.querySelectorAll("button:not(:disabled),a[href],input:not(:disabled)")].filter(el=>el.offsetWidth||el.offsetHeight).filter(el=>!el.closest("[hidden]")&&!el.closest(".player[hidden]"));
 const origin=active&&active.getBoundingClientRect();if(!origin){(candidates[0]||{}).focus?.();return;}
 const ox=origin.left+origin.width/2,oy=origin.top+origin.height/2;
 const scored=candidates.filter(el=>el!==active).map(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-ox,dy=y-oy;const primary=direction==="ArrowLeft"?-dx:direction==="ArrowRight"?dx:direction==="ArrowUp"?-dy:dy;if(primary<=4)return null;const cross=(direction==="ArrowLeft"||direction==="ArrowRight")?Math.abs(dy):Math.abs(dx);return {el,score:primary+cross*2.3};}).filter(Boolean).sort((a,b)=>a.score-b.score);
 if(scored[0])scored[0].el.focus();
}
function handleBack(){if(isPlayer()){closePlayer();return true;}if(state.activeView==="channel"){setView("channels");return true;}if(state.activeView!=="home"){setView("home");return true;}return false;}
function onKey(e){
 const key=e.key;const code=e.keyCode||e.which;
 if(key==="Escape"||key==="Backspace"||key==="GoBack"||code===461){if(handleBack()){e.preventDefault();e.stopPropagation();}return;}
 if(isPlayer()){
  if(key==="ArrowUp"||key==="ChannelUp"||code===33){e.preventDefault();zapChannel(1);return;}
  if(key==="ArrowDown"||key==="ChannelDown"||code===34){e.preventDefault();zapChannel(-1);return;}
  if(key==="ArrowLeft"||key==="ArrowRight"){const v=$("video");if(Number.isFinite(v.duration)){e.preventDefault();v.currentTime=Math.max(0,Math.min(v.duration,v.currentTime+(key==="ArrowRight"?10:-10)));}return;}
  if(key===" "||key==="Enter"||code===415||code===19){e.preventDefault();togglePlay();return;}
  return;
 }
 if(key.startsWith("Arrow")&&!(document.activeElement&&document.activeElement.tagName==="INPUT"&&(key==="ArrowLeft"||key==="ArrowRight"))){e.preventDefault();moveFocus(key);return;}
 if(key==="Enter"&&document.activeElement?.dataset?.channel){e.preventDefault();startChannel(document.activeElement.dataset.channel);}
}
async function init(){
 try{
  const health=await request("/health");const data=await request("/channels");
  state.channels=data.channels||[];state.libraryCount=data.libraryCount||0;
  $("connection-status").textContent=health.jellyfin==="connected"?"CONECTADO AO JELLYFIN":"SERVIDOR ONLINE";
  $("library-count").textContent=state.libraryCount.toLocaleString("pt-BR");
  renderHome();renderChannels();renderGuide();
  if(state.channels.length){const first=state.channels[0];$("channel-play").onclick=()=>startChannel(first.id);}
  setView("home");
 }catch(e){$("connection-status").textContent="SERVIDOR INDISPONÍVEL";$("error-message").textContent=e.message;$("error-view").hidden=false;}
}
document.addEventListener("click",e=>{
 const view=e.target.closest("[data-view]");if(view){setView(view.dataset.view);return;}
 const channel=e.target.closest("[data-channel]");if(channel){startChannel(channel.dataset.channel);return;}
 const start=e.target.closest("[data-start-channel]");if(start){startChannel(start.dataset.startChannel);return;}
 const guide=e.target.closest("[data-guide-channel]");if(guide){const id=guide.dataset.guideChannel;const itemId=guide.dataset.guideItem;loadChannel(id).then(()=>{const idx=state.items.findIndex(x=>x.id===itemId);playIndex(idx>=0?idx:0);}).catch(err=>toast(err.message));return;}
 const program=e.target.closest("[data-program-index]");if(program){playIndex(Number(program.dataset.programIndex));}
});
document.querySelectorAll(".nav-tab").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
$("brand-home").addEventListener("click",e=>{e.preventDefault();setView("home");});
$("hero-guide").addEventListener("click",()=>setView("guide"));
$("channel-back").addEventListener("click",()=>setView("channels"));
$("channel-play").addEventListener("click",()=>state.channel&&startChannel(state.channel.id));
$("player-back").addEventListener("click",closePlayer);
$("toggle-play").addEventListener("click",togglePlay);
$("next-item").addEventListener("click",()=>playIndex(state.itemIndex+1));
$("previous-item").addEventListener("click",()=>playIndex(Math.max(0,state.itemIndex-1)));
$("channel-up").addEventListener("click",()=>zapChannel(1));
$("channel-down").addEventListener("click",()=>zapChannel(-1));
$("video").addEventListener("ended",()=>{if(state.itemIndex+1<state.items.length)playIndex(state.itemIndex+1);else playerToast("Fim dos episódios deste canal");});
$("video").addEventListener("timeupdate",()=>{const v=$("video");$("progress-fill").style.width=(v.duration?100*v.currentTime/v.duration:0)+"%";});
$("search").addEventListener("input",()=>{renderChannels();renderGuide();});
$("retry").addEventListener("click",()=>{$("error-view").hidden=true;init();});
document.addEventListener("keydown",onKey);
init();
})();