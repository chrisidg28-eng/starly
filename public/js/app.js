/* ================= data ================= */
const STEPS = [
  {n:1, name:"Reconocer",   hint:"identifica qué de lo que ya sabes aplica aquí"},
  {n:2, name:"Descomponer", hint:"separa el principio de su contexto original"},
  {n:3, name:"Comparar",    hint:"decide si es igual, similar o distinto"},
  {n:4, name:"Traducir",    hint:"di el principio con el lenguaje de la nueva disciplina"},
  {n:5, name:"Detectar trampas", hint:"encuentra dónde la analogía falla"},
  {n:6, name:"Aplicar",     hint:"úsalo en un caso nuevo"}
];

const EXAMPLE = {
  id:"ejemplo", example:true, from:"Ajedrez", to:"Negociación", created:0, best:0, plays:0,
  a:[{id:"a1",t:"Controlar el centro"},{id:"a2",t:"Desarrollar piezas pronto"},{id:"a3",t:"Calcular varias jugadas"},{id:"a4",t:"Sacrificar para ganar posición"},{id:"a5",t:"El rival también tiene un plan"}],
  b:[{id:"b1",t:"Tener una buena alternativa"},{id:"b2",t:"Prepararte antes de la mesa"},{id:"b3",t:"Anticipar la respuesta del otro"},{id:"b4",t:"Ceder lo que vale poco para ti"},{id:"b5",t:"Buscar que ganen ambos"}],
  links:[
    {a:"a3",b:"b3",type:"igual",why:"Calcular jugadas es anticipar respuestas. En los dos casos imaginas qué hará el otro antes de mover."},
    {a:"a5",b:"b3",type:"igual",why:"Leer el plan del rival es la base para anticipar su próxima oferta."},
    {a:"a2",b:"b2",type:"similar",why:"Desarrollar piezas es preparar recursos. En negociación esa preparación ocurre casi toda antes de sentarte."},
    {a:"a1",b:"b1",type:"similar",why:"Controlar el centro te da opciones. Una buena alternativa fuera de la mesa también te da margen para decir que no."},
    {a:"a4",b:"b4",type:"similar",why:"Entregas algo para ganar algo mayor. En negociación conviene ceder justo lo que el otro valora más que tú."},
    {a:"a5",b:"b5",type:"distinta",why:"En ajedrez solo gana uno. En negociación el mejor resultado suele ser que ganen ambos; tratar al otro como rival puede romper el acuerdo."}
  ],
  bridges:[],
  questions:[
    {step:1,q:"Vas a negociar tu sueldo. ¿Qué hábito del ajedrez te sirve directamente?",options:["Pensar qué responderá la empresa antes de pedir","Mover rápido para presionar el reloj","Memorizar aperturas de memoria"],answer:0,why:"Calcular jugadas es anticipar respuestas: eso aplica tal cual en una negociación."},
    {step:2,q:"Quita el tablero a “controlar el centro”. ¿Qué principio queda?",options:["Las piezas centrales valen más","Ocupar posiciones que te dan más opciones","Atacar siempre por el medio"],answer:1,why:"La idea de fondo es tener más opciones disponibles que el otro."},
    {step:3,q:"“Sacrificar una pieza” frente a “ceder en una negociación”. ¿Cómo se relacionan?",options:["Igual: siempre pierdes algo","Similar: cedes algo para ganar más, pero eliges qué ceder según lo que valora el otro","Distinta: en negociación nunca se cede"],answer:1,why:"Es similar: la lógica de entregar para ganar se mantiene, pero cambia el criterio para elegir qué entregar."},
    {step:4,q:"¿Cómo se dice “desarrollar piezas pronto” en negociación?",options:["Hacer la primera oferta enseguida","Llegar con datos, límites y alternativas ya preparados","Hablar mucho al principio"],answer:1,why:"Desarrollar es preparar recursos; en negociación eso es la preparación previa."},
    {step:5,q:"¿Dónde falla la analogía ajedrez → negociación?",options:["En que hay que pensar antes de actuar","En que el otro también tiene un plan","En que en negociación ambos pueden ganar a la vez"],answer:2,why:"El ajedrez es suma cero; muchas negociaciones no. Si lo olvidas, puedes destruir valor."},
    {step:6,q:"Compras un coche y el vendedor no baja el precio. ¿Qué haces?",options:["Buscas algo que a él le cueste poco y a ti te sirva, como el mantenimiento incluido","Te vas sin decir nada","Insistes con el mismo precio hasta que ceda"],answer:0,why:"Aplicas “ceder lo que vale poco” al revés: pides lo que para el otro es barato."}
  ]
};

const PLAYERS = [
  ["Valeria Ríos","#5b6cff"],["Diego Montes","#0082b2"],["Lucía Fernández","#c4672a"],["Mateo Herrera","#7a5af8"],
  ["Sofía Navarro","#00648a"],["Andrés Cruz","#2e8b57"],["Camila Ortega","#d9488f"],["Julián Vega","#5f6b74"],
  ["Renata Salas","#3a7f8f"],["Pablo Ibarra","#b85f24"],["Isabel Duarte","#1a9fd1"],["Emilio Paredes","#8a6d1f"],
  ["Martina León","#d97a3a"],["Tomás Aguilar","#4b5d8f"]
];
const LEAGUE_NAME = "Liga Estelar";
const LEAGUE_DIVISION = "División Cometa";

/* ================= tema claro / oscuro ================= */
const THEME_KEY = "starly.theme";
const isDark = () => { const t=document.documentElement.dataset.theme; return t ? t==="dark" : !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches); };
function toggleTheme(){
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
  const m=document.querySelector('meta[name="theme-color"]'); if(m) m.content = next==="dark" ? "#15191c" : "#edebe4";
  renderNav();
}

/* ================= sesión (Supabase, la crea auth.html) ================= */
// Se lee la sesión guardada por supabase-js sin cargar la librería en esta página.
const SUPABASE_SESSION_KEY = "sb-dxltbofpzyffcbqwpwtw-auth-token";
function currentUser(){
  try{
    const raw=localStorage.getItem(SUPABASE_SESSION_KEY); if(!raw) return null;
    const s=JSON.parse(raw), u=s && (s.user || (s.currentSession && s.currentSession.user));
    if(!u || (s.expires_at && s.expires_at*1000 < Date.now() && !s.refresh_token)) return null;
    const name=(u.user_metadata && (u.user_metadata.nombre || u.user_metadata.name)) || (u.email||"").split("@")[0];
    return {name, email:u.email||""};
  }catch(e){ return null; }
}
window.addEventListener("storage", e=>{ if(e.key===SUPABASE_SESSION_KEY) render(); });

/* Minijuegos. lives=0 → sin vidas; retry → la pregunta fallada vuelve al final de la fila. */
const GAMES = {
  quick:  {name:"Lección rápida", ico:"i-bolt", lives:0, retry:false,
           desc:"Seis preguntas, una por paso. Directo al grano."},
  frog:   {name:"Salto de la ranita", ico:"frog", color:"green", lives:0, retry:false,
           desc:"Responde saltando de nenúfar en nenúfar. Si fallas, ¡splash!"},
  knight: {name:"El camino del caballero", ico:"knight", color:"yellow", lives:3, retry:true,
           desc:"Cada acierto vence a un duende y acerca al caballero al castillo para salvar a la princesa."},
  castle: {name:"Defiende el castillo", ico:"castle", color:"orange", lives:3, retry:true,
           desc:"Responde bien para derribar a los invasores antes de que rompan la muralla."},
  astro:  {name:"Regreso a la Tierra", ico:"rocket", color:"blue", lives:3, retry:true,
           desc:"Cada acierto destruye un asteroide y acerca al astronauta a casa."}
};

const TIPS = [
  "Separando los principios de cada disciplina…",
  "Buscando qué ideas funcionan igual en las dos…",
  "Encontrando las trampas…",
  "Preparando seis preguntas…",
  "Ya casi: armando tu mapa…"
];
const PASS_MIN = 4;          // Lección rápida y Ranita: mínimo de aciertos (de 6) para no perder
const CLIENT_TIMEOUT_MS = 70000;  // si el servidor no responde en este tiempo, se cancela

/* ================= state ================= */
const LS_KEY = "starly.v1";
const todayKey = () => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
function weekKey(d=new Date()){ const t=new Date(d.getFullYear(),d.getMonth(),d.getDate()); const day=(t.getDay()+6)%7; t.setDate(t.getDate()-day); return t.getFullYear()+"-"+(t.getMonth()+1)+"-"+t.getDate(); }
function blank(){ return {xp:0, weekXp:0, week:weekKey(), dayXp:0, day:todayKey(), streak:0, lastPlay:"", routes:[], known:{}, active:"ejemplo"}; }
let S = blank();
try{ const raw=localStorage.getItem(LS_KEY); if(raw) S=Object.assign(blank(), JSON.parse(raw)); }catch(e){}
function rollDates(){ if(S.week!==weekKey()){S.week=weekKey();S.weekXp=0;} if(S.day!==todayKey()){S.day=todayKey();S.dayXp=0;} }
rollDates();

// El progreso se guarda en el navegador (localStorage).
function save(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){}
}

// La IA vive en el servidor: api/generar-ruta.py (Vercel) o netlify/edge-functions/generar-ruta.js (Netlify).
const API_URL = "/api/generar-ruta";

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icon = (id,cls="") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const sym = (id,vb="0 0 100 100") => `<svg viewBox="${vb}" aria-hidden="true"><use href="#${id}"/></svg>`;
const VB = {castle:"0 0 120 120", rocket:"0 0 120 80"};
const allRoutes = () => [...S.routes].sort((a,b)=>b.created-a.created).concat([EXAMPLE]);
const routeById = id => S.routes.find(r=>r.id===id) || EXAMPLE;
const reducedMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true, 2200); }
function hashStr(s){ let h=2166136261; for(const c of s){ h^=c.charCodeAt(0); h=Math.imul(h,16777619);} return h>>>0; }
function addXp(n, route){
  rollDates();
  S.xp+=n; S.weekXp+=n; S.dayXp+=n;
  const t=todayKey();
  if(S.lastPlay!==t){
    const y=new Date(); y.setDate(y.getDate()-1);
    const yk=y.getFullYear()+"-"+String(y.getMonth()+1).padStart(2,"0")+"-"+String(y.getDate()).padStart(2,"0");
    S.streak = (S.lastPlay===yk) ? S.streak+1 : 1; S.lastPlay=t;
  }
  if(route && !route.example){
    S.known[route.from] = Math.max(S.known[route.from]||0, 40);
    S.known[route.to] = (S.known[route.to]||0) + n;
  }
  save();
}

/* ================= navigation ================= */
const NAV = [
  {id:"juegos",  label:"Actividades",    short:"Actividades", ico:"i-games"},
  {id:"ideas",   label:"Ideas IA",       short:"Ideas IA",    ico:"i-ideas"},
  {id:"leccion", label:"Lección rápida", short:"Lección",     ico:"i-bolt"},
  {id:"red",     label:"Mi red",         short:"Mi red",      ico:"i-net"},
  {id:"liga",    label:"Liga",           short:"Liga",        ico:"i-cup"}
];
const VIEWS = [...NAV.map(n=>n.id), "jugar"];
let view = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "juegos";
let pendingMode = "frog";   // minijuego elegido en Actividades, antes de escoger ruta
if(view==="jugar") view="juegos";
function go(v){ if(location.hash!=="#"+v) location.hash=v; else { view=v; render(); } window.scrollTo(0,0); }
window.addEventListener("hashchange", ()=>{
  const v=location.hash.slice(1); if(!VIEWS.includes(v)) return;
  view=v;
  if(game && !((v==="leccion" && game.mode==="quick") || (v==="jugar" && game.mode!=="quick"))) game=null;
  render();
});

function renderNav(){
  const cur = view==="jugar" ? "juegos" : view;
  const dark = isDark(), user = currentUser();
  const themeLabel = dark ? "Modo claro" : "Modo oscuro";
  const themeBtn = cls => `<button class="${cls} theme-btn" data-theme-toggle aria-label="Cambiar a ${themeLabel.toLowerCase()}" title="${themeLabel}">${icon(dark?"i-sun":"i-moon")}<span>${themeLabel}</span></button>`;
  const acct = cls => `<a class="${cls} acct-btn" href="auth.html" title="${user?esc(user.email):"Iniciar sesión"}">${user?`<span class="avatar-mini">${esc(user.name[0]||"?").toUpperCase()}</span>`:icon("i-user")}<span>${user?esc(user.name):"Iniciar sesión"}</span></a>`;
  $("#sideNav").innerHTML = NAV.map(n=>`<button class="nav-btn" data-go="${n.id}" ${cur===n.id?'aria-current="page"':''}>${icon(n.ico)}<span>${n.label}</span></button>`).join("")
    + `<div class="side-foot">${acct("nav-btn")}${themeBtn("nav-btn")}</div>`;
  $("#tabbar").innerHTML = NAV.map(n=>`<button class="tab" data-go="${n.id}" ${cur===n.id?'aria-current="page"':''}>${icon(n.ico)}${n.short}</button>`).join("");
  $("#mobileHead").innerHTML = `<div class="brand">${sym("star")}<span>starly</span></div><div class="mh-actions">${acct("icon-btn")}${themeBtn("icon-btn")}</div>`;
}

/* ================= league ================= */
function league(){
  const wk=S.week, day=((new Date().getDay()+6)%7)+1;
  const base=hashStr(wk);
  const picks=[...PLAYERS].sort((x,y)=>hashStr(wk+x[0])-hashStr(wk+y[0])).slice(0,9);
  const rows=picks.map((p,i)=>{ const speed=20+((base>>>i)%7)*9+(hashStr(p[0]+wk)%25); return {name:p[0], color:p[1], xp:Math.round(speed*day*(.8+(hashStr(p[0])%5)/10))}; });
  rows.push({name:"Tú", color:"var(--blue)", xp:S.weekXp, me:true});
  rows.sort((a,b)=>b.xp-a.xp || (a.me?-1:1));
  return rows;
}
const myRank = () => league().findIndex(r=>r.me)+1;

/* ================= side panel ================= */
function renderPanel(){
  const goal=50, pct=Math.min(100, Math.round(S.dayXp/goal*100));
  const disc=Object.entries(S.known).sort((a,b)=>b[1]-a[1]);
  const user=currentUser();
  $("#panel").innerHTML = `
    ${user ? `<a class="card acct-card" href="auth.html"><span class="avatar-mini lg">${esc(user.name[0]||"?").toUpperCase()}</span><span style="min-width:0"><b>${esc(user.name)}</b><small class="muted">${esc(user.email)}</small></span></a>`
      : `<div class="card acct-card guest"><div><b>Guarda tu progreso</b><p class="muted" style="margin:2px 0 10px;font-weight:700;font-size:14px">Crea una cuenta o inicia sesión.</p></div><a class="btn blue block" href="auth.html">Iniciar sesión</a></div>`}
    <div class="statrow card" style="padding:12px">
      <div class="stat" title="Racha de días">${icon("i-fire")}${S.streak}</div>
      <div class="stat" title="XP total">${icon("i-xp")}${S.xp}</div>
      <div class="stat" title="Puesto en la liga">${icon("i-cup")}#${myRank()}</div>
    </div>
    <div class="card">
      <div class="eyebrow">Meta diaria</div>
      <div style="display:flex;justify-content:space-between;font-weight:800;margin-top:6px"><span>${S.dayXp} / ${goal} XP</span><span class="muted">${pct}%</span></div>
      <div class="goal-bar"><i style="width:${pct}%"></i></div>
    </div>
    <div class="card">
      <div class="eyebrow">${LEAGUE_NAME}</div>
      <p style="margin:6px 0 10px;font-weight:700">Vas en el puesto <b>#${myRank()}</b> con ${S.weekXp} XP esta semana.</p>
      <button class="btn ghost block" data-go="liga">Ver liga</button>
    </div>
    <div class="card">
      <div class="eyebrow">Tus disciplinas</div>
      ${disc.length ? `<div class="disc" style="margin-top:8px">${disc.map(([d,x])=>`<span class="chip">${esc(d)} <span class="muted">${x}</span></span>`).join("")}</div>`
        : `<p class="muted" style="margin:6px 0 0;font-weight:700">Crea tu primera ruta en Ideas IA y aparecerán aquí.</p>`}
    </div>`;
}
function topStats(){
  return `<div class="topstats card" style="justify-content:space-around;padding:10px">
    <div class="stat">${icon("i-fire")}${S.streak}</div><div class="stat">${icon("i-xp")}${S.xp}</div>
    <div class="stat">${icon("i-cup")}#${myRank()}</div><div class="stat"><span class="muted">Hoy</span>${S.dayXp}/50</div></div>`;
}
function greet(text){
  return `<div class="greet"><svg class="starly" viewBox="0 0 100 100" aria-hidden="true"><use href="#star"/></svg><div class="bubble">${text}</div></div>`;
}

/* ================= views ================= */
function render(){
  renderNav(); renderPanel();
  const v=$("#view");
  if(view==="juegos") v.innerHTML = viewActivities();
  else if(view==="ideas") v.innerHTML = viewIdeas();
  else if(view==="leccion") v.innerHTML = game && game.mode==="quick" ? viewGame() : viewPicker("quick");
  else if(view==="jugar") v.innerHTML = game ? viewGame() : viewPicker(pendingMode);
  else if(view==="red") v.innerHTML = viewNet();
  else if(view==="liga") v.innerHTML = viewLeague();
  afterRender();
}

/* ---------- Actividades ---------- */
function gameTile(mode){
  const g=GAMES[mode];
  const art = mode==="knight" ? `${sym("knight")}<span class="mini" style="right:10px">${sym("castle",VB.castle)}</span>`
    : mode==="castle" ? `${sym("castle",VB.castle)}<span class="mini" style="right:10px">${sym("goblin")}</span>`
    : mode==="astro" ? `${sym("rocket",VB.rocket)}<span class="mini" style="right:10px">${sym("earth")}</span>`
    : sym("frog");
  return `<button class="tile game g-${mode} ${g.color}" data-pickgame="${mode}"><span class="ico">${art}</span>${g.lives?`<span class="tag">${g.lives} vidas</span>`:""}<h3>${g.name}</h3><p>${g.desc}</p></button>`;
}
function viewActivities(){
  const hi = S.xp===0 ? "¡Hola! Soy Starly. Te ayudo a aprender algo nuevo usando lo que ya sabes. ¿Qué hacemos hoy?"
    : `¡Hola de nuevo! Llevas ${S.streak} ${S.streak===1?"día":"días"} de racha. ¿Qué hacemos hoy?`;
  return `${topStats()}
  <h1 class="page-title">Elige tu actividad</h1>
  ${greet(hi)}
  <h2 class="section-title">Mini juegos</h2>
  <div class="tiles">${["knight","castle","astro","frog"].map(gameTile).join("")}</div>
  <h2 class="section-title">Aprende y explora</h2>
  <div class="tiles">
    <button class="tile" data-go="ideas"><span class="ico">${icon("i-ideas")}</span><span class="tag">Con IA</span><h3>Mi red de ideas</h3><p>Conecta lo que dominas con lo que quieres aprender.</p></button>
    <button class="tile blue" data-go="leccion"><span class="ico">${icon("i-bolt")}</span><h3>Lección rápida</h3><p>Seis preguntas sin juego, directo al grano.</p></button>
    <button class="tile yellow" data-go="red"><span class="ico">${icon("i-net")}</span><h3>Mi red</h3><p>Mira cómo crecen tus disciplinas conectadas.</p></button>
    <button class="tile orange" data-go="liga"><span class="ico">${icon("i-cup")}</span><h3>${LEAGUE_NAME}</h3><p>Suma XP y sube de puesto esta semana.</p></button>
  </div>`;
}

/* ---------- elegir ruta para un juego ---------- */
function viewPicker(mode){
  const g=GAMES[mode];
  const art = mode==="quick" ? icon("i-bolt") : sym(g.ico, VB[g.ico]);
  return `<div class="game-hero">${mode==="quick"?"":`<button class="close" data-go="juegos" aria-label="Volver a actividades">←</button>`}
      <span class="ico">${art}</span><div style="min-width:0"><h1 class="page-title">${g.name}</h1><p class="muted" style="margin:4px 0 0;font-weight:700">${g.desc}</p></div></div>
    ${g.lives ? `<div class="note">Tienes ${g.lives} vidas. Si fallas una pregunta, pierdes una vida y la pregunta vuelve al final. Si te quedas sin vidas, no sumas XP.</div>`
      : `<div class="note">Necesitas al menos ${PASS_MIN} de 6 respuestas correctas para sumar XP.</div>`}
    <div class="eyebrow">Elige una ruta</div>
    <div class="route-pick">${allRoutes().map(r=>`<button class="route-btn ${r.id===S.active?"current":""}" data-play="${r.id}" data-mode="${mode}"><span>${esc(r.from)} → ${esc(r.to)}<small>${r.example?"Ruta de ejemplo · 6 preguntas":`6 preguntas · mejor ${r.best}/6`}</small></span><span aria-hidden="true">›</span></button>`).join("")}</div>
    <a href="#ideas" class="btn blue block">Crear una ruta con IA</a>`;
}

/* ---------- Mi red de ideas ---------- */
let ideas = {from:"", to:"", status:"idle", error:"", routeId:null, sel:-1, ctl:null};
function viewIdeas(){
  const known = Object.keys(S.known);
  if(ideas.status==="loading"){
    return `<h1 class="page-title">Mi red de ideas</h1>
    <div class="card thinking"><svg class="starly" viewBox="0 0 100 100" aria-hidden="true"><use href="#star"/></svg>
      <div style="flex:1;min-width:0"><b>Creando el mapa de ${esc(ideas.from)} → ${esc(ideas.to)}</b>
      <p class="muted tip" id="tip" style="margin:4px 0 0;font-weight:700">${TIPS[0]}</p>
      <div class="load-bar"><i></i></div><small class="muted" id="elapsed" style="font-weight:700">Suele tardar menos de 10 segundos</small></div></div>
    <div><button class="btn ghost" id="stopGen">Detener</button></div>`;
  }
  const r = ideas.routeId ? routeById(ideas.routeId) : null;
  if(r) return viewMap(r);
  return `<h1 class="page-title">Mi red de ideas</h1>
  ${greet(known.length ? `Ya conozco tu camino: ${known.slice(0,3).map(esc).join(", ")}. Lo usaré para conectar lo nuevo.` : "Cuéntame qué ya dominas y qué quieres aprender. Yo busco los puentes entre las dos.")}
  <form class="card" id="ideaForm" style="display:flex;flex-direction:column;gap:16px">
    <div class="form-row">
      <div class="field"><label for="fFrom">Ya domino</label><input class="input" id="fFrom" required maxlength="60" placeholder="Ej.: Fútbol" value="${esc(ideas.from)}"></div>
      <div class="arrow" aria-hidden="true">→</div>
      <div class="field"><label for="fTo">Quiero aprender</label><input class="input" id="fTo" required maxlength="60" placeholder="Ej.: Programación" value="${esc(ideas.to)}"></div>
    </div>
    <div class="suggest"><span class="eyebrow" style="align-self:center">Ideas:</span>
      ${[["Cocina","Química"],["Fútbol","Estrategia de negocio"],["Música","Matemáticas"],["Dibujo","Programación"]].map(([a,b])=>`<button type="button" class="chip" data-pair="${esc(a)}|${esc(b)}">${a} → ${b}</button>`).join("")}
    </div>
    ${ideas.error ? `<div class="note err">${esc(ideas.error)}</div>` : ""}
    <button class="btn block" type="submit">Crear mi mapa</button>
  </form>
  <div class="card">
    <div class="eyebrow">Tus rutas</div>
    <div class="route-pick" style="margin-top:10px">${allRoutes().map(r=>`<button class="route-btn" data-open="${r.id}"><span>${esc(r.from)} → ${esc(r.to)}<small>${r.example?"Ruta de ejemplo":`Mejor puntaje: ${r.best}/6`}</small></span><span aria-hidden="true">›</span></button>`).join("")}</div>
  </div>`;
}

function viewMap(r){
  const sel = r.links[ideas.sel];
  const nameA = id => (r.a.find(p=>p.id===id)||{}).t || "";
  const nameB = id => (r.b.find(p=>p.id===id)||{}).t || "";
  const label = {igual:"Igual", similar:"Similar", distinta:"Distinta"};
  return `<div class="route-head">
      <div><div class="eyebrow">${r.example?"Ruta de ejemplo":"Tu ruta"}</div><h1 class="page-title">${esc(r.from)} → ${esc(r.to)}</h1></div>
      <button class="btn ghost" id="backIdeas">Nueva ruta</button>
    </div>
    <div class="legend"><span><i style="border-color:var(--green)"></i>Igual</span><span><i style="border-color:var(--yellow-d)"></i>Similar</span><span><i style="border-color:var(--orange);border-top-style:dashed"></i>Distinta</span></div>
    <div class="card">
      <div class="map" id="map">
        <svg class="links ${sel?"has-sel":""}" id="linksSvg"></svg>
        <div class="col a"><h4>${esc(r.from)}</h4>${r.a.map(p=>`<div class="node" data-node="${p.id}">${esc(p.t)}</div>`).join("")}</div>
        <div></div>
        <div class="col b"><h4>${esc(r.to)}</h4>${r.b.map(p=>`<div class="node" data-node="${p.id}">${esc(p.t)}</div>`).join("")}</div>
      </div>
    </div>
    ${sel ? `<div class="explain ${sel.type}" aria-live="polite"><b>${label[sel.type]}: ${esc(nameA(sel.a))} ↔ ${esc(nameB(sel.b))}</b><p style="margin:6px 0 0;font-weight:700">${esc(sel.why)}</p></div>`
          : `<div class="note">Toca una línea del mapa para ver por qué esos principios se conectan.</div>`}
    <ul class="linklist">${r.links.map((l,i)=>`<li><button data-link="${i}" aria-pressed="${i===ideas.sel}"><span class="dot ${l.type}"></span>${esc(nameA(l.a))} ↔ ${esc(nameB(l.b))}</button></li>`).join("")}</ul>
    ${r.bridges && r.bridges.length ? `<div class="card"><div class="eyebrow">Conexiones con lo que ya aprendiste</div><ul style="margin:8px 0 0;padding-left:20px;font-weight:700">${r.bridges.map(b=>`<li><b>${esc(b.disciplina)}:</b> ${esc(b.idea)}</li>`).join("")}</ul></div>` : ""}
    <div class="card" style="display:flex;flex-direction:column;gap:14px">
      <div><b style="font-family:var(--display);font-size:20px">Practica esta ruta</b><p class="muted" style="margin:2px 0 0;font-weight:700">Seis preguntas, una por cada paso de la Traducción Cognitiva.</p></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        <button class="btn blue" data-play="${r.id}" data-mode="quick">Lección rápida</button>
        <button class="btn" data-play="${r.id}" data-mode="knight">Caballero</button>
        <button class="btn orange" data-play="${r.id}" data-mode="castle">Castillo</button>
        <button class="btn yellow" data-play="${r.id}" data-mode="astro">Astronauta</button>
      </div>
    </div>`;
}

function drawLinks(){
  const map=$("#map"), svg=$("#linksSvg"); if(!map||!svg) return;
  const r=routeById(ideas.routeId); const box=map.getBoundingClientRect();
  const pos=id=>{ const n=map.querySelector(`[data-node="${id}"]`); if(!n) return null; const b=n.getBoundingClientRect(); return {l:b.left-box.left, r:b.right-box.left, y:b.top-box.top+b.height/2}; };
  let out="";
  r.links.forEach((l,i)=>{
    const A=pos(l.a), B=pos(l.b); if(!A||!B) return;
    const x1=A.r, x2=B.l, mx=(x1+x2)/2;
    const d=`M${x1} ${A.y} C${mx} ${A.y} ${mx} ${B.y} ${x2} ${B.y}`;
    out+=`<path class="ln ${l.type} ${i===ideas.sel?"sel":""}" d="${d}"/><path class="hit" data-link="${i}" d="${d}"><title>${esc(l.type)}</title></path>`;
  });
  svg.innerHTML=out;
  map.querySelectorAll(".node").forEach(n=>{ n.classList.remove("lit","dim"); });
  const sel=r.links[ideas.sel];
  if(sel) map.querySelectorAll(".node").forEach(n=>{ const on=n.dataset.node===sel.a||n.dataset.node===sel.b; n.classList.add(on?"lit":"dim"); });
}

function validRoute(j, from, to){
  if(!j || !Array.isArray(j.a) || !Array.isArray(j.b) || !Array.isArray(j.enlaces) || !Array.isArray(j.preguntas)) return null;
  const a=j.a.slice(0,6).map((p,i)=>({id:String(p.id||"a"+(i+1)), t:String(p.t||"")})).filter(p=>p.t);
  const b=j.b.slice(0,6).map((p,i)=>({id:String(p.id||"b"+(i+1)), t:String(p.t||"")})).filter(p=>p.t);
  const ids=new Set([...a,...b].map(p=>p.id));
  const links=j.enlaces.map(l=>({a:String(l.a), b:String(l.b), type:["igual","similar","distinta"].includes(l.tipo)?l.tipo:"similar", why:String(l.porque||"")})).filter(l=>ids.has(l.a)&&ids.has(l.b)).slice(0,10);
  const questions=j.preguntas.slice(0,6).map((q,i)=>({step:i+1, q:String(q.q||""), options:(q.opciones||[]).map(String).slice(0,4), answer:Number(q.correcta)||0, why:String(q.porque||"")})).filter(q=>q.q && q.options.length>=2 && q.answer<q.options.length);
  if(a.length<2||b.length<2||!links.length||questions.length<6) return null;
  const bridges=Array.isArray(j.puentes)?j.puentes.slice(0,4).map(p=>({disciplina:String(p.disciplina||""), idea:String(p.idea||"")})).filter(p=>p.disciplina&&p.idea):[];
  return {id:"r"+Date.now().toString(36), from, to, created:Date.now(), best:0, plays:0, a, b, links, questions, bridges};
}

// Pide la ruta al servidor. La respuesta llega en streaming (texto) para no chocar
// con los límites de tiempo de Netlify; al final se lee como JSON.
async function askServer(payload, signal){
  let res;
  try{
    res = await fetch(API_URL, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload), signal});
  }catch(e){
    if(e && e.name==="AbortError") throw {code:"cancelled"};
    throw {code:"no_server"};
  }
  if(res.status===404 || res.status===405) throw {code:"no_server"};
  if(!res.ok){
    let code="upstream_error"; try{ code=(await res.json()).code||code; }catch(e){}
    throw {code};
  }
  const reader=res.body.getReader(), dec=new TextDecoder();
  let text="";
  try{
    for(;;){ const {done,value}=await reader.read(); if(done) break; text+=dec.decode(value,{stream:true}); }
  }catch(e){ if(e && e.name==="AbortError") throw {code:"cancelled"}; throw {code:"upstream_error"}; }
  const errAt=text.indexOf("@@ERROR:");
  if(errAt>=0) throw {code:text.slice(errAt+8).trim()||"upstream_error"};
  const a=text.indexOf("{"), b=text.lastIndexOf("}");
  if(a<0||b<=a) throw {code:"bad_json"};
  try{ return JSON.parse(text.slice(a,b+1)); }catch(e){ throw {code:"bad_json"}; }
}

async function generate(from, to){
  // Si ya existe esa ruta, se abre al instante sin llamar a la IA.
  const same = S.routes.find(r=>r.from.toLowerCase()===from.toLowerCase() && r.to.toLowerCase()===to.toLowerCase());
  if(same){ ideas = {...ideas, from, to, status:"idle", error:"", routeId:same.id, sel:-1}; render(); toast("Ya tenías esta ruta guardada"); return; }
  const ctl = new AbortController();
  ideas = {...ideas, from, to, status:"loading", error:"", routeId:null, sel:-1, ctl, started:Date.now()};
  render();
  const known = Object.keys(S.known).filter(d=>d.toLowerCase()!==from.toLowerCase() && d.toLowerCase()!==to.toLowerCase()).slice(0,8);
  let timedOut = false;
  const timer = setTimeout(()=>{ timedOut=true; ctl.abort(); }, CLIENT_TIMEOUT_MS);
  try{
    const j = await askServer({from, to, known, steps: STEPS}, ctl.signal).catch(e=>{ throw (timedOut ? {code:"timeout"} : e); });
    const r = validRoute(j, from, to);
    if(!r){ ideas = {...ideas, status:"idle", error:"La respuesta de la IA vino incompleta. Prueba otra vez o cambia un poco los nombres."}; }
    else { S.routes.push(r); S.active=r.id; S.known[from]=Math.max(S.known[from]||0,40); S.known[to]=S.known[to]||10; save(); ideas = {...ideas, status:"idle", routeId:r.id, sel:-1}; toast("Ruta guardada en Mi red"); }
  }catch(e){
    const code=e && e.code;
    const msg = code==="cancelled" ? ""
      : code==="no_server" ? "No encuentro el servidor de IA. Mientras tanto puedes jugar la ruta de ejemplo."
      : code==="no_key" ? "Falta la clave GEMINI_API_KEY en el servidor, o no es válida."
      : code==="timeout" ? "La IA tardó demasiado en responder. Vuelve a intentarlo en unos segundos."
      : code==="rate_limited" ? "La IA está saturada en este momento. Espera unos segundos y vuelve a intentarlo."
      : code==="refused" ? "La IA no pudo trabajar con esas disciplinas. Prueba con otras."
      : code==="bad_json" ? "La respuesta de la IA vino incompleta. Prueba otra vez."
      : "No se pudo crear el mapa. Inténtalo de nuevo.";
    ideas = {...ideas, status:"idle", error:msg};
  }
  clearTimeout(timer);
  if(view==="ideas") render();
}

/* ================= motor de juegos ================= */
let game = null;
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function startGame(id, mode){
  mode = GAMES[mode] ? mode : "quick";
  const r=routeById(id), cfg=GAMES[mode]; S.active=r.id; save();
  game = {mode, routeId:r.id, total:r.questions.length, queue:r.questions.map((_,i)=>i),
    progress:0, prev:0, lives:cfg.lives, prevLives:cfg.lives, maxLives:cfg.lives,
    answered:false, picked:-1, ok:false, fx:null, done:false, won:false,
    earned:0, correct:0, first:0, mistakes:0, tries:{}, combo:0, lastGain:0,
    orders:r.questions.map(q=>shuffle(q.options.map((_,k)=>k)))};
  const target = mode==="quick" ? "leccion" : "jugar";
  if(view===target){ render(); window.scrollTo(0,0); } else go(target);
}

const FEED = {
  quick:  {ok:"¡Correcto!",                    bad:"Casi. La respuesta era:"},
  frog:   {ok:"¡Salto perfecto!",              bad:"¡Splash! La respuesta era:"},
  knight: {ok:"¡Estocada! El caballero avanza.", bad:"¡Ouch! El duende bloquea el camino."},
  castle: {ok:"¡Flechazo! Invasor derribado.",   bad:"¡La muralla recibió un golpe!"},
  astro:  {ok:"¡Láser certero! Asteroide destruido.", bad:"¡Impacto! El escudo se debilita."}
};

function hud(r){
  const pct=Math.round(game.progress/game.total*100);
  const hearts = game.maxLives ? `<div class="hearts" aria-label="${game.lives} vidas">${Array.from({length:game.maxLives},(_,i)=>{
      const lost=i>=game.lives, just=lost && i<game.prevLives && game.fx==="bad";
      return `<svg class="${lost?"lost":""} ${just?"just":""}" viewBox="0 0 32 32" aria-hidden="true"><use href="#heart"/></svg>`; }).join("")}</div>` : "";
  const combo = game.combo>=2 ? `<span class="combo ${game.fx==="ok"?"bump":""}" aria-label="Racha de ${game.combo} aciertos">${icon("i-fire")}x${game.combo}</span>` : "";
  return `<div class="game-top"><button class="close" id="quit" aria-label="Salir">✕</button>
    <div class="bar ${game.fx==="ok"?"glow":""}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    ${combo}${hearts}<span class="stat xp-stat">${icon("i-xp")}${game.earned}${game.fx==="ok"?`<span class="xp-pop" aria-hidden="true">+${game.lastGain}</span>`:""}</span></div>
    ${game.fx==="bad" ? `<div class="flash bad" aria-hidden="true"></div>` : game.fx==="ok" ? `<div class="flash ok" aria-hidden="true"></div>` : ""}`;
}

/* --- escenas: cada actor se dibuja en su posición anterior (data-from) y se anima a la nueva (data-to) --- */
const actor = (cls, from, to, inner, extra="") => `<div class="actor ${cls}" data-from="${from}" data-to="${to}" style="left:${from}%;${extra}">${inner}</div>`;

function sceneKnight(end){
  const T=game.total, x=i=>6+i*(66/T), gate=78;
  const won=end && game.won;
  let out=`<div class="scene knight" aria-hidden="true"><div class="sun"></div><span class="cloud c1"></span><span class="cloud c2"></span><span class="bird b1"></span><span class="bird b2"></span><div class="hill" style="left:-10%"></div><div class="hill" style="left:45%;height:38%"></div>
    <div class="path"></div>${Array.from({length:T+1},(_,i)=>`<span class="stone" style="left:${x(i)}%"></span>`).join("")}
    <div class="castle">${sym("castle",VB.castle)}</div>`;
  for(let i=1;i<=T;i++){
    if(i>game.progress) out+=actor(`foe ${game.fx==="bad"&&i===game.progress+1?"shakey":"idle"}`, x(i), x(i), sym("goblin"));
    else if(game.fx==="ok" && i===game.progress && !end) out+=actor("foe poof", x(i), x(i), sym("goblin"));
  }
  const heroCls = won ? "walk" : game.fx==="ok" ? "walk" : game.fx==="bad" ? "shakey" : "idle";
  const from = won ? x(T) : x(game.prev), to = won ? gate : x(game.progress);
  out+=actor(`hero ${heroCls}`, from, to, sym("knight"));
  out+= won ? `<div class="princess free">${sym("princess")}</div><div class="hearts-fly">${icon("heart")}${icon("heart")}${icon("heart")}</div>`
            : `<div class="princess">${sym("princess")}</div>`;
  out+=`<span class="scene-label">${won?"¡Princesa a salvo!":`${T-game.progress} duendes en el camino`}</span></div>`;
  return out;
}

function sceneCastle(end){
  const T=game.total, left=T-game.progress, foeX=72;
  const lost=end && !game.won;
  const castleCls = lost ? "fallen" : game.fx==="bad" ? "hit" : "";
  const cracks=[[16,40],[24,62],[12,72]].slice(0, game.maxLives-game.lives)
    .map(([l,b])=>`<svg class="crack" style="left:${l}%;bottom:${b}px" viewBox="0 0 20 20"><path d="M10 0 L7 7 L12 10 L6 20" fill="none" stroke="#5f594d" stroke-width="2"/></svg>`).join("");
  let out=`<div class="scene def" aria-hidden="true"><span class="cloud c1"></span><span class="cloud c2"></span><div class="castle ${castleCls}">${sym("castle",VB.castle)}</div>${cracks}`;
  if(!end && game.fx==="ok"){
    out+=`<div class="shot go" style="left:24%;width:28px"></div>`;
    out+=actor("foe poof", foeX, foeX, sym("goblin"));
    if(left>0) out+=actor("foe enter", foeX, foeX, sym("goblin"), "animation-delay:.55s");
  } else if(left>0){
    out+=actor(`foe ${game.fx==="bad"&&!end?"charge":"idle"}`, lost?40:foeX, lost?40:foeX, sym("goblin"));
  }
  const waiting=Math.max(0, left-1);
  if(waiting) out+=`<div class="queue">${Array.from({length:Math.min(waiting,6)},()=>sym("goblin")).join("")}</div>`;
  out+=`<span class="scene-label">${end ? (game.won?"¡El castillo resiste!":"La muralla cayó") : `${left} ${left===1?"invasor":"invasores"} por derrotar`}</span></div>`;
  return out;
}

function sceneAstro(end){
  const T=game.total, x=i=>8+i*(64/T);
  const won=end && game.won;
  let out=`<div class="scene astro" aria-hidden="true"><span class="twinkle t1"></span><span class="twinkle t2"></span><span class="twinkle t3"></span><span class="twinkle t4"></span><span class="shooting"></span><div class="earth">${sym("earth")}</div>`;
  for(let i=1;i<=T;i++){
    const y = 50 + (i%2 ? -14 : 14);
    if(i>game.progress) out+=actor(`foe ${game.fx==="bad"&&i===game.progress+1?"wobble":""}`, x(i), x(i), sym("asteroid"), `top:${y}%`);
    else if(game.fx==="ok" && i===game.progress && !end) out+=actor("foe poof", x(i), x(i), sym("asteroid"), `top:${y}%`);
  }
  if(game.fx==="ok" && !end){
    const a=x(game.prev)+4, b=x(game.progress);
    out+=`<div class="laser" style="left:${a}%;width:${Math.max(4,b-a)}%"></div>`;
  }
  const heroCls = won ? "land" : game.fx==="bad" ? "shakey hit" : "";
  const from = won ? x(T) : x(game.prev), to = won ? 82 : x(game.progress);
  out+=actor(`hero ${heroCls}`, from, to, sym("rocket",VB.rocket), game.fx==="ok"&&!end ? "transition-delay:.3s" : "");
  out+=`<span class="scene-label">${won?"¡Bienvenido a casa!":`${T-game.progress} asteroides en la ruta`}</span></div>`;
  return out;
}

function scene(end){
  if(game.mode==="knight") return sceneKnight(end);
  if(game.mode==="castle") return sceneCastle(end);
  if(game.mode==="astro") return sceneAstro(end);
  return "";
}

function viewGame(){
  const r=routeById(game.routeId);
  if(game.done) return viewResult(r);
  const qi=game.queue[0], q=r.questions[qi], step=STEPS[(q.step||qi+1)-1]||STEPS[0];
  const order=game.orders[qi], ok=game.answered && game.ok, retry=(game.tries[qi]||0)>0 && !game.answered;
  const keys=`Toca una respuesta o pulsa 1, 2${order.length>2?", 3":""}${order.length>3?", 4":""}.`;
  const optCls = k => !game.answered ? "" : k===q.answer ? "ok" : k===game.picked ? "bad" : "fade";
  const gained = game.tries[qi]===1 ? 10 : 5;
  let body;
  if(game.mode==="frog"){
    body = `<div class="pond" id="pond">
      <div class="pads">${order.map((k,pos)=>`<button class="pad ${optCls(k)} ${game.answered?"":"enter"}" style="--i:${pos}" data-pick="${k}" ${game.answered?"disabled":""}><span class="k">${pos+1}</span>${esc(q.options[k])}</button>`).join("")}</div>
      <div class="home-pad"></div>
      <div class="frog" id="frog"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#frog"/></svg></div></div>`;
  } else {
    body = `${scene(false)}
      <div class="opts">${order.map((k,pos)=>`<button class="opt ${optCls(k)} ${game.answered?"":"enter"}" style="--i:${pos}" data-pick="${k}" ${game.answered?"disabled":""}><span class="k">${pos+1}</span><span>${esc(q.options[k])}</span></button>`).join("")}</div>`;
  }
  const lastLife = game.maxLives && game.lives<=0;
  const last = lastLife || (game.queue.length===1 && (ok || !GAMES[game.mode].retry));
  return `${hud(r)}
    <div class="qcard ${game.answered?"":"enter"}"><div style="display:flex;flex-wrap:wrap;gap:8px"><span class="chip step-chip">Paso ${step.n} · ${step.name}</span>${retry?`<span class="chip retry-chip">Segundo intento</span>`:""}</div>
    <h2 class="qtext">${esc(q.q)}</h2></div>
    ${body}
    ${game.answered ? `<div class="feedback ${ok?"ok":"bad"}" aria-live="polite"><h3>${ok?`${FEED[game.mode].ok} +${gained} XP`:FEED[game.mode].bad}</h3>
      ${ok?"":`<p>${game.mode==="quick"||game.mode==="frog"?"":"La respuesta correcta era: "}<b>${esc(q.options[q.answer])}</b></p>`}<p>${esc(q.why)}</p>
      ${!ok && GAMES[game.mode].retry && !lastLife ? `<p class="muted" style="font-size:14px">Perdiste una vida. Esta pregunta volverá al final.</p>` : ""}
      <button class="btn ${ok?"":"orange"} block" id="next">${last?"Ver resultado":"Continuar"}</button></div>`
      : `<p class="muted" style="margin:0;font-weight:700;text-align:center">${keys}</p>`}`;
}

const RESULT_TITLE = {
  quick:  w=>w?"¡Lección completada!":"Lección no superada",
  frog:   w=>w?"¡Lección completada!":"La ranita no llegó a la orilla",
  knight: w=>w?"¡Salvaste a la princesa!":"El caballero tuvo que retirarse",
  castle: w=>w?"¡El castillo resiste!":"El castillo cayó",
  astro:  w=>w?"¡Aterrizaje en la Tierra!":"El cohete se quedó sin escudo"
};
function confetti(){
  const colors=["#ef8c47","#ebe43f","#74c652","#0082b2"];
  return `<div class="confetti" aria-hidden="true">${Array.from({length:32},(_,i)=>`<i style="left:${(i*31)%100}%;background:${colors[i%4]};animation-delay:${(i%8)*0.12}s"></i>`).join("")}</div>`;
}
function viewResult(r){
  const perfect = game.mistakes===0;
  const simple = game.mode==="quick"||game.mode==="frog";
  const title = perfect && simple ? "¡Lección perfecta!" : RESULT_TITLE[game.mode](game.won);
  const sub = !game.won ? (simple ? `Acertaste ${game.correct} de ${game.total}; necesitas ${PASS_MIN} para sumar XP. Esta vez no sumas puntos.` : "Te quedaste sin vidas, así que esta vez no sumas XP. Repite para afianzar lo que fallaste.")
    : perfect ? "Sin un solo error. +5 XP de bonificación." : `Lo lograste con ${game.mistakes} ${game.mistakes===1?"error":"errores"}.`;
  return `${simple ? "" : scene(true)}
    <div class="result card ${game.won?"":"lost"}">${game.won?confetti():""}
      ${simple ? `<svg width="120" height="120" class="starly ${game.won?"":"sad"}" aria-hidden="true"><use href="#star"/></svg>` : ""}
      <h1 class="page-title pop-in">${title}</h1>
      <p class="muted" style="margin:0;font-weight:700">${esc(r.from)} → ${esc(r.to)} · ${sub}</p>
      <div class="big"><div class="box ${game.won?"":"zero"}"><b>XP ganada</b><span class="countup" data-to="${game.earned}">${game.earned}</span></div><div class="box g"><b>A la primera</b><span>${game.first}/${game.total}</span></div></div>
      <p style="margin:0;font-weight:700">Vas en el puesto <b>#${myRank()}</b> de la ${LEAGUE_NAME}.</p>
      <div class="actions">
        <button class="btn ghost" data-play="${r.id}" data-mode="${game.mode}">Repetir</button>
        <button class="btn blue" data-go="juegos">Otra actividad</button>
        <button class="btn" data-go="liga">Ver liga</button>
      </div></div>`;
}

function placeFrog(target, animate){
  const pond=$("#pond"), frog=$("#frog"); if(!pond||!frog) return;
  const pb=pond.getBoundingClientRect();
  let x=pb.width/2, y=pb.height-38;
  if(target){ const b=target.getBoundingClientRect(); x=b.left-pb.left+b.width/2; y=b.top-pb.top+b.height/2; }
  if(!animate){ frog.style.transition="none"; }
  frog.style.left=x+"px"; frog.style.top=y+"px";
  if(!animate){ frog.offsetWidth; frog.style.transition=""; }
}

function pick(k){
  if(!game || game.answered || game.done) return;
  const r=routeById(game.routeId), qi=game.queue[0], q=r.questions[qi];
  const ok = k===q.answer;
  document.querySelectorAll("[data-pick]").forEach(p=>p.disabled=true);
  const apply = ()=>{
    game.answered=true; game.picked=k; game.ok=ok;
    game.prev=game.progress; game.prevLives=game.lives;
    game.tries[qi]=(game.tries[qi]||0)+1;
    if(ok){ game.correct++; game.progress++; game.combo++; game.lastGain = game.tries[qi]===1 ? 10 : 5; game.earned += game.lastGain; if(game.tries[qi]===1) game.first++; }
    else { game.mistakes++; game.combo=0; game.lastGain=0; if(game.maxLives) game.lives--; }
    game.fx = ok ? "ok" : "bad";
    render();
    if(game.mode==="frog"){
      const f=$("#frog"); placeFrog(document.querySelector(`[data-pick="${k}"]`), false); f.classList.add(ok?"cheer":"sink");
    }
    const nb=$("#next"); if(nb) nb.focus({preventScroll:true});
    const fb=document.querySelector(".feedback"); if(fb) fb.scrollIntoView({block:"nearest", behavior:"smooth"});
  };
  if(game.mode==="frog"){
    const frog=$("#frog"); frog.classList.add("hop"); placeFrog(document.querySelector(`[data-pick="${k}"]`), true);
    setTimeout(apply, 460);
  } else apply();
}

function nextQ(){
  if(!game || !game.answered) return;
  const r=routeById(game.routeId), cfg=GAMES[game.mode];
  const qi=game.queue.shift();
  if(!game.ok && cfg.retry) game.queue.push(qi);
  game.answered=false; game.picked=-1; game.fx=null; game.prev=game.progress; game.prevLives=game.lives;
  const lost = game.maxLives && game.lives<=0;
  if(lost || !game.queue.length){
    // Sin vidas = derrota. En los juegos sin vidas se pierde con menos de PASS_MIN aciertos.
    game.won = !lost && (cfg.lives>0 || game.correct>=PASS_MIN);
    game.prev = game.progress;
    if(game.won){
      if(game.mistakes===0) game.earned+=5;
      addXp(game.earned, r);
    } else {
      game.earned = 0;   // si pierdes, no se suman puntos
    }
    const real=S.routes.find(x=>x.id===r.id); if(real){ if(game.won) real.best=Math.max(real.best||0, game.first); real.plays=(real.plays||0)+1; save(); }
    game.done=true;
  }
  render(); window.scrollTo({top:0});
}

/* ---------- Mi red ---------- */
let netSel=null;
function netData(){
  const own=S.routes.length>0;
  const routes = own ? S.routes : [EXAMPLE, {from:"Negociación",to:"Liderazgo"}, {from:"Ajedrez",to:"Programación"}];
  const known = own ? S.known : {"Ajedrez":60,"Negociación":45,"Liderazgo":15,"Programación":25};
  const names=[...new Set(routes.flatMap(r=>[r.from,r.to]))];
  const edges=routes.map(r=>[r.from,r.to]);
  return {own, names, edges, known};
}
function viewNet(){
  const {own, names, edges, known}=netData();
  const W=640, H=440, cx=W/2, cy=H/2, R=names.length<=2?130:Math.min(160, 80+names.length*12);
  const pos={}; names.forEach((n,i)=>{ const a=-Math.PI/2+i*2*Math.PI/names.length; pos[n]={x:cx+R*Math.cos(a)*1.35, y:cy+R*Math.sin(a)}; });
  if(names.length===1) pos[names[0]]={x:cx,y:cy};
  const colors=["#74c652","#1a9fd1","#ebe43f","#ef8c47","#a98bff","#ff7aa8"];
  const colorOf = n => colors[names.indexOf(n)%colors.length];
  const rad=n=>Math.min(38, 14+Math.sqrt(known[n]||0)*2.2);
  const totalXp = names.reduce((s,n)=>s+(known[n]||0),0);
  const maxXp = Math.max(1, ...names.map(n=>known[n]||0));
  // estrellas de fondo fijas (misma posición en cada render)
  const bg = Array.from({length:46},(_,i)=>{ const h=hashStr("s"+i); return `<circle class="bgstar" cx="${h%W}" cy="${(h>>>10)%H}" r="${(h%3)/2+0.6}" style="animation-delay:${(h%40)/10}s"/>`; }).join("");
  const curve=(a,b)=>{ const p=pos[a], q=pos[b], mx=(p.x+q.x)/2, my=(p.y+q.y)/2; const dx=q.x-p.x, dy=q.y-p.y; const k=.18; return `M${p.x} ${p.y} Q${mx-dy*k} ${my+dx*k} ${q.x} ${q.y}`; };
  const svg=`<svg class="net" viewBox="0 0 ${W} ${H}" role="img" aria-label="Constelación de disciplinas">
    <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${bg}
    ${edges.map(([a,b],i)=>{ const hot=netSel&&(netSel===a||netSel===b); return `<path class="edge ${hot?"hot":""} ${netSel&&!hot?"dim":""}" d="${curve(a,b)}" style="animation-delay:${i*.12}s"/><path class="edge-flow ${hot?"hot":""}" d="${curve(a,b)}"/>`; }).join("")}
    ${names.map((n,i)=>{ const p=pos[n], r=rad(n), c=colorOf(n), sel=netSel===n, dim=netSel&&!sel&&!edges.some(e=>e.includes(n)&&e.includes(netSel));
      const label=n.length>18?n.slice(0,17)+"…":n, lw=label.length*7.6+22;
      return `<g class="nd ${sel?"sel":""} ${dim?"dim":""}" tabindex="0" role="button" data-net="${esc(n)}" aria-label="${esc(n)}, ${known[n]||0} XP" aria-pressed="${sel}">
        <g class="grow" style="transform-origin:${p.x}px ${p.y}px;animation-delay:${i*.08}s">
        <circle class="halo" cx="${p.x}" cy="${p.y}" r="${r+12}" fill="${c}"/>
        <circle class="n" cx="${p.x}" cy="${p.y}" r="${r}" fill="${c}" filter="url(#glow)"/>
        <circle class="core" cx="${p.x-r*.3}" cy="${p.y-r*.3}" r="${r*.28}"/>
        <rect class="pill" x="${p.x-lw/2}" y="${p.y+r+10}" width="${lw}" height="24" rx="12"/>
        <text x="${p.x}" y="${p.y+r+26.5}" text-anchor="middle">${esc(label)}</text></g></g>`; }).join("")}
  </svg>`;
  let info="";
  if(netSel){
    const rel=(own?S.routes:[]).filter(r=>r.from===netSel||r.to===netSel);
    const conn=[...new Set(edges.filter(e=>e.includes(netSel)).map(e=>e[0]===netSel?e[1]:e[0]))];
    info=`<div class="card net-info rise" style="--c:${colorOf(netSel)}"><div class="net-info-head"><span class="net-dot"></span><div style="flex:1;min-width:0"><div class="eyebrow">Disciplina</div><h2>${esc(netSel)}</h2></div><button class="close" data-net="${esc(netSel)}" aria-label="Cerrar">✕</button></div>
      <div class="net-kpis"><div><b>${known[netSel]||0}</b><span>XP</span></div><div><b>${conn.length}</b><span>${conn.length===1?"conexión":"conexiones"}</span></div></div>
      ${conn.length?`<div class="disc">${conn.map(c=>`<button class="chip" data-net="${esc(c)}"><i class="net-dot sm" style="--c:${colorOf(c)}"></i>${esc(c)}</button>`).join("")}</div>`:""}
      ${rel.length?`<div class="route-pick">${rel.map(r=>`<button class="route-btn" data-open="${r.id}"><span>${esc(r.from)} → ${esc(r.to)}<small>Ver mapa de ideas</small></span><span aria-hidden="true">›</span></button>`).join("")}</div>`:""}</div>`;
  }
  const list = [...names].sort((a,b)=>(known[b]||0)-(known[a]||0));
  return `${topStats()}<div><h1 class="page-title">Mi red</h1>
    <p class="muted" style="margin:4px 0 0;font-weight:700">${own ? "Tu constelación de conocimiento. Cada estrella crece con la XP que ganas en ella." : "Así se verá tu red. Crea tu primera ruta y aquí aparecerán tus disciplinas."}</p></div>
  <div class="net-stats">
    <div class="net-stat"><b>${names.length}</b><span>Disciplinas</span></div>
    <div class="net-stat"><b>${edges.length}</b><span>Conexiones</span></div>
    <div class="net-stat"><b>${totalXp}</b><span>XP aprendida</span></div>
  </div>
  <div class="net-card">${own?"":`<span class="chip net-badge">Ejemplo</span>`}${svg}<p class="net-hint">Toca una estrella para ver sus conexiones</p></div>
  ${info}
  <div class="card"><div class="eyebrow">Tus disciplinas</div>
    <ul class="disc-list">${list.map(n=>`<li><button data-net="${esc(n)}" aria-pressed="${netSel===n}"><i class="net-dot sm" style="--c:${colorOf(n)}"></i><span class="dl-name">${esc(n)}</span><span class="dl-bar"><i style="width:${Math.round((known[n]||0)/maxXp*100)}%;background:${colorOf(n)}"></i></span><span class="dl-xp">${known[n]||0} XP</span></button></li>`).join("")}</ul></div>
  ${own?"":`<a href="#ideas" class="btn block">Crear mi primera ruta</a>`}`;
}

/* ---------- Liga ---------- */
function viewLeague(){
  const rows=league(); const n=rows.length;
  const now=new Date(); const end=new Date(now); end.setDate(now.getDate()+(7-((now.getDay()+6)%7))); end.setHours(0,0,0,0);
  const ms=end-now, dLeft=Math.floor(ms/864e5), hLeft=Math.floor(ms%864e5/36e5);
  const top=rows[0].xp||1, me=rows.findIndex(r=>r.me);
  const ini = name => name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  const first = r => r.me ? "Tú" : r.name.split(" ")[0];
  const medal=["gold","silver","bronze"];
  const podium=[1,0,2].map(i=>{ const r=rows[i]; if(!r) return ""; return `<div class="pod p${i+1} ${r.me?"me":""}" style="animation-delay:${[.15,0,.3][i]}s">
      <span class="pod-av ${medal[i]}" style="--av:${r.color}">${esc(r.me?"Tú":ini(r.name))}<i>${i+1}</i></span>
      <b>${esc(first(r))}</b><small>${r.xp} XP</small><div class="pod-base ${medal[i]}"></div></div>`; }).join("");
  const gap = me>0 ? rows[me-1].xp-rows[me].xp+1 : 0;
  return `${topStats()}
    <div class="lg-head">
      <div><div class="lg-kicker">${LEAGUE_DIVISION}</div><h1 class="page-title">${LEAGUE_NAME}</h1></div>
      <div class="lg-timer" title="La liga termina el domingo a medianoche"><span>Termina en</span><b>${dLeft} d ${hLeft} h</b></div>
    </div>
    <div class="lg-me card">
      <div class="lg-me-rank"><span class="lg-me-pos">#${me+1}</span><span class="muted">de ${n}</span></div>
      <p>${me===0 ? "Vas en primer lugar. ¡Defiende tu puesto!" : `Te faltan <b>${gap} XP</b> para superar a ${esc(first(rows[me-1]))}.`}</p>
    </div>
    <div class="podium">${podium}</div>
    <div class="card lg-table">
      <ol class="lg-rows">${rows.map((r,i)=>{
        const zone = i===3?`<li class="lg-zone up" aria-hidden="true"><span>Los 3 primeros ascienden</span></li>`: i===n-2?`<li class="lg-zone down" aria-hidden="true"><span>Zona de descenso</span></li>`:"";
        return `${zone}<li class="lg-row ${r.me?"me":""} ${i<3?"top":""} ${i>=n-2?"low":""}" style="animation-delay:${i*.04}s">
          <span class="lg-pos">${i+1}</span><span class="lg-av" style="--av:${r.color}">${esc(r.me?"Tú":ini(r.name))}</span>
          <span class="lg-name">${esc(r.me?"Tú":r.name)}<span class="lg-bar"><i style="width:${Math.max(2,Math.round(r.xp/top*100))}%"></i></span></span>
          <span class="lg-xp">${r.xp}<small> XP</small></span></li>`;
      }).join("")}</ol></div>
    <button class="btn blue block" data-go="juegos">Jugar y sumar XP</button>`;
}

/* ================= events ================= */
let ro=null, tipTimer=null;
function afterRender(){
  if(ro){ ro.disconnect(); ro=null; }
  clearInterval(tipTimer); tipTimer=null;
  if(view==="ideas" && ideas.routeId && ideas.status!=="loading"){ drawLinks(); ro=new ResizeObserver(()=>drawLinks()); ro.observe($("#map")); }
  if(view==="ideas" && ideas.status==="loading"){
    let i=0, tick=0; tipTimer=setInterval(()=>{
      const t=$("#tip"); if(!t){ clearInterval(tipTimer); return; }
      const s=Math.round((Date.now()-(ideas.started||Date.now()))/1000), el=$("#elapsed");
      if(el && s>=3) el.textContent = s<15 ? `${s} s` : `${s} s · la IA está ocupada, sigo intentando con otro modelo…`;
      if(++tick%2===0){ i=(i+1)%TIPS.length; t.textContent=TIPS[i]; t.classList.remove("tip"); t.offsetWidth; t.classList.add("tip"); }
    }, 1000);
  }
  // cuenta animada de la XP en la pantalla de resultado
  document.querySelectorAll(".countup").forEach(el=>{
    const to=+el.dataset.to||0; if(!to || reducedMotion()) return;
    const t0=performance.now(), dur=900; el.textContent="0";
    const step=now=>{ const k=Math.min(1,(now-t0)/dur); el.textContent=Math.round(to*(1-Math.pow(1-k,3))); if(k<1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  if(game && game.mode==="frog" && !game.done && !game.answered) placeFrog(null,false);
  // anima los actores de la escena de su posición anterior a la nueva
  const movers=[...document.querySelectorAll(".actor[data-to]")].filter(el=>el.dataset.from!==el.dataset.to);
  if(movers.length) requestAnimationFrame(()=>requestAnimationFrame(()=>movers.forEach(el=>el.style.left=el.dataset.to+"%")));
  const f=$("#ideaForm");
  if(f) f.addEventListener("submit", e=>{ e.preventDefault(); const a=$("#fFrom").value.trim(), b=$("#fTo").value.trim(); if(a&&b) generate(a,b); });
}

// Onda al presionar cualquier botón
document.addEventListener("pointerdown", e=>{
  if(reducedMotion()) return;
  const b=e.target.closest("button,.btn"); if(!b || b.disabled) return;
  const r=b.getBoundingClientRect(), d=Math.max(r.width,r.height), s=document.createElement("span");
  s.className="ripple"; s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
  b.appendChild(s); setTimeout(()=>s.remove(), 600);
});

document.addEventListener("click", e=>{
  const t=e.target;
  let b;
  if(t.closest("[data-theme-toggle]")){ toggleTheme(); return; }
  if((b=t.closest("[data-go]"))){ e.preventDefault(); if(b.dataset.go==="juegos"||b.dataset.go==="leccion") game=null; go(b.dataset.go); return; }
  if((b=t.closest("[data-pickgame]"))){ pendingMode=b.dataset.pickgame; game=null; go("jugar"); return; }
  if((b=t.closest("[data-pair]"))){ const [a,c]=b.dataset.pair.split("|"); $("#fFrom").value=a; $("#fTo").value=c; ideas.from=a; ideas.to=c; return; }
  if((b=t.closest("[data-open]"))){ ideas={...ideas, routeId:b.dataset.open, sel:-1, error:""}; go("ideas"); render(); return; }
  if((b=t.closest("[data-link]"))){ const i=+b.dataset.link; ideas.sel = ideas.sel===i?-1:i; render(); return; }
  if((b=t.closest("[data-play]"))){ startGame(b.dataset.play, b.dataset.mode||"quick"); return; }
  if((b=t.closest("[data-pick]"))){ pick(+b.dataset.pick); return; }
  if((b=t.closest("[data-net]"))){ netSel = netSel===b.dataset.net?null:b.dataset.net; render(); return; }
  if(t.closest("#next")){ nextQ(); return; }
  if(t.closest("#quit")){ const m=game&&game.mode; game=null; if(m && m!=="quick") pendingMode=m; render(); return; }
  if(t.closest("#backIdeas")){ ideas={...ideas, routeId:null, sel:-1}; render(); return; }
  if(t.closest("#stopGen")){ ideas.ctl && ideas.ctl.abort(); return; }
});
document.addEventListener("keydown", e=>{
  if(e.target.matches("input,textarea")) return;
  if(game && !game.done && (view==="jugar"||view==="leccion")){
    if(!game.answered && /^[1-4]$/.test(e.key)){ const opts=[...document.querySelectorAll("[data-pick]")]; const p=opts[+e.key-1]; if(p){ e.preventDefault(); pick(+p.dataset.pick); } }
    else if(game.answered && e.key==="Enter" && document.activeElement && document.activeElement.id!=="next"){ e.preventDefault(); nextQ(); }
  }
  if(view==="red" && (e.key==="Enter"||e.key===" ")){ const g=e.target.closest && e.target.closest("[data-net]"); if(g){ e.preventDefault(); g.dispatchEvent(new MouseEvent("click",{bubbles:true})); } }
});
document.addEventListener("input", e=>{ if(e.target.id==="fFrom") ideas.from=e.target.value; if(e.target.id==="fTo") ideas.to=e.target.value; });
window.addEventListener("resize", ()=>{ if(game && game.mode==="frog" && !game.answered) placeFrog(null,false); });

render();
