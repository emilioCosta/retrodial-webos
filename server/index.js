const http = require("node:http");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const JELLYFIN_URL = (process.env.JELLYFIN_URL || "http://192.168.1.33:8096").replace(/\/$/, "");
const USERNAME = process.env.JELLYFIN_USERNAME || "";
const PASSWORD = process.env.JELLYFIN_PASSWORD || "";
const VERSION = require("../package.json").version;
function validTz(tz) { try { new Intl.DateTimeFormat("en-CA", { timeZone: tz }); return tz; } catch (e) { return "UTC"; } }
const TZ = validTz(process.env.TZ_NAME || "America/Sao_Paulo");
const APP_NAME = "RetroDial";
const DEVICE_ID = "retrodial-webos";
let auth = null;
let libraryCache = { at: 0, items: [] };
let channelItemCache = new Map();
let channelsCache = { at: 0, channels: [] };
let authPromise = null;

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
  res.end(body);
}
function headers(token) {
  return { "X-Emby-Authorization": 'MediaBrowser Client="' + APP_NAME + '", Device="webOS TV", DeviceId="' + DEVICE_ID + '", Version="' + VERSION + '"', ...(token ? { "X-MediaBrowser-Token": token } : {}) };
}
async function authenticate() {
  if (authPromise) return authPromise;
  authPromise = doAuthenticate().finally(() => { authPromise = null; });
  return authPromise;
}
async function doAuthenticate() {
  if (!USERNAME || !PASSWORD) throw new Error("JELLYFIN_USERNAME e JELLYFIN_PASSWORD não configurados");
  const response = await fetch(JELLYFIN_URL + "/Users/AuthenticateByName", {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ Username: USERNAME, Pw: PASSWORD })
  });
  if (!response.ok) throw new Error("Jellyfin authentication failed (HTTP " + response.status + "). Check JELLYFIN_USERNAME and JELLYFIN_PASSWORD.");
  const data = await response.json();
  auth = { token: data.AccessToken, userId: data.User.Id, userName: data.User.Name, serverId: data.ServerId };
  return auth;
}
async function jellyfin(path, options = {}) {
  if (!auth) await authenticate();
  let response = await fetch(JELLYFIN_URL + path, { ...options, headers: { ...headers(auth.token), ...(options.headers || {}) } });
  if (response.status === 401) {
    await authenticate();
    response = await fetch(JELLYFIN_URL + path, { ...options, headers: { ...headers(auth.token), ...(options.headers || {}) } });
  }
  return response;
}
async function getLibrary(force = false) {
  if (!auth) await authenticate();
  if (!force && Date.now() - libraryCache.at < 5 * 60 * 1000 && libraryCache.items.length) return libraryCache.items;
  const fields = "Genres,Studios,ProductionYear,Overview,RunTimeTicks,ProviderIds,SeriesName,ParentIndexNumber,IndexNumber,DateCreated";
  const response = await jellyfin("/Users/" + encodeURIComponent(auth.userId) + "/Items?Recursive=true&IncludeItemTypes=Movie,Episode&Fields=" + fields + "&EnableTotalRecordCount=true&Limit=10000&SortBy=SortName");
  if (!response.ok) throw new Error("Jellyfin library request failed (HTTP " + response.status + ")");
  const data = await response.json();
  libraryCache = { at: Date.now(), items: data.Items || [] };
  channelsCache = { at: 0, channels: [] };
  return libraryCache.items;
}
const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function buildChannels(items) {
  const movies = items.filter(x => x.Type === "Movie");
  const episodes = items.filter(x => x.Type === "Episode").sort((a,b)=>String(a.SeriesName||"").localeCompare(String(b.SeriesName||""))||(a.ParentIndexNumber||0)-(b.ParentIndexNumber||0)||(a.IndexNumber||0)-(b.IndexNumber||0));
  const allGenres = [...new Set(items.flatMap(x => x.Genres || []))].sort((a,b)=>a.localeCompare(b));
  const definitions = [
    ["all","ACERVO COMPLETO","Tudo que existe na biblioteca",items],
    ["movies","CINEMA","Todos os filmes",movies],
    ["series","SÉRIES","Episódios de todas as séries",episodes],
    ["animation","ANIMAÇÃO","Filmes e episódios de animação",items.filter(x=>(x.Genres||[]).some(g=>/animation|animacao|cartoon|anime|kids|children/i.test(g)))],
    ["anime","ANIME","Conteúdo identificado como anime",items.filter(x=>(x.Genres||[]).some(g=>/anime/i.test(g)) || /anime/i.test((x.Tags||[]).join(" ")))],
    ["comedy","COMÉDIA","Filmes e séries de comédia",items.filter(x=>(x.Genres||[]).some(g=>/comedy|comedia/i.test(g)))],
    ["action","AÇÃO E AVENTURA","Ação, aventura e super-heróis",items.filter(x=>(x.Genres||[]).some(g=>/action|adventure|acao|aventura|superhero/i.test(g)))],
    ["drama","DRAMA","Histórias dramáticas",items.filter(x=>(x.Genres||[]).some(g=>/drama/i.test(g)))],
    ["scifi","FICÇÃO CIENTÍFICA","Sci-fi e fantasia",items.filter(x=>(x.Genres||[]).some(g=>/science fiction|sci-fi|fantasy|fantasia/i.test(g)))],
    ["crime","CRIME E MISTÉRIO","Crime, suspense e mistério",items.filter(x=>(x.Genres||[]).some(g=>/crime|mystery|thriller|policial|suspense/i.test(g)))],
    ["documentary","DOCUMENTÁRIOS","Documentários",items.filter(x=>(x.Genres||[]).some(g=>/documentary|documentario/i.test(g)))],
    ["family","FAMÍLIA","Conteúdo familiar e infantil",items.filter(x=>(x.Genres||[]).some(g=>/family|familia|kids|children|animation/i.test(g)))],
    ...[...new Set(items.map(x=>Number(x.ProductionYear)).filter(y=>y>=1950))].sort((a,b)=>Math.floor(a/10)-Math.floor(b/10)).reduce((acc,y)=>{
      const decade=Math.floor(y/10)*10, id="decade-"+decade;
      if(!acc.some(c=>c[0]===id))acc.push([id,"ANOS "+String(decade).slice(2), "Títulos lançados entre "+decade+" e "+(decade+9),items.filter(x=>Number(x.ProductionYear)>=decade&&Number(x.ProductionYear)<decade+10)]);
      return acc;
    },[])
  ];
  const seen = new Set();
  channelItemCache = new Map();
  return definitions.filter(([id,, ,list])=>list.length>0&&!seen.has(id)&&(seen.add(id),true)).map(([id,name,description,list],index)=>{
    channelItemCache.set(id,list);
    return ({
    id,name,description,number:index+1,count:list.length,
    kind:id.startsWith("decade-")?"decade":id,
    sample:list.slice(0,8).map(itemSummary)
  });
  });
}
function itemSummary(x) {
  return { id:x.Id,name:x.Name,type:x.Type,year:x.ProductionYear||null,series:x.SeriesName||null,genres:x.Genres||[],overview:x.Overview||"",runtimeTicks:x.RunTimeTicks||0,season:x.ParentIndexNumber||null,episode:x.IndexNumber||null };
}
function getChannels(items) {
  if (channelsCache.channels.length && channelsCache.items === items) return channelsCache.channels;
  const channels = buildChannels(items);
  channelsCache = { at: Date.now(), channels, items };
  return channels;
}

// ---------- Linear "live TV" schedule ----------
// Each channel's item list is shuffled once per local day (seed = day + channel id) and laid
// end-to-end in a loop starting at local midnight. The current position derives from the clock,
// so every client sees the same lineup and tuning in joins the programme already in progress.
const scheduleCache = new Map();
const pad2 = n => String(n).padStart(2, "0");
function localClock(ms) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms));
  const g = t => Number(parts.find(p => p.type === t).value);
  const secs = (g("hour") % 24) * 3600 + g("minute") * 60 + g("second");
  return { day: g("year") + "-" + pad2(g("month")) + "-" + pad2(g("day")), dayStart: ms - (secs * 1000 + (ms % 1000)) };
}
function hashSeed(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function itemDuration(x) { const s = x.RunTimeTicks ? x.RunTimeTicks / 1e7 : (x.Type === "Episode" ? 1320 : 6000); return Math.max(60, s); }
function buildDaySchedule(channelId, list, day) {
  const rnd = mulberry32(hashSeed(day + "|" + channelId));
  const arr = [...list].sort((a, b) => (String(a.Id) < String(b.Id) ? -1 : 1));
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  // avoid back-to-back episodes of the same series when possible
  for (let i = 1; i < arr.length; i++) {
    const prev = arr[i - 1].SeriesName;
    if (prev && arr[i].SeriesName === prev) {
      for (let j = i + 1; j < Math.min(arr.length, i + 40); j++) { if (arr[j].SeriesName !== prev) { [arr[i], arr[j]] = [arr[j], arr[i]]; break; } }
    }
  }
  let t = 0;
  const entries = arr.map(x => { const dur = itemDuration(x); const e = { item: x, start: t, dur }; t += dur; return e; });
  return { entries, total: t };
}
function getDaySchedule(channelId, list, day) {
  const key = day + "|" + channelId;
  let sched = scheduleCache.get(key);
  if (!sched) {
    sched = buildDaySchedule(channelId, list, day);
    scheduleCache.set(key, sched);
    for (const k of scheduleCache.keys()) if (!k.startsWith(day + "|")) scheduleCache.delete(k);
  }
  return sched;
}
function windowFor(channelId, list, nowMs, fromMs, hours, limit) {
  const { day, dayStart } = localClock(nowMs);
  const sched = getDaySchedule(channelId, list, day);
  if (!sched.total) return [];
  const sec = Math.max(0, (fromMs - dayStart) / 1000);
  const pos = sec % sched.total;
  let lo = 0, hi = sched.entries.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sched.entries[mid].start <= pos) lo = mid; else hi = mid - 1; }
  let i = lo, startSec = (sec - pos) + sched.entries[lo].start;
  const offset = pos - sched.entries[lo].start;
  const endSec = (fromMs + hours * 3600000 - dayStart) / 1000;
  const out = [];
  while (startSec < endSec && out.length < limit) {
    const e = sched.entries[i];
    out.push({ start: Math.round(dayStart + startSec * 1000), end: Math.round(dayStart + (startSec + e.dur) * 1000), offset: out.length === 0 ? Math.round(offset) : 0, item: e.item });
    startSec += e.dur; i = (i + 1) % sched.entries.length;
  }
  return out;
}
function guideItem(x) { return { id: x.Id, name: x.Name, type: x.Type, year: x.ProductionYear || null, series: x.SeriesName || null, season: x.ParentIndexNumber || null, episode: x.IndexNumber || null }; }
function clampNum(v, def, min, max) { if (v === null || v === undefined || v === "") return def; const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; }
function channelBrief(c) { return { id: c.id, name: c.name, number: c.number, count: c.count, description: c.description }; }

async function route(req,res) {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Range,Content-Type", "Access-Control-Allow-Methods":"GET,OPTIONS" }); return res.end(); }
  if (url.pathname === "/api/health") {
    try { if (!auth) await authenticate(); return json(res,200,{ok:true,service:"RetroDial",jellyfin:"connected",user:auth.userName}); }
    catch(e){return json(res,503,{ok:false,error:e.message});}
  }
  if (url.pathname === "/api/channels") {
    try { if(url.searchParams.get("refresh")==="1")scheduleCache.clear();
    const items=await getLibrary(url.searchParams.get("refresh")==="1"); const channels=getChannels(items); return json(res,200,{channels,libraryCount:items.length,generatedAt:new Date().toISOString(),genres: [...new Set(items.flatMap(x=>x.Genres||[]))].sort()}); }
    catch(e){return json(res,502,{error:e.message});}
  }
  const channelMatch=url.pathname.match(/^\/api\/channels\/([^/]+)\/items$/);
  if (channelMatch) {
    try {
      const items=await getLibrary(), channels=getChannels(items), channel=channels.find(c=>c.id===decodeURIComponent(channelMatch[1]));
      if(!channel)return json(res,404,{error:"Canal não encontrado"});
      const full=channelItemCache.get(channel.id)||[];
      return json(res,200,{channel,items:full.map(itemSummary)});
    }catch(e){return json(res,502,{error:e.message});}
  }
  if (url.pathname === "/api/guide") {
    try {
      const items = await getLibrary(), channels = getChannels(items), now = Date.now();
      const from = clampNum(url.searchParams.get("from"), now, now - 2 * 3600000, now + 12 * 3600000);
      const hours = clampNum(url.searchParams.get("hours"), 3, 1, 12);
      const out = channels.map(c => ({ ...channelBrief(c), entries: windowFor(c.id, channelItemCache.get(c.id) || [], now, from, hours, 16).map(e => ({ start: e.start, end: e.end, item: guideItem(e.item) })) }));
      return json(res, 200, { serverTime: now, timezone: TZ, channels: out });
    } catch (e) { return json(res, 502, { error: e.message }); }
  }
  const scheduleMatch = url.pathname.match(/^\/api\/channels\/([^/]+)\/schedule$/);
  if (scheduleMatch) {
    try {
      const items = await getLibrary(), channels = getChannels(items), now = Date.now();
      const channel = channels.find(c => c.id === decodeURIComponent(scheduleMatch[1]));
      if (!channel) return json(res, 404, { error: "Canal não encontrado" });
      const from = clampNum(url.searchParams.get("from"), now, now - 2 * 3600000, now + 12 * 3600000);
      const hours = clampNum(url.searchParams.get("hours"), 6, 1, 12);
      const entries = windowFor(channel.id, channelItemCache.get(channel.id) || [], now, from, hours, 60).map(e => ({ ...e, item: itemSummary(e.item) }));
      return json(res, 200, { serverTime: now, timezone: TZ, channel: channelBrief(channel), entries });
    } catch (e) { return json(res, 502, { error: e.message }); }
  }
  const imageMatch=url.pathname.match(/^\/api\/image\/([^/]+)$/);
  if (imageMatch) {
    try {
      const itemId=decodeURIComponent(imageMatch[1]);
      const upstream=await jellyfin("/Items/"+encodeURIComponent(itemId)+"/Images/Primary?maxWidth=500&quality=85");
      if(!upstream.ok){res.writeHead(upstream.status,{"Access-Control-Allow-Origin":"*"});return res.end();}
      res.writeHead(200,{"Content-Type":upstream.headers.get("content-type")||"image/jpeg","Cache-Control":"public, max-age=3600","Access-Control-Allow-Origin":"*"});
      return res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch(e){return json(res,502,{error:e.message});}
  }
  const streamMatch=url.pathname.match(/^\/api\/stream\/([^/]+)$/);
  if (streamMatch) {
    try {
      const range=req.headers.range;
      const ctl=new AbortController();res.on("close",()=>ctl.abort());
      const target="/Videos/"+encodeURIComponent(streamMatch[1])+"/stream?static=true&api_key="+encodeURIComponent(auth?.token || (await authenticate()).token);
      const upstream=await jellyfin(target,{headers:range?{Range:range}:{},signal:ctl.signal});
      res.writeHead(upstream.status,{
        "Content-Type":upstream.headers.get("content-type")||"video/mp4",
        "Accept-Ranges":upstream.headers.get("accept-ranges")||"bytes",
        ...(upstream.headers.get("content-length")?{"Content-Length":upstream.headers.get("content-length")}:{ }),
        ...(upstream.headers.get("content-range")?{"Content-Range":upstream.headers.get("content-range")}:{ }),
        "Access-Control-Allow-Origin":"*",
        "Cache-Control":"no-store"
      });
      if(!upstream.body)return res.end();
      const reader=upstream.body.getReader();
      while(true){const {done,value}=await reader.read();if(done)break;if(!res.write(value))await new Promise(resolve=>res.once("drain",resolve));}
      return res.end();
    }catch(e){if(e.name==="AbortError"){return res.end();}if(res.headersSent){return res.end();}return json(res,502,{error:e.message});}
  }
  return json(res,404,{error:"Rota não encontrada"});
}
http.createServer((req,res)=>route(req,res).catch(e=>{console.error(e);if(!res.headersSent)json(res,500,{error:"Erro interno do RetroDial"});else res.end();})).listen(PORT,"0.0.0.0",()=>console.log("RetroDial API listening on "+PORT+"; Jellyfin "+JELLYFIN_URL));
