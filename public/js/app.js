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
           desc:"Cada acierto destruye un asteroide y acerca al astronauta a casa."},
  ninja:  {name:"Ninja contra el kaiju", ico:"s-ninja", color:"blue", lives:3, retry:true, isNew:true,
           desc:"Cada respuesta correcta le quita vida al kaiju. Acierta todas para derrotarlo."},
  samurai:{name:"El samurái y los demonios", ico:"s-samurai", color:"orange", lives:3, retry:true, isNew:true,
           desc:"Cada acierto vence a un demonio. Cada demonio es distinto y más grande que el anterior."}
};

/* ================= nivel del estudiante ================= */
const LEVEL_NAMES = ["", "Inicial", "Básico", "Intermedio", "Avanzado", "Experto"];
const LEVEL_INFO = [
  "",
  "Preguntas directas, lenguaje sencillo y ejemplos de la vida diaria.",
  "Preguntas de comprensión con opciones fáciles de distinguir.",
  "Preguntas para aplicar lo que sabes, con opciones que se parecen.",
  "Casos nuevos y análisis, con opciones engañosas.",
  "Retos de razonamiento con matices y excepciones."
];
const EXAMPLE_LEVEL = 2;              // la ruta de ejemplo está escrita a nivel básico
const lvl = () => S.level || 2;       // sin diagnóstico se asume nivel básico
// Vidas según el nivel: más ayuda al principio, más reto al final.
const livesFor = cfg => cfg.lives ? Math.max(1, cfg.lives + (lvl()<=1 ? 1 : lvl()>=4 ? -1 : 0)) : 0;
const levelPips = l => `<span class="pips" aria-label="Nivel ${l} de 5">${[1,2,3,4,5].map(i=>`<i class="${i<=l?"on":""}"></i>`).join("")}</span>`;

/* Diagnóstico inicial (al iniciar sesión) */
const ONB = [
  {id:"etapa",   q:"¿En qué etapa de estudios estás?", say:"Así sé desde dónde empezar.",
   opts:[["Primaria",1],["Secundaria",2],["Preparatoria",3],["Universidad",3],["Ya trabajo o aprendo por mi cuenta",3]]},
  {id:"actitud", q:"Cuando aprendes algo nuevo, ¿qué te describe mejor?", say:"No hay respuesta mala, ¡solo quiero conocerte!",
   opts:[["Prefiero ir paso a paso, sin prisa",-1],["Voy bien si tengo ejemplos",0],["Me encantan los retos difíciles",1]]},
  {id:"tiempo",  q:"¿Cuánto tiempo al día quieres aprender conmigo?", say:"Con esto pongo tu meta diaria.",
   opts:[["5 minutos",30],["15 minutos",50],["30 minutos o más",80]]},
  {id:"r1", quiz:true, q:"Calentamiento: si 3 cuadernos cuestan $60, ¿cuánto cuestan 5?", say:"Ahora unos mini retos. ¡Tranqui, no cuentan para nada!",
   opts:[["$80",0],["$100",1],["$120",0]]},
  {id:"r2", quiz:true, q:"Raíz es a árbol como cimiento es a…", say:"Piensa en para qué sirve cada cosa.",
   opts:[["Ladrillo",0],["Casa",1],["Tierra",0]]},
  {id:"r3", quiz:true, q:"¿Qué número sigue? 2, 6, 18, 54, …", say:"Busca el patrón.",
   opts:[["108",0],["72",0],["162",1]]},
  {id:"r4", quiz:true, q:"Todos los zirps son blums y ningún blum es verde. Entonces…", say:"El último, ¡y es de lógica pura!",
   opts:[["Algunos zirps son verdes",0],["Ningún zirp es verde",1],["No se puede saber",0]]}
];
let onb = {step:0, answers:{}, picked:-1};

/* Diagnóstico después de cada actividad: el pollo cruza la calle */
const DIAG_STEPS = 5;       // pasos para cruzar
const DIAG_MAX_MISSES = 3;  // sustos permitidos antes de regresar a la banqueta
let diag = null;
const diagCache = {};       // preguntas pedidas por adelantado, por ruta

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
function blank(){ return {xp:0, weekXp:0, week:weekKey(), dayXp:0, day:todayKey(), streak:0, lastPlay:"", routes:[], known:{}, active:"ejemplo",
  level:0, diag:null, goal:50, exOverride:null, levelLog:[]}; }
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
const VB = {castle:"0 0 120 120", rocket:"0 0 120 80", "s-kaiju":"0 0 120 120", "s-chicken":"0 0 60 60"};
// La ruta de ejemplo también se ajusta al nivel: si la IA la regeneró, se usa esa versión.
const exampleRoute = () => S.exOverride ? {...EXAMPLE, ...S.exOverride} : EXAMPLE;
const routeLevel = r => r.level || (r.example ? EXAMPLE_LEVEL : 3);
const allRoutes = () => [...S.routes].sort((a,b)=>b.created-a.created).concat([exampleRoute()]);
const routeById = id => S.routes.find(r=>r.id===id) || exampleRoute();
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
const VIEWS = [...NAV.map(n=>n.id), "jugar", "bienvenida", "pollo"];
let view = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "juegos";
let pendingMode = "frog";   // minijuego elegido en Actividades, antes de escoger ruta
if(view==="jugar" || view==="pollo") view="juegos";
function go(v){ if(location.hash!=="#"+v) location.hash=v; else { view=v; render(); } window.scrollTo(0,0); }
window.addEventListener("hashchange", ()=>{
  const v=location.hash.slice(1); if(!VIEWS.includes(v)) return;
  view=v;
  if(v==="pollo" && !diag){ go("juegos"); return; }
  if(v!=="pollo") diag=null;
  if(game && !((v==="leccion" && game.mode==="quick") || (v==="jugar" && game.mode!=="quick"))) game=null;
  render();
});

function renderNav(){
  const cur = view==="jugar" ? "juegos" : view;
  const dark = isDark(), user = currentUser();
  const themeLabel = dark ? "Modo claro" : "Modo oscuro";
  const themeBtn = cls => `<button class="${cls} theme-btn" data-theme-toggle aria-label="Cambiar a ${themeLabel.toLowerCase()}" title="${themeLabel}">${icon(dark?"i-sun":"i-moon")}<span>${themeLabel}</span></button>`;
  const sOn = window.SFX && SFX.on();
  const soundBtn = cls => `<button class="${cls}" data-sound-toggle aria-pressed="${sOn}" title="${sOn?"Silenciar sonidos":"Activar sonidos"}">${icon(sOn?"i-sound":"i-mute")}<span>${sOn?"Sonido activado":"Sonido apagado"}</span></button>`;
  const acct = cls => `<a class="${cls} acct-btn" href="auth.html" title="${user?esc(user.email):"Iniciar sesión"}">${user?`<span class="avatar-mini">${esc(user.name[0]||"?").toUpperCase()}</span>`:icon("i-user")}<span>${user?esc(user.name):"Iniciar sesión"}</span></a>`;
  $("#sideNav").innerHTML = NAV.map(n=>`<button class="nav-btn" data-go="${n.id}" ${cur===n.id?'aria-current="page"':''}>${icon(n.ico)}<span>${n.label}</span></button>`).join("")
    + `<div class="side-foot">${acct("nav-btn")}${soundBtn("nav-btn")}${themeBtn("nav-btn")}</div>`;
  $("#tabbar").innerHTML = NAV.map(n=>`<button class="tab" data-go="${n.id}" ${cur===n.id?'aria-current="page"':''}>${icon(n.ico)}${n.short}</button>`).join("");
  $("#mobileHead").innerHTML = `<div class="brand">${sym("star")}<span>starly</span></div><div class="mh-actions">${acct("icon-btn")}${soundBtn("icon-btn")}${themeBtn("icon-btn")}</div>`;
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
  const goal=S.goal||50, pct=Math.min(100, Math.round(S.dayXp/goal*100));
  const disc=Object.entries(S.known).sort((a,b)=>b[1]-a[1]);
  const user=currentUser();
  $("#panel").innerHTML = `
    ${user ? `<a class="card acct-card" href="auth.html"><span class="avatar-mini lg">${esc(user.name[0]||"?").toUpperCase()}</span><span style="min-width:0"><b>${esc(user.name)}</b><small class="muted">${esc(user.email)}</small></span></a>`
      : `<div class="card acct-card guest"><div><b>Guarda tu progreso</b><p class="muted" style="margin:2px 0 10px;font-weight:700;font-size:14px">Crea una cuenta o inicia sesión.</p></div><a class="btn blue block" href="auth.html">Iniciar sesión</a></div>`}
    <div class="card level-card">
      <div class="eyebrow">Tu nivel</div>
      <div class="lv-row"><b>${S.level ? LEVEL_NAMES[S.level] : "Sin diagnóstico"}</b>${levelPips(S.level)}</div>
      ${S.level ? `<p class="muted lv-info">${LEVEL_INFO[S.level]}</p><button class="link-btn" data-go="bienvenida">Repetir diagnóstico inicial</button>`
        : `<p class="muted lv-info">Responde unas preguntas y ajusto la dificultad para ti.</p><button class="btn yellow block" data-go="bienvenida">Hacer diagnóstico</button>`}
    </div>
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
    <div class="stat">${icon("i-cup")}#${myRank()}</div><div class="stat"><span class="muted">Hoy</span>${S.dayXp}/${S.goal||50}</div>
    <button class="stat lv-chip" data-go="bienvenida" title="Tu nivel"><span class="muted">Nv</span>${S.level||"?"}</button></div>`;
}
function greet(text){
  return `<div class="greet"><svg class="starly" viewBox="0 0 100 100" aria-hidden="true"><use href="#star"/></svg><div class="bubble">${text}</div></div>`;
}

/* ================= views ================= */
// ¿Ya hizo el diagnóstico inicial? (el de invitado cuenta y se asocia a la cuenta al entrar)
function needsOnboarding(){
  const u=currentUser(); if(!u) return false;
  if(S.diag && (S.diag.email===u.email || !S.diag.email)){ if(!S.diag.email){ S.diag.email=u.email; save(); } return false; }
  return true;
}
function render(){
  if(view!=="bienvenida" && view!=="pollo" && !game && needsOnboarding()){ onb={step:0, answers:{}, picked:-1}; view="bienvenida"; if(location.hash!=="#bienvenida") history.replaceState(null,"","#bienvenida"); }
  renderNav(); renderPanel();
  const v=$("#view");
  if(view==="bienvenida") v.innerHTML = viewOnboarding();
  else if(view==="pollo") v.innerHTML = viewDiag();
  else if(view==="juegos") v.innerHTML = viewActivities();
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
    : mode==="ninja" ? `${sym("s-ninja")}<span class="mini big" style="right:6px">${sym("s-kaiju",VB["s-kaiju"])}</span>`
    : mode==="samurai" ? `${sym("s-samurai")}<span class="mini" style="right:46px;width:24px;height:24px">${sym("s-demon1")}</span><span class="mini" style="right:8px">${sym("s-demon4")}</span>`
    : sym("frog");
  const lives=livesFor(g);
  return `<button class="tile game g-${mode} ${g.color}" data-pickgame="${mode}"><span class="ico">${art}</span><span class="tags">${g.isNew?`<span class="tag new">Nuevo</span>`:""}${lives?`<span class="tag">${lives} vidas</span>`:""}</span><h3>${g.name}</h3><p>${g.desc}</p></button>`;
}
function viewActivities(){
  const hi = S.xp===0 ? "¡Hola! Soy Starly. Te ayudo a aprender algo nuevo usando lo que ya sabes. ¿Qué hacemos hoy?"
    : `¡Hola de nuevo! Llevas ${S.streak} ${S.streak===1?"día":"días"} de racha. ¿Qué hacemos hoy?`;
  return `${topStats()}
  <h1 class="page-title">Elige tu actividad</h1>
  ${greet(hi)}
  <h2 class="section-title">Mini juegos</h2>
  <div class="tiles">${["ninja","samurai","knight","castle","astro","frog"].map(gameTile).join("")}</div>
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
    ${g.lives ? `<div class="note">Tienes ${livesFor(g)} vidas (nivel ${LEVEL_NAMES[lvl()]}). Si fallas una pregunta, pierdes una vida y la pregunta vuelve al final. Si te quedas sin vidas, no sumas XP.</div>`
      : `<div class="note">Necesitas al menos ${PASS_MIN} de 6 respuestas correctas para sumar XP.</div>`}
    <div class="eyebrow">Elige una ruta</div>
    <div class="route-pick">${allRoutes().map(r=>`<button class="route-btn ${r.id===S.active?"current":""}" data-play="${r.id}" data-mode="${mode}"><span>${esc(r.from)} → ${esc(r.to)}<small>${r.example?"Ruta de ejemplo":`Mejor ${r.best}/6`} · nivel ${LEVEL_NAMES[routeLevel(r)]}${regenBusy[r.id]?" · ajustando…":""}</small></span><span aria-hidden="true">›</span></button>`).join("")}</div>
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
      <div><div class="eyebrow">${r.example?"Ruta de ejemplo":"Tu ruta"} · nivel ${LEVEL_NAMES[routeLevel(r)]}</div><h1 class="page-title">${esc(r.from)} → ${esc(r.to)}</h1></div>
      <button class="btn ghost" id="backIdeas">Nueva ruta</button>
    </div>
    ${regenBusy[r.id] ? `<div class="note">Ajustando las preguntas a tu nivel…</div>`
      : routeLevel(r)!==lvl() ? `<div class="note lv-note">Esta ruta está en nivel ${LEVEL_NAMES[routeLevel(r)]} y tú vas en ${LEVEL_NAMES[lvl()]}. <button class="link-btn" data-regen="${r.id}">Ajustar preguntas a mi nivel</button></div>` : ""}
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
    const j = await askServer({from, to, known, steps: STEPS, level: lvl()}, ctl.signal).catch(e=>{ throw (timedOut ? {code:"timeout"} : e); });
    const r = validRoute(j, from, to);
    if(r) r.level = lvl();
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

// Vuelve a generar las preguntas de una ruta al nivel actual (en segundo plano).
const regenBusy = {};
async function regenerateRoute(id, quiet){
  const r = routeById(id), level = lvl();
  if(regenBusy[r.id] || routeLevel(r)===level) return;
  regenBusy[r.id] = true; if(!quiet) render();
  try{
    const j = await askServer({from:r.from, to:r.to, known:[], steps:STEPS, level}, undefined);
    const fresh = validRoute(j, r.from, r.to);
    if(fresh){
      const patch = {a:fresh.a, b:fresh.b, links:fresh.links, questions:fresh.questions, bridges:fresh.bridges.length?fresh.bridges:(r.bridges||[]), level};
      if(r.example) S.exOverride = patch;
      else Object.assign(S.routes.find(x=>x.id===r.id), patch);
      save();
      toast(`Ajusté “${r.from} → ${r.to}” a nivel ${LEVEL_NAMES[level]}`);
    }
  }catch(e){ /* si falla, la ruta se queda como estaba */ }
  delete regenBusy[r.id];
  if(!game || game.done) render();
}

/* ================= motor de juegos ================= */
let game = null;
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function startGame(id, mode){
  mode = GAMES[mode] ? mode : "quick";
  const r=routeById(id), cfg=GAMES[mode]; S.active=r.id; save();
  const lives = livesFor(cfg);
  game = {mode, routeId:r.id, total:r.questions.length, queue:r.questions.map((_,i)=>i),
    progress:0, prev:0, lives, prevLives:lives, maxLives:lives,
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
  astro:  {ok:"¡Láser certero! Asteroide destruido.", bad:"¡Impacto! El escudo se debilita."},
  ninja:  {ok:"¡Shuriken directo! El kaiju pierde vida.", bad:"¡El kaiju contraataca con fuego!"},
  samurai:{ok:"¡Corte limpio! Demonio vencido.", bad:"¡El demonio te golpea!"}
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

// Ninja contra el kaiju: el kaiju tiene una barra de vida; cada acierto le quita un bloque.
function sceneNinja(end){
  const T=game.total, hp=T-game.progress, won=end&&game.won, lost=end&&!game.won;
  const hit = game.fx==="ok" && !end, roar = game.fx==="bad" && !end;
  const bar = Array.from({length:T},(_,i)=>`<i class="${i<hp?"on":""} ${hit&&i===hp?"just":""}"></i>`).join("");
  return `<div class="scene ninja" aria-hidden="true"><div class="moon"></div><div class="city c1"></div><div class="city c2"></div>
    <div class="kaiju-hp"><b>KAIJU</b><span class="hp">${bar}</span></div>
    <div class="kaiju ${won?"down":hit?"hurt":roar?"roar":"idle"}">${sym("s-kaiju",VB["s-kaiju"])}</div>
    ${roar ? `<div class="fire"></div>` : ""}
    ${hit ? `<div class="star-throw">${sym("s-shuriken","0 0 40 40")}</div><div class="star-throw two">${sym("s-shuriken","0 0 40 40")}</div><span class="dmg">-1</span>` : ""}
    <div class="ninja-hero ${lost?"ko":won?"cheer":hit?"dash":roar?"shakey":"idle"}">${sym("s-ninja")}</div>
    <span class="scene-label">${won?"¡Kaiju derrotado!":lost?"El kaiju ganó esta vez":`Vida del kaiju: ${hp} de ${T}`}</span></div>`;
}

// Samurái contra demonios: un demonio distinto por pregunta y cada uno más grande que el anterior.
const demonSize = i => 0.55 + i*0.14;
function sceneSamurai(end){
  const T=game.total, won=end&&game.won, lost=end&&!game.won;
  const cur=game.progress, hit=game.fx==="ok"&&!end, bad=game.fx==="bad"&&!end;
  const demon = (i, cls, extra="") => `<div class="demon ${cls}" style="--s:${demonSize(i)};${extra}">${sym("s-demon"+(i%6+1))}</div>`;
  let out=`<div class="scene samurai" aria-hidden="true"><div class="sunset"></div><div class="mount m1"></div><div class="mount m2"></div><div class="torii"></div>
    <span class="petal p1"></span><span class="petal p2"></span><span class="petal p3"></span><span class="petal p4"></span><div class="ground"></div>`;
  if(hit){ out+=demon(cur-1,"poof"); out+=`<div class="slash"></div>`; if(cur<T) out+=demon(cur,"enter","animation-delay:.6s"); }
  else if(!won && cur<T) out+=demon(cur, bad?"lunge":lost?"gloat":"idle");
  out+=`<div class="next-demons">${Array.from({length:Math.max(0,T-cur-1)},(_,k)=>sym("s-demon"+((cur+1+k)%6+1))).join("")}</div>`;
  out+=`<div class="samurai-hero ${lost?"kneel":won?"cheer":hit?"dash":bad?"shakey":"idle"}">${sym("s-samurai")}</div>`;
  out+=`<span class="scene-label">${won?"¡Todos los demonios vencidos!":lost?"Los demonios resistieron":`Demonio ${Math.min(cur+1,T)} de ${T}`}</span></div>`;
  return out;
}

function scene(end){
  if(game.mode==="ninja") return sceneNinja(end);
  if(game.mode==="samurai") return sceneSamurai(end);
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
      <div class="frog" id="frogActor"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#frog"/></svg></div></div>`;
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
  astro:  w=>w?"¡Aterrizaje en la Tierra!":"El cohete se quedó sin escudo",
  ninja:  w=>w?"¡Derrotaste al kaiju!":"El kaiju sigue en pie",
  samurai:w=>w?"¡Venciste a todos los demonios!":"Los demonios ganaron esta vez"
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
      <div class="diag-cta rise">
        <span class="diag-cta-art">${sym("s-chicken",VB["s-chicken"])}</span>
        <div style="min-width:0;text-align:left"><b>Diagnóstico rápido</b><p>Ayuda al pollo a cruzar la calle. Con tus respuestas ajusto la dificultad de tus actividades.</p></div>
        <button class="btn blue" data-diag="${r.id}" data-mode="${game.mode}">Continuar al diagnóstico</button>
      </div></div>`;
}

function placeFrog(target, animate){
  const pond=$("#pond"), frog=$("#frogActor"); if(!pond||!frog) return;
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
    if(window.SFX){ SFX.play(ok ? "ok" : "bad"); if(ok && (game.mode==="ninja"||game.mode==="samurai")) setTimeout(()=>SFX.play("slash"),120); if(!ok && game.mode==="ninja") SFX.play("roar"); }
    render();
    if(game.mode==="frog"){
      const f=$("#frogActor"); placeFrog(document.querySelector(`[data-pick="${k}"]`), false); f.classList.add(ok?"cheer":"sink");
    }
    const nb=$("#next"); if(nb) nb.focus({preventScroll:true});
    const fb=document.querySelector(".feedback"); if(fb) fb.scrollIntoView({block:"nearest", behavior:"smooth"});
  };
  if(game.mode==="frog"){
    const frog=$("#frogActor"); frog.classList.add("hop"); placeFrog(document.querySelector(`[data-pick="${k}"]`), true);
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
    prefetchDiag(r.id);   // se piden las preguntas del diagnóstico mientras ve su resultado
    if(window.SFX) setTimeout(()=>SFX.play(game && game.won ? "win" : "lose"), 150);
  }
  render(); window.scrollTo({top:0});
}

/* ================= Diagnóstico inicial (al iniciar sesión) ================= */
function viewOnboarding(){
  const u=currentUser(), total=ONB.length;
  if(onb.step===0){
    return `<div class="onb">
      ${greet(`¡Hola${u?", "+esc(u.name):""}! Antes de empezar quiero conocerte un poquito para que tus actividades no sean ni muy fáciles ni muy difíciles.`)}
      <div class="card onb-card pop-in">
        <h1 class="page-title">Conozcámonos</h1>
        <p class="muted onb-sub">Son ${total} preguntas rápidas, como 2 minutos. No es un examen: no hay calificación.</p>
        <ul class="onb-list"><li><b>3</b> sobre ti y cómo te gusta aprender</li><li><b>4</b> mini retos para calentar el cerebro</li></ul>
        <button class="btn block" data-onb-start>¡Vamos!</button>
        ${S.diag ? `<button class="link-btn" data-go="juegos" style="align-self:center">Ahora no</button>` : ""}
      </div></div>`;
  }
  if(onb.step>total) return viewOnboardingResult();
  const i=onb.step, q=ONB[i-1], answered=onb.picked>=0;
  const correct = q.quiz ? q.opts.findIndex(o=>o[1]===1) : -1;
  const cls = k => !answered ? "enter" : q.quiz ? (k===correct?"ok":k===onb.picked?"bad":"fade") : (k===onb.picked?"chosen":"fade");
  return `<div class="onb">
    <div class="onb-top"><span class="onb-count">Pregunta ${i} de ${total}</span>
      <div class="onb-dots">${ONB.map((_,k)=>`<i class="${k<i-1?"done":k===i-1?"cur":""}"></i>`).join("")}</div></div>
    ${greet(esc(q.say))}
    <div class="card onb-card ${answered?"":"qslide"}">
      ${q.quiz?`<span class="chip step-chip">Mini reto</span>`:""}
      <h2 class="qtext">${esc(q.q)}</h2>
      <div class="opts">${q.opts.map(([t],k)=>`<button class="opt ${cls(k)}" style="--i:${k}" data-onb="${k}" ${answered?"disabled":""}><span class="k">${k+1}</span><span>${esc(t)}</span></button>`).join("")}</div>
      ${answered && q.quiz ? `<p class="onb-fb ${onb.picked===correct?"ok":"bad"}">${onb.picked===correct?"¡Muy bien!":`¡Buen intento! Era: ${esc(q.opts[correct][0])}`}</p>` : ""}
    </div></div>`;
}

function pickOnb(k){
  const q=ONB[onb.step-1]; if(!q || onb.picked>=0) return;
  onb.picked=k; onb.answers[q.id]=q.opts[k][1];
  if(q.quiz && window.SFX) SFX.play(q.opts[k][1]===1 ? "ok" : "bad");
  render();
  setTimeout(()=>{ if(view!=="bienvenida") return; onb.step++; onb.picked=-1; if(onb.step>ONB.length) finishOnboarding(); render(); window.scrollTo(0,0); }, q.quiz ? 1300 : 450);
}

function finishOnboarding(){
  const a=onb.answers, u=currentUser();
  const correct=["r1","r2","r3","r4"].reduce((s,k)=>s+(a[k]||0),0);
  const level=Math.max(1, Math.min(5, (a.etapa||2) + (a.actitud||0) + (correct>=4 ? 1 : correct<=1 ? -1 : 0)));
  const prev=S.level;
  S.level=level; S.goal=a.tiempo||50;
  S.diag={email:u?u.email:"", date:Date.now(), level, correct};
  S.levelLog.push({t:Date.now(), level, src:"inicial"}); save();
  onb.result={level, correct, prev};
  if(window.SFX) setTimeout(()=>SFX.play("win"),150);
  // las actividades se ajustan al nivel nuevo
  regenerateRoute("ejemplo", true);
  if(S.active && S.active!=="ejemplo") regenerateRoute(S.active, true);
}

function viewOnboardingResult(){
  if(!onb.result) finishOnboarding();
  const {level, correct}=onb.result;
  return `<div class="onb"><div class="card onb-card onb-result">${confetti()}
    <svg class="starly spin-in" width="110" height="110" aria-hidden="true"><use href="#star"/></svg>
    <div class="eyebrow">Tu punto de partida</div>
    <h1 class="page-title pop-in">Nivel ${level} · ${LEVEL_NAMES[level]}</h1>
    <div class="big-pips">${levelPips(level)}</div>
    <p class="onb-sub" style="font-weight:700">${LEVEL_INFO[level]}</p>
    <p class="muted onb-sub">Acertaste ${correct} de 4 mini retos. Tu meta diaria: ${S.goal} XP.</p>
    <div class="note">Después de cada actividad haré un mini diagnóstico: ayudar a un pollo a cruzar la calle. Si lo logras, tu nivel sube y tus preguntas se vuelven más retadoras.</div>
    <button class="btn block" data-go="juegos">¡Empezar a jugar!</button>
  </div></div>`;
}

/* ================= Diagnóstico tras cada actividad: el pollo cruza la calle ================= */
function fallbackDiagQs(r){
  return shuffle(r.questions.map(q=>({q:q.q, options:q.options, answer:q.answer, why:q.why, level:routeLevel(r)}))).slice(0,7);
}
// Pide las preguntas por adelantado (mientras el estudiante ve su resultado).
function prefetchDiag(id){
  const r=routeById(id), key=r.id+":"+lvl();
  if(diagCache[key]) return diagCache[key];
  const p = (async()=>{
    try{
      const res = await fetch("/api/diagnostico", {method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({from:r.from, to:r.to, level:lvl(), temas:r.b.map(x=>x.t)}), signal:AbortSignal.timeout(45000)});
      if(!res.ok) throw 0;
      const text=await res.text(); if(text.includes("@@ERROR")) throw 0;
      const j=JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}")+1));
      const qs=(j.preguntas||[]).map(q=>({q:String(q.q||""), options:(q.opciones||[]).map(String).slice(0,4), answer:Number(q.correcta)||0, why:String(q.porque||""), level:Number(q.nivel)||lvl()}))
        .filter(q=>q.q && q.options.length>=2 && q.answer<q.options.length);
      if(qs.length<5) throw 0;
      return {qs, ai:true};
    }catch(e){ delete diagCache[key]; return {qs:fallbackDiagQs(r), ai:false}; }
  })();
  diagCache[key]=p;
  return p;
}

async function startDiag(id, mode){
  const r=routeById(id), levelBefore=lvl();
  const my = diag = {status:"loading", routeId:r.id, mode, from:r.from, to:r.to, levelBefore, qs:[], i:0,
    steps:0, prevSteps:0, misses:0, answered:false, picked:-1, ok:false, fx:null, orders:[]};
  game=null;
  if(view==="pollo") render(); else go("pollo");
  const {qs, ai} = await prefetchDiag(r.id);
  delete diagCache[r.id+":"+levelBefore];   // la próxima vez, preguntas nuevas
  if(diag!==my) return;
  Object.assign(diag, {status:"play", qs, ai, orders:qs.map(q=>shuffle(q.options.map((_,k)=>k)))});
  if(view==="pollo") render();
}

function pickDiag(k){
  if(!diag || diag.status!=="play" || diag.answered) return;
  const q=diag.qs[diag.i], ok=k===q.answer;
  diag.answered=true; diag.picked=k; diag.ok=ok; diag.prevSteps=diag.steps;
  if(ok) diag.steps++; else diag.misses++;
  diag.fx = ok ? "ok" : "bad";
  if(window.SFX) SFX.play(ok ? "ok" : "honk");
  render();
  const nb=$("#dnext"); if(nb) nb.focus({preventScroll:true});
  const fb=document.querySelector(".feedback"); if(fb) fb.scrollIntoView({block:"nearest", behavior:"smooth"});
}

function nextDiag(){
  if(!diag || !diag.answered) return;
  diag.i++; diag.answered=false; diag.picked=-1; diag.fx=null; diag.prevSteps=diag.steps;
  if(diag.steps>=DIAG_STEPS || diag.misses>=DIAG_MAX_MISSES || diag.i>=diag.qs.length) finishDiag();
  render(); window.scrollTo({top:0});
}

function finishDiag(){
  const crossed = diag.steps>=DIAG_STEPS, before=diag.levelBefore;
  // Cruzar = demostró la habilidad → sube de nivel. Muy pocos pasos → baja uno para ir más cómodo.
  const after = crossed ? Math.min(5, before+1) : diag.steps<=2 ? Math.max(1, before-1) : before;
  Object.assign(diag, {status:"done", crossed, levelAfter:after});
  S.level=after; S.levelLog.push({t:Date.now(), level:after, src:"pollo", pasos:diag.steps}); save();
  if(window.SFX) setTimeout(()=>SFX.play(crossed ? "win" : "lose"), 300);
  regenerateRoute(diag.routeId, true);   // las preguntas de esa actividad se ajustan al nivel nuevo
}

const LANES = [   // de arriba hacia abajo
  {dir:"r", v:[["s-bus","#1a9fd1",9,0],["s-car","#74c652",9,4.5]]},
  {dir:"l", v:[["s-car","#e53935",6,0],["s-moto","#5f6b74",6,3]]},
  {dir:"r", v:[["s-truck","#ef8c47",11,0],["s-car","#7a5af8",11,5.5]]},
  {dir:"l", v:[["s-taxi","#ebe43f",7,1],["s-car","#0082b2",7,4.5]]},
  {dir:"r", v:[["s-car","#d9488f",8,2],["s-icecream","#ffffff",8,6]]}
];
const VEH_VB = {"s-car":"0 0 100 50","s-taxi":"0 0 100 56","s-truck":"0 0 160 60","s-bus":"0 0 160 60","s-moto":"0 0 60 44","s-icecream":"0 0 120 60"};
const chickBottom = p => p<=0 ? "calc(var(--sw)/2)" : p>=DIAG_STEPS ? `calc(var(--sw)*1.5 + ${DIAG_STEPS}*var(--lane))` : `calc(var(--sw) + ${p}*var(--lane))`;

function sceneStreet(){
  const d=diag, done=d.status==="done";
  const from = done && !d.crossed ? d.steps : d.prevSteps;
  const to = done ? (d.crossed ? DIAG_STEPS : 0) : d.steps;
  const scaredLane = d.fx==="bad" ? LANES.length-1-Math.min(d.steps, LANES.length-1) : -1;
  const chickCls = done ? (d.crossed ? "party" : "flee") : d.fx==="ok" ? "hop" : d.fx==="bad" ? "scared" : "idle";
  return `<div class="street" aria-hidden="true">
    <div class="walk top"><span class="tree t1"></span><span class="tree t2"></span><span class="house"></span><span class="goal-flag">META</span><span class="tree t3"></span></div>
    <div class="road">
      <div class="zebra"></div>
      ${LANES.map((ln,li)=>`<div class="lane ${ln.dir}">${ln.v.map(([s,c,dur,del])=>`<span class="veh" style="--car:${c};animation-duration:${dur}s;animation-delay:-${del}s">${sym(s,VEH_VB[s])}</span>`).join("")}
        ${li===scaredLane ? `<span class="veh zoom ${ln.dir}" style="--car:#e53935">${sym("s-truck",VEH_VB["s-truck"])}</span><span class="honk">¡PIII!</span>` : ""}</div>`).join("")}
    </div>
    <div class="walk bottom"><span class="semaforo"></span><span class="lamp"></span></div>
    <div class="chick ${chickCls}" style="bottom:${chickBottom(from)}" data-bottom="${chickBottom(to)}">${sym("s-chicken",VB["s-chicken"])}${d.fx==="bad"?`<span class="feather f1"></span><span class="feather f2"></span><span class="feather f3"></span>`:""}</div>
    ${done && d.crossed ? `<div class="hearts-fly chick-hearts">${icon("heart")}${icon("heart")}${icon("heart")}</div>` : ""}
    <span class="scene-label">${done ? (d.crossed?"¡Cruzó la calle!":"De vuelta a la banqueta") : `Paso ${d.steps} de ${DIAG_STEPS}`}</span>
  </div>`;
}

function viewDiag(){
  const d=diag; if(!d) return "";
  const top = `<div class="game-top"><button class="close" id="diagQuit" aria-label="Salir del diagnóstico">✕</button>
    <div class="steps-track" aria-label="${d.steps} de ${DIAG_STEPS} pasos">${Array.from({length:DIAG_STEPS},(_,i)=>`<i class="${i<d.steps?"on":""} ${d.fx==="ok"&&i===d.steps-1?"just":""}"></i>`).join("")}</div>
    <span class="scares" title="Sustos">${Array.from({length:DIAG_MAX_MISSES},(_,i)=>`<i class="${i<d.misses?"on":""}"></i>`).join("")}</span></div>`;
  if(d.status==="loading"){
    return `${top}<div class="diag-head"><div class="eyebrow">Diagnóstico · ${esc(d.from)} → ${esc(d.to)}</div><h1 class="page-title">El pollo quiere cruzar</h1></div>
      ${sceneStreet()}
      <div class="card thinking"><svg class="starly" viewBox="0 0 100 100" aria-hidden="true"><use href="#star"/></svg>
        <div style="flex:1;min-width:0"><b>Preparando preguntas a tu nivel…</b><div class="load-bar"><i></i></div></div></div>`;
  }
  if(d.status==="done"){
    const up=d.levelAfter>d.levelBefore, down=d.levelAfter<d.levelBefore;
    return `<div class="diag-head"><div class="eyebrow">Diagnóstico · ${esc(d.from)} → ${esc(d.to)}</div></div>
      ${sceneStreet()}
      <div class="result card ${d.crossed?"":"lost"}">${d.crossed?confetti():""}
        <h1 class="page-title pop-in">${d.crossed?"¡El pollo cruzó la calle!":"El pollo se regresó a la banqueta"}</h1>
        <p class="muted" style="margin:0;font-weight:700">Avanzaste ${d.steps} de ${DIAG_STEPS} pasos con ${d.misses} ${d.misses===1?"susto":"sustos"}.</p>
        <div class="lv-change ${up?"up":down?"down":""}">
          <span>Nivel ${d.levelBefore}</span><span class="arrow-lv">${up?"↑":down?"↓":"="}</span><b>Nivel ${d.levelAfter} · ${LEVEL_NAMES[d.levelAfter]}</b>
        </div>
        ${levelPips(d.levelAfter)}
        <p style="margin:0;font-weight:700">${up?"¡Demostraste la habilidad! Tus próximas preguntas serán más retadoras."
          : down?"Bajamos un nivel para que practiques con más calma. ¡Vas a subir pronto!"
          : "Te mantienes en tu nivel. Sigue practicando para hacer cruzar al pollo."}</p>
        ${regenBusy[d.routeId] ? `<p class="muted" style="margin:0;font-weight:700">Ajustando las preguntas de “${esc(d.from)} → ${esc(d.to)}”…</p>` : ""}
        <div class="actions">
          <button class="btn ghost" data-play="${d.routeId}" data-mode="${d.mode||"quick"}">Repetir actividad</button>
          <button class="btn blue" data-go="juegos">Otra actividad</button>
          <button class="btn" data-go="liga">Ver liga</button>
        </div></div>`;
  }
  const q=d.qs[d.i], order=d.orders[d.i], ok=d.answered&&d.ok;
  const optCls = k => !d.answered ? "enter" : k===q.answer ? "ok" : k===d.picked ? "bad" : "fade";
  return `${top}${sceneStreet()}
    <div class="qcard ${d.answered?"":"enter"}"><div style="display:flex;flex-wrap:wrap;gap:8px"><span class="chip step-chip">Diagnóstico · pregunta ${d.i+1}</span><span class="chip">Nivel ${LEVEL_NAMES[Math.min(5,Math.max(1,q.level))]}</span></div>
      <h2 class="qtext">${esc(q.q)}</h2></div>
    <div class="opts">${order.map((k,pos)=>`<button class="opt ${optCls(k)}" style="--i:${pos}" data-dpick="${k}" ${d.answered?"disabled":""}><span class="k">${pos+1}</span><span>${esc(q.options[k])}</span></button>`).join("")}</div>
    ${d.answered ? `<div class="feedback ${ok?"ok":"bad"}" aria-live="polite"><h3>${ok?"¡Un paso adelante!":"¡Bocinazo! El pollo se asustó."}</h3>
      ${ok?"":`<p>La respuesta correcta era: <b>${esc(q.options[q.answer])}</b></p>`}<p>${esc(q.why)}</p>
      <button class="btn ${ok?"":"orange"} block" id="dnext">Continuar</button></div>`
      : `<p class="muted" style="margin:0;font-weight:700;text-align:center">Acierta ${DIAG_STEPS} para cruzar. Con ${DIAG_MAX_MISSES} sustos, el pollo se regresa.</p>`}`;
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
  // el pollo avanza (o regresa) de su posición anterior a la nueva
  const chick=document.querySelector(".chick[data-bottom]");
  if(chick && chick.style.bottom!==chick.dataset.bottom) requestAnimationFrame(()=>requestAnimationFrame(()=>{ chick.style.bottom=chick.dataset.bottom; }));
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
  if(t.closest("[data-sound-toggle]")){ SFX.toggle(); renderNav(); return; }
  if((b=t.closest("[data-go]"))){ e.preventDefault(); if(b.dataset.go==="juegos"||b.dataset.go==="leccion") game=null; if(b.dataset.go==="bienvenida") onb={step:0, answers:{}, picked:-1}; go(b.dataset.go); return; }
  if(t.closest("[data-onb-start]")){ onb.step=1; render(); window.scrollTo(0,0); return; }
  if((b=t.closest("[data-onb]"))){ pickOnb(+b.dataset.onb); return; }
  if((b=t.closest("[data-diag]"))){ startDiag(b.dataset.diag, b.dataset.mode); return; }
  if((b=t.closest("[data-dpick]"))){ pickDiag(+b.dataset.dpick); return; }
  if(t.closest("#dnext")){ nextDiag(); return; }
  if(t.closest("#diagQuit")){ diag=null; go("juegos"); return; }
  if((b=t.closest("[data-regen]"))){ regenerateRoute(b.dataset.regen); return; }
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
  if(view==="pollo" && diag && diag.status==="play"){
    if(!diag.answered && /^[1-4]$/.test(e.key)){ const p=[...document.querySelectorAll("[data-dpick]")][+e.key-1]; if(p){ e.preventDefault(); pickDiag(+p.dataset.dpick); } }
    else if(diag.answered && e.key==="Enter" && document.activeElement && document.activeElement.id!=="dnext"){ e.preventDefault(); nextDiag(); }
    return;
  }
  if(view==="bienvenida" && onb.step>0 && onb.step<=ONB.length && onb.picked<0 && /^[1-5]$/.test(e.key)){
    const p=[...document.querySelectorAll("[data-onb]")][+e.key-1]; if(p){ e.preventDefault(); pickOnb(+p.dataset.onb); } return;
  }
  if(game && !game.done && (view==="jugar"||view==="leccion")){
    if(!game.answered && /^[1-4]$/.test(e.key)){ const opts=[...document.querySelectorAll("[data-pick]")]; const p=opts[+e.key-1]; if(p){ e.preventDefault(); pick(+p.dataset.pick); } }
    else if(game.answered && e.key==="Enter" && document.activeElement && document.activeElement.id!=="next"){ e.preventDefault(); nextQ(); }
  }
  if(view==="red" && (e.key==="Enter"||e.key===" ")){ const g=e.target.closest && e.target.closest("[data-net]"); if(g){ e.preventDefault(); g.dispatchEvent(new MouseEvent("click",{bubbles:true})); } }
});
document.addEventListener("input", e=>{ if(e.target.id==="fFrom") ideas.from=e.target.value; if(e.target.id==="fTo") ideas.to=e.target.value; });
window.addEventListener("resize", ()=>{ if(game && game.mode==="frog" && !game.answered) placeFrog(null,false); });

render();
