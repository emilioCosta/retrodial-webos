(() => {
  "use strict";
  const NOSTALGEX_URL = "http://192.168.1.33:8099/";
  const $ = (id) => document.getElementById(id);
  const state = { config:null, bundle:"all", favoritesOnly:false, favorites:new Set(JSON.parse(localStorage.getItem("retrodial-favorites")||"[]")), selected:null };
  const bundleById = new Map();
  const bundleNames = new Map();
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function saveFavorites(){ localStorage.setItem("retrodial-favorites",JSON.stringify([...state.favorites])); }
  function toast(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),1900); }
  function buildFilters(){
    const host=$("bundle-filters");
    state.config.bundles.forEach(bundle=>{
      bundleNames.set(bundle.id,bundle.name);
      bundle.channelIDs.forEach(id=>bundleById.set(id,bundle.id));
      const button=document.createElement("button");
      button.className="filter"; button.dataset.bundle=bundle.id; button.textContent=bundle.name;
      button.addEventListener("click",()=>{state.bundle=bundle.id;state.favoritesOnly=false;updateFilters();render();});
      host.appendChild(button);
    });
    host.querySelector('[data-bundle="all"]').addEventListener("click",()=>{state.bundle="all";state.favoritesOnly=false;updateFilters();render();});
  }
  function updateFilters(){
    document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.bundle===state.bundle&&!state.favoritesOnly));
    $("favorites-toggle").setAttribute("aria-pressed",String(state.favoritesOnly));
    $("section-title").textContent=state.favoritesOnly?"Seus favoritos":state.bundle==="all"?"Todos os canais":bundleNames.get(state.bundle)||"Canais";
  }
  function describeRules(channel){
    const r=channel.rules||{}, chips=[];
    if(r.type) chips.push(r.type==="movie"?"FILMES":r.type==="episode"?"SÉRIES":"MÚSICA");
    if(r.yearRange) chips.push((r.yearRange.min||"")+(r.yearRange.max?"–"+r.yearRange.max:"+"));
    if(r.genres){const inc=Array.isArray(r.genres.include)?r.genres.include:[];inc.slice(0,3).forEach(g=>chips.push(g.toUpperCase()));}
    if(r.studios) (Array.isArray(r.studios)?r.studios:[r.studios]).slice(0,2).forEach(v=>chips.push(String(v).toUpperCase()));
    if(r.rewatched) chips.push("REASSISTIR");
    if(r.watchedOnly) chips.push("JÁ ASSISTIDOS");
    if(r.unwatchedOnly) chips.push("NÃO ASSISTIDOS");
    if(r.keywords) chips.push("PALAVRAS-CHAVE");
    if(r.networks) chips.push("EMISSORAS");
    if(r.minItems) chips.push("MÍN. "+r.minItems+" TÍTULOS");
    return chips.slice(0,7);
  }
  function filteredChannels(){
    const q=$("search").value.trim().toLocaleLowerCase("pt-BR");
    return state.config.channels.filter(ch=>{
      const bundle=bundleById.get(ch.id)||ch.category;
      if(state.bundle!=="all"&&bundle!==state.bundle)return false;
      if(state.favoritesOnly&&!state.favorites.has(ch.id))return false;
      if(q&&!String(ch.name).toLocaleLowerCase("pt-BR").includes(q)&&!String(ch.number).includes(q)&&!String(bundleNames.get(bundle)||"").toLocaleLowerCase("pt-BR").includes(q))return false;
      return true;
    }).sort((a,b)=>a.number-b.number);
  }
  function render(){
    const channels=filteredChannels(), grid=$("channel-grid");
    $("result-count").textContent=channels.length+" canais";
    $("empty-state").hidden=channels.length!==0;
    grid.innerHTML=channels.map(ch=>{
      const bundle=bundleById.get(ch.id)||ch.category||"";
      const fav=state.favorites.has(ch.id);
      return '<button class="channel-card" data-id="'+ch.id+'" style="--channel-color:'+escapeHtml(ch.colorHex||"#d99b6b")+'"><span class="card-top"><span class="channel-number">CH '+String(ch.number).padStart(3,"0")+'</span><span class="favorite-mark">'+(fav?"★":"")+'</span></span><span class="channel-name">'+escapeHtml(ch.name)+'</span><span class="channel-meta">'+escapeHtml(bundleNames.get(bundle)||bundle)+'</span></button>';
    }).join("");
    grid.querySelectorAll(".channel-card").forEach(card=>card.addEventListener("click",()=>openChannel(Number(card.dataset.id))));
    const first=grid.querySelector(".channel-card"); if(first&&!document.activeElement?.classList.contains("channel-card"))first.focus();
  }
  function openChannel(id){
    const ch=state.config.channels.find(c=>c.id===id); if(!ch)return;
    state.selected=id;
    $("modal-kicker").textContent=bundleNames.get(bundleById.get(id)||ch.category)||"NOSTALGEX";
    $("modal-number").textContent="CH "+String(ch.number).padStart(3,"0")+"  ·  ID "+ch.id;
    $("modal-name").textContent=ch.name;
    $("modal-description").textContent="Canal "+ch.number+" do catálogo Nostalgex. A programação é montada a partir dos títulos compatíveis encontrados na sua biblioteca.";
    $("modal-rules").innerHTML=describeRules(ch).map(v=>'<span class="rule-chip">'+escapeHtml(v)+'</span>').join("");
    $("modal-favorite").textContent=state.favorites.has(id)?"★ REMOVER DOS FAVORITOS":"☆ ADICIONAR AOS FAVORITOS";
    history.pushState({retrodialModal:true},"","#channel-"+id);
    $("modal").hidden=false; $("modal-close").focus();
  }
  function closeModal(fromPop=false){
    if($("modal").hidden)return;
    const previousId=state.selected;
    $("modal").hidden=true;
    state.selected=null;
    if(!fromPop&&history.state&&history.state.retrodialModal){history.back();return;}
    const card=document.querySelector('.channel-card[data-id="'+previousId+'"]');
    if(card)card.focus();
  }
  window.addEventListener("popstate",()=>{if(!$("modal").hidden)closeModal(true);});
  $("modal-close").addEventListener("click",closeModal);
  $("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal();});
  $("modal-favorite").addEventListener("click",()=>{
    if(state.selected===null)return;
    if(state.favorites.has(state.selected))state.favorites.delete(state.selected);else state.favorites.add(state.selected);
    saveFavorites(); $("modal-favorite").textContent=state.favorites.has(state.selected)?"★ REMOVER DOS FAVORITOS":"☆ ADICIONAR AOS FAVORITOS"; render(); toast("Favoritos atualizados");
  });
  $("open-nostalgex").addEventListener("click",()=>{window.location.href=NOSTALGEX_URL;});
  $("favorites-toggle").addEventListener("click",()=>{state.favoritesOnly=!state.favoritesOnly;state.bundle="all";updateFilters();render();});
  $("search").addEventListener("input",render);
  document.addEventListener("keydown",e=>{
    if(!$("modal").hidden){
      if(e.key==="Escape"||e.key==="Backspace"){e.preventDefault();closeModal();}
      return;
    }
    if(e.key==="Escape"||e.key==="Backspace"){
      if($("search")===document.activeElement){$("search").blur();return;}
      if(state.favoritesOnly){state.favoritesOnly=false;updateFilters();render();return;}
      if(state.bundle!=="all"){state.bundle="all";updateFilters();render();return;}
    }
    if(e.key==="f"||e.key==="F"){state.favoritesOnly=!state.favoritesOnly;state.bundle="all";updateFilters();render();}
  });
  async function init(){
    try{
      const response=await fetch("data/channels.json");
      if(!response.ok)throw new Error("HTTP "+response.status);
      state.config=await response.json();
      $("channel-count").textContent=state.config.channels.length;
      $("bundle-count").textContent=state.config.bundles.length;
      $("config-version").textContent="v"+state.config.version;
      buildFilters();updateFilters();render();
    }catch(error){
      $("section-title").textContent="Não foi possível carregar o catálogo";
      $("channel-grid").innerHTML='<div class="empty-state">Verifique se o pacote contém data/channels.json.</div>';
      console.error("[RetroDial] catalog load failed",error);
    }
  }
  init();
})();