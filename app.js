(() => {
"use strict";
const API="http://192.168.1.33:8100/api";
const state={channels:[],active:"all",items:[],favorites:new Set(JSON.parse(localStorage.getItem("retrodial-favorites")||"[]")),query:"",playing:null};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const image=id=>API+"/image/"+encodeURIComponent(id);
function save(){localStorage.setItem("retrodial-favorites",JSON.stringify([...state.favorites]));}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800);}
async function request(path){const r=await fetch(API+path);const data=await r.json();if(!r.ok)throw new Error(data.error||"Falha ao consultar servidor");return data;}
function channelCard(c){return `<button class="channel-card" data-channel="${esc(c.id)}"><div class="channel-art"><span>${esc(c.name.slice(0,1))}</span><small>${String(c.number).padStart(2,"0")}</small></div><div class="channel-info"><strong>${esc(c.name)}</strong><span>${c.count} títulos</span></div></button>`;}
function renderChannels(){
 const q=state.query.toLocaleLowerCase("pt-BR");
 const list=state.channels.filter(c=>(state.active==="all"||c.id===state.active)&&(c.name.toLocaleLowerCase("pt-BR").includes(q)||c.description.toLocaleLowerCase("pt-BR").includes(q)));
 $("channel-grid").innerHTML=list.map(channelCard).join("");
 $("channel-grid").querySelectorAll("[data-channel]").forEach(b=>b.addEventListener("click",()=>openChannel(b.dataset.channel)));
 $("channel-count").textContent=state.channels.length;
 $("library-count").textContent=state.libraryCount.toLocaleString("pt-BR");
}
function renderNav(){
 $("side-nav").innerHTML='<button class="nav-item active" data-nav="all"><span>⌂</span>Início</button><div class="nav-label">SUA PROGRAMAÇÃO</div>'+state.channels.map(c=>`<button class="nav-item" data-nav="${esc(c.id)}"><span>▣</span>${esc(c.name)}<i>${c.count}</i></button>`).join("");
 $("side-nav").querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>{state.active=b.dataset.nav;document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x===b));renderChannels();if(state.active!=="all")openChannel(state.active);}));
}
async function openChannel(id){
 try{
  const data=await request("/channels/"+encodeURIComponent(id)+"/items");
  state.items=data.items||[];
  $("channel-title").textContent=data.channel.name;
  $("channel-subtitle").textContent=data.channel.description+" · "+data.items.length+" títulos";
  $("channel-view").hidden=false;
  $("home-view").hidden=true;
  $("item-grid").innerHTML=state.items.map(item=>`<button class="media-card" data-item="${esc(item.id)}"><div class="poster"><img loading="lazy" src="${image(item.id)}" onerror="this.style.display='none'"><span>${esc(item.name.slice(0,1))}</span></div><strong>${esc(item.name)}</strong><small>${item.year||item.series||item.type}</small></button>`).join("");
  $("item-grid").querySelectorAll("[data-item]").forEach(b=>b.addEventListener("click",()=>play(b.dataset.item)));
  $("back-home").onclick=()=>{$("channel-view").hidden=true;$("home-view").hidden=false;};
 }catch(e){toast(e.message);}
}
async function play(id){
 try{
  const item=state.items.find(x=>x.id===id);if(!item)return;
  $("player-title").textContent=item.name;
  $("player").hidden=false;
  const video=$("video");video.src=API+"/stream/"+encodeURIComponent(id);video.play().catch(()=>toast("Pressione OK para iniciar a reprodução"));
  state.playing=id;
 }catch(e){toast(e.message);}
}
function closePlayer(){const v=$("video");v.pause();v.removeAttribute("src");v.load();$("player").hidden=true;state.playing=null;}
async function init(){
 try{
  const health=await request("/health");
  $("user-label").textContent=health.user||"Conectado";
  const data=await request("/channels");
  state.channels=data.channels;state.libraryCount=data.libraryCount;
  $("connection-status").textContent="CONECTADO AO SEU ACERVO";
  renderNav();renderChannels();
  const first=state.channels[0];if(first){$("featured-title").textContent=first.name;$("featured-desc").textContent=first.description;$("featured-count").textContent=first.count+" títulos disponíveis";$("featured-play").onclick=()=>openChannel(first.id);}
 }catch(e){$("connection-status").textContent="SERVIDOR INDISPONÍVEL";$("error-message").textContent=e.message;$("error-panel").hidden=false;}
}
$("search").addEventListener("input",e=>{state.query=e.target.value;renderChannels();});
$("close-player").addEventListener("click",closePlayer);
$("video").addEventListener("ended",()=>{toast("Fim do conteúdo");});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"||e.key==="Backspace"){
  if(!$("player").hidden){e.preventDefault();closePlayer();return;}
  if(!$("channel-view").hidden){$("channel-view").hidden=true;$("home-view").hidden=false;return;}
 }
});
init();
})();