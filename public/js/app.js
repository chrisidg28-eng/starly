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
  ["Rita Nenúfar","#3db84a"],["Bruno Croac","#2d8cf0"],["Lupe Charca","#f0557d"],["Teo Sapito","#d99a00"],
  ["Sofi Juncos","#8a5cf0"],["Memo Libélula","#14a3a3"],["Ana Lirio","#e0712c"],["Nico Renacuajo","#5b7a99"],
  ["Vera Musgo","#2a8f36"],["Pablo Brinco","#c43a5e"],["Isa Garza","#1d6bc0"],["Gael Estanque","#9a6b00"],
  ["Luz Totora","#b04fd0"],["Omar Salto","#3a7f8f"]
];

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
const sampleChecked = true;
let sampleFn = true;

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icon = (id,cls="") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const allRoutes = () => [...S.routes].sort((a,b)=>b.created-a.created).concat([EXAMPLE]);
const routeById = id => S.routes.find(r=>r.id===id) || EXAMPLE;
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
  {id:"juegos", label:"Juegos", ico:"i-games"},
  {id:"ideas",  label:"Ideas IA", ico:"i-ideas"},
  {id:"rana",   label:"Ranita", ico:"i-frog"},
  {id:"red",    label:"Mi red", ico:"i-net"},
  {id:"liga",   label:"Liga", ico:"i-cup"}
];
let view = NAV.some(n=>"#"+n.id===location.hash) ? location.hash.slice(1) : "juegos";
function go(v){ if(location.hash!=="#"+v) location.hash=v; else { view=v; render(); } window.scrollTo(0,0); }
window.addEventListener("hashchange", ()=>{ const v=location.hash.slice(1); if(NAV.some(n=>n.id===v)){ view=v; if(v!=="rana") game=null; render(); } });

function renderNav(){
  $("#sideNav").innerHTML = NAV.map(n=>`<button class="nav-btn" data-go="${n.id}" ${view===n.id?'aria-current="page"':''}>${icon(n.ico)}<span>${n.label}</span></button>`).join("");
  $("#tabbar").innerHTML = NAV.map(n=>`<button class="tab" data-go="${n.id}" ${view===n.id?'aria-current="page"':''}>${icon(n.ico)}${n.label}</button>`).join("");
}
document.addEventListener("click", e=>{ const b=e.target.closest("[data-go]"); if(b){ e.preventDefault(); go(b.dataset.go); } });

/* ================= league ================= */
function league(){
  const wk=S.week, day=((new Date().getDay()+6)%7)+1;
  const base=hashStr(wk);
  const picks=[...PLAYERS].sort((x,y)=>hashStr(wk+x[0])-hashStr(wk+y[0])).slice(0,9);
  const rows=picks.map((p,i)=>{ const speed=20+((base>>i)%7)*9+(hashStr(p[0]+wk)%25); return {name:p[0], color:p[1], xp:Math.round(speed*day*(.8+(hashStr(p[0])%5)/10))}; });
  rows.push({name:"Tú", color:"var(--blue)", xp:S.weekXp, me:true});
  rows.sort((a,b)=>b.xp-a.xp || (a.me?-1:1));
  return rows;
}
const myRank = () => league().findIndex(r=>r.me)+1;

/* ================= side panel ================= */
function renderPanel(){
  const goal=50, pct=Math.min(100, Math.round(S.dayXp/goal*100));
  const disc=Object.entries(S.known).sort((a,b)=>b[1]-a[1]);
  const html = `
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
      <div class="eyebrow">Liga La Laguna</div>
      <p style="margin:6px 0 10px;font-weight:700">Vas en el puesto <b>#${myRank()}</b> con ${S.weekXp} XP esta semana.</p>
      <button class="btn ghost block" data-go="liga">Ver liga</button>
    </div>
    <div class="card">
      <div class="eyebrow">Tus disciplinas</div>
      ${disc.length ? `<div class="disc" style="margin-top:8px">${disc.map(([d,x])=>`<span class="chip">${esc(d)} <span class="muted">${x}</span></span>`).join("")}</div>`
        : `<p class="muted" style="margin:6px 0 0;font-weight:700">Crea tu primera ruta en Mi red de ideas y aparecerán aquí.</p>`}
    </div>`;
  $("#panel").innerHTML = html;
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
  if(view==="juegos") v.innerHTML = viewGames();
  else if(view==="ideas") v.innerHTML = viewIdeas();
  else if(view==="rana") v.innerHTML = viewFrog();
  else if(view==="red") v.innerHTML = viewNet();
  else if(view==="liga") v.innerHTML = viewLeague();
  afterRender();
}

function viewGames(){
  const hi = S.xp===0 ? "¡Hola! Soy Starly. Te ayudo a aprender algo nuevo usando lo que ya sabes. ¿A qué jugamos hoy?"
    : `¡Hola de nuevo! Llevas ${S.streak} ${S.streak===1?"día":"días"} de racha. ¿A qué jugamos hoy?`;
  return `${topStats()}
  <h1 class="page-title">Elige tu juego</h1>
  ${greet(hi)}
  <div class="tiles">
    <button class="tile" data-go="ideas"><span class="ico">${icon("i-ideas")}</span><span class="tag">Con IA</span><h3>Mi red de ideas</h3><p>Conecta lo que dominas con lo que quieres aprender.</p></button>
    <button class="tile yellow" data-go="rana"><span class="ico">${icon("i-frog")}</span><h3>Salto de la ranita</h3><p>Responde saltando de nenúfar en nenúfar.</p></button>
    <button class="tile blue" data-go="red"><span class="ico">${icon("i-net")}</span><h3>Mi red</h3><p>Mira cómo crecen tus disciplinas conectadas.</p></button>
    <button class="tile pink" data-go="liga"><span class="ico">${icon("i-cup")}</span><h3>Liga La Laguna</h3><p>Suma XP y sube de puesto esta semana.</p></button>
  </div>`;
}

/* ---------- Mi red de ideas ---------- */
let ideas = {from:"", to:"", status:"idle", error:"", routeId:null, sel:-1, ctl:null};
function viewIdeas(){
  const known = Object.keys(S.known);
  if(ideas.status==="loading"){
    return `<h1 class="page-title">Mi red de ideas</h1>
    <div class="card thinking"><svg class="starly" viewBox="0 0 100 100" aria-hidden="true"><use href="#star"/></svg>
      <div style="flex:1;min-width:0"><b>Starly está buscando los principios de ${esc(ideas.from)} y ${esc(ideas.to)}…</b>
      <p class="muted" style="margin:4px 0 0">Puede tardar desde unos segundos hasta un par de minutos si Gemini está saturado.</p></div></div>
    <div><button class="btn ghost" id="stopGen">Detener</button></div>`;
  }
  const r = ideas.routeId ? routeById(ideas.routeId) : null;
  if(r) return viewMap(r);
  const aiOff = sampleChecked && !sampleFn;
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
    ${aiOff ? `<div class="note">La IA no está disponible en esta vista. Puedes abrir la ruta de ejemplo para ver cómo funciona.</div>` : ""}
    <button class="btn block" type="submit" ${aiOff?"disabled":""}>Crear mi mapa</button>
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
    <div class="legend"><span><i style="border-color:var(--green)"></i>Igual</span><span><i style="border-color:var(--yellow)"></i>Similar</span><span><i style="border-color:var(--pink);border-top-style:dashed"></i>Distinta</span></div>
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
    <div class="card" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between">
      <div style="min-width:0;flex:1 1 240px"><b style="font-family:var(--display);font-size:20px">Lección de 6 pasos</b><p class="muted" style="margin:2px 0 0;font-weight:700">Una pregunta por cada paso de la Traducción Cognitiva, jugando con la ranita.</p></div>
      <button class="btn" data-play="${r.id}">Empezar lección</button>
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
  ideas = {...ideas, from, to, status:"loading", error:"", routeId:null, sel:-1, ctl:new AbortController()};
  render();
  const known = Object.keys(S.known).filter(d=>d.toLowerCase()!==from.toLowerCase() && d.toLowerCase()!==to.toLowerCase());
  try{
    const j = await askServer({from, to, known, steps: STEPS}, ideas.ctl.signal);
    const r = validRoute(j, from, to);
    if(!r){ ideas = {...ideas, status:"idle", error:"La respuesta de la IA vino incompleta. Prueba otra vez o cambia un poco los nombres."}; }
    else { S.routes.push(r); S.active=r.id; S.known[from]=Math.max(S.known[from]||0,40); S.known[to]=S.known[to]||10; save(); ideas = {...ideas, status:"idle", routeId:r.id, sel:-1}; toast("Ruta guardada en Mi red"); }
  }catch(e){
    const code=e && e.code;
    const msg = code==="cancelled" ? ""
      : code==="no_server" ? "No encuentro el servidor de IA. Súbela a Netlify o Vercel desde GitHub (no con arrastrar y soltar). Mientras tanto puedes jugar la ruta de ejemplo."
      : code==="no_key" ? "Falta la clave GEMINI_API_KEY en el servidor, o no es válida. Revisa el README."
      : code==="rate_limited" ? "Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentarlo."
      : code==="refused" ? "La IA no pudo trabajar con esas disciplinas. Prueba con otras."
      : code==="bad_json" ? "La respuesta de la IA vino incompleta. Prueba otra vez."
      : "No se pudo crear el mapa. Inténtalo de nuevo.";
    ideas = {...ideas, status:"idle", error:msg};
  }
  if(view==="ideas") render();
}

/* ---------- Salto de la ranita ---------- */
let game = null; // {routeId, i, order, correct, answered, picked, done, earned}
function startGame(id){
  const r=routeById(id); S.active=r.id; save();
  game = {routeId:r.id, i:0, correct:0, answered:false, picked:-1, done:false, earned:0, orders:r.questions.map(q=>shuffle(q.options.map((_,k)=>k)))};
  go("rana"); render();
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function viewFrog(){
  if(!game){
    return `<h1 class="page-title">Salto de la ranita</h1>
    ${greet("Elige una ruta. Cada respuesta correcta es un salto seguro al nenúfar; si fallas, ¡splash!")}
    <div class="route-pick">${allRoutes().map(r=>`<button class="route-btn" data-play="${r.id}"><span>${esc(r.from)} → ${esc(r.to)}<small>${r.example?"Ruta de ejemplo · 6 preguntas":`6 preguntas · mejor ${r.best}/6`}</small></span><svg width="40" height="40" aria-hidden="true"><use href="#i-frog"/></svg></button>`).join("")}</div>
    <a href="#ideas" class="btn blue block" style="text-decoration:none">Crear una ruta con IA</a>`;
  }
  const r=routeById(game.routeId);
  if(game.done){
    const perfect = game.correct===r.questions.length;
    return `<div class="result card">
      <svg width="120" height="120" class="starly" aria-hidden="true"><use href="#star"/></svg>
      <h1 class="page-title">${perfect?"¡Lección perfecta!":game.correct>=4?"¡Muy bien!":"¡Lección completada!"}</h1>
      <p class="muted" style="margin:0;font-weight:700">${esc(r.from)} → ${esc(r.to)}</p>
      <div class="big"><div class="box"><b>XP ganada</b><span>${game.earned}</span></div><div class="box g"><b>Aciertos</b><span>${game.correct}/${r.questions.length}</span></div></div>
      <p style="margin:0;font-weight:700">Vas en el puesto <b>#${myRank()}</b> de la Liga La Laguna.</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
        <button class="btn ghost" data-play="${r.id}">Repetir</button><button class="btn" data-go="liga">Ver liga</button>
      </div></div>`;
  }
  const q=r.questions[game.i], step=STEPS[(q.step||game.i+1)-1]||STEPS[game.i];
  const order=game.orders[game.i];
  const pct=Math.round((game.i+(game.answered?1:0))/r.questions.length*100);
  const ok = game.answered && game.picked===q.answer;
  return `<div class="game-top"><button class="close" id="quit" aria-label="Salir de la lección">✕</button><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><span class="stat">${icon("i-xp")}${game.earned}</span></div>
    <span class="chip step-chip">Paso ${step.n} · ${step.name}</span>
    <h2 class="qtext">${esc(q.q)}</h2>
    <div class="pond" id="pond">
      <div class="pads">${order.map((k,pos)=>{
        let cls=""; if(game.answered){ if(k===q.answer) cls="ok"; else if(k===game.picked) cls="bad"; else cls="fade"; }
        return `<button class="pad ${cls}" data-pick="${k}" ${game.answered?"disabled":""}><span class="k">${pos+1}</span>${esc(q.options[k])}</button>`; }).join("")}</div>
      <div class="home-pad"></div>
      <div class="frog" id="frog"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#frog"/></svg></div>
    </div>
    ${game.answered ? `<div class="feedback ${ok?"ok":"bad"}" aria-live="polite"><h3>${ok?"¡Salto perfecto! +10 XP":"¡Splash! La respuesta era:"}</h3>${ok?"":`<p>${esc(q.options[q.answer])}</p>`}<p>${esc(q.why)}</p>
      <button class="btn ${ok?"":"pink"} block" id="next">${game.i+1<r.questions.length?"Continuar":"Terminar"}</button></div>`
      : `<p class="muted" style="margin:0;font-weight:700;text-align:center">Toca un nenúfar o pulsa 1, 2${order.length>2?", 3":""}${order.length>3?", 4":""}.</p>`}`;
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
  if(!game || game.answered) return;
  const r=routeById(game.routeId), q=r.questions[game.i];
  const pad=document.querySelector(`[data-pick="${k}"]`), frog=$("#frog");
  document.querySelectorAll(".pad").forEach(p=>p.disabled=true);
  frog.classList.add("hop"); placeFrog(pad, true);
  setTimeout(()=>{
    game.answered=true; game.picked=k;
    if(k===q.answer){ game.correct++; game.earned+=10; }
    render();
    const f=$("#frog"), target=document.querySelector(`[data-pick="${k}"]`);
    placeFrog(target,false);
    f.classList.add(k===q.answer?"cheer":"sink");
    const nb=$("#next"); if(nb) nb.focus({preventScroll:true});
    const fb=document.querySelector(".feedback"); if(fb) fb.scrollIntoView({block:"nearest", behavior:"smooth"});
  }, 460);
}
function nextQ(){
  const r=routeById(game.routeId);
  if(game.i+1<r.questions.length){ game.i++; game.answered=false; game.picked=-1; render(); window.scrollTo({top:0}); return; }
  if(game.correct===r.questions.length) game.earned+=5;
  addXp(game.earned, r);
  const real=S.routes.find(x=>x.id===r.id); if(real){ real.best=Math.max(real.best||0, game.correct); real.plays=(real.plays||0)+1; save(); }
  game.done=true; render(); window.scrollTo({top:0});
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
  const W=600, H=440, cx=W/2, cy=H/2, R=names.length<=2?120:Math.min(165, 70+names.length*14);
  const pos={}; names.forEach((n,i)=>{ const a=-Math.PI/2+i*2*Math.PI/names.length; pos[n]={x:cx+R*Math.cos(a)*1.25, y:cy+R*Math.sin(a)}; });
  if(names.length===1) pos[names[0]]={x:cx,y:cy};
  const colors=["var(--green)","var(--blue)","var(--yellow)","var(--pink)"];
  const rad=n=>Math.min(46, 16+Math.sqrt(known[n]||0)*2.6);
  const svg=`<svg class="net" viewBox="0 0 ${W} ${H}" role="img" aria-label="Red de disciplinas">
    ${edges.map(([a,b])=>`<line class="edge ${netSel&&(netSel===a||netSel===b)?"hot":""}" x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}"/>`).join("")}
    ${names.map((n,i)=>{ const p=pos[n], r=rad(n), c=colors[i%colors.length];
      return `<g class="nd" tabindex="0" role="button" data-net="${esc(n)}" aria-label="${esc(n)}"><g style="transform-origin:${p.x}px ${p.y}px" class="grow">
        <circle class="n" cx="${p.x}" cy="${p.y}" r="${r}" fill="${c}" stroke="${netSel===n?"var(--ink)":"var(--bg)"}"/>
        <text x="${p.x}" y="${p.y+r+20}" text-anchor="middle">${esc(n.length>18?n.slice(0,17)+"…":n)}</text></g></g>`; }).join("")}
  </svg>`;
  let info="";
  if(netSel){
    const rel=(own?S.routes:[]).filter(r=>r.from===netSel||r.to===netSel);
    info=`<div class="card"><div class="eyebrow">Disciplina</div><h2 style="font-size:26px">${esc(netSel)}</h2>
      <p style="margin:4px 0 10px;font-weight:700">${known[netSel]||0} XP aprendidos · ${edges.filter(e=>e.includes(netSel)).length} conexiones</p>
      ${rel.length?`<div class="route-pick">${rel.map(r=>`<button class="route-btn" data-open="${r.id}"><span>${esc(r.from)} → ${esc(r.to)}<small>Ver mapa de ideas</small></span><span aria-hidden="true">›</span></button>`).join("")}</div>`:""}</div>`;
  }
  return `${topStats()}<h1 class="page-title">Mi red</h1>
  ${greet(own ? `Tienes ${names.length} disciplinas conectadas. Cada nodo crece con la XP que ganas en él.` : "Así se verá tu red. Este es un ejemplo: crea tu primera ruta y aquí aparecerán tus disciplinas.")}
  <div class="card" style="padding:10px;position:relative">${own?"":`<span class="chip" style="position:absolute;top:12px;left:12px">Ejemplo</span>`}${svg}</div>
  ${info}
  ${own?"":`<a href="#ideas" class="btn block" style="text-decoration:none">Crear mi primera ruta</a>`}`;
}

/* ---------- Liga ---------- */
function viewLeague(){
  const rows=league(); const n=rows.length;
  const now=new Date(); const left=7-((now.getDay()+6)%7);
  return `${topStats()}<div class="league-head"><svg aria-hidden="true"><use href="#i-cup"/></svg><div><h1 class="page-title">Liga La Laguna</h1>
    <p class="muted" style="margin:2px 0 0;font-weight:700">Los 3 primeros suben de liga. Quedan ${left} ${left===1?"día":"días"}.</p></div></div>
    <div class="card" style="padding:10px">
    <ol class="rows">${rows.map((r,i)=>{
      const cls=(i<3?"up":i>=n-2?"down":"")+(r.me?" me":"");
      const zone = i===3?`<li class="zone up" aria-hidden="true">Zona de ascenso ↑</li>`: i===n-2?`<li class="zone down" aria-hidden="true">Zona de descenso ↓</li>`:"";
      return `${zone}<li class="row ${cls}"><span class="pos">${i+1}</span><span class="avatar" style="background:${r.color}">${esc(r.name[0])}</span><span>${esc(r.name)}${r.me?' <span class="muted">(tú)</span>':""}</span><span class="xp">${r.xp} XP</span></li>`;
    }).join("")}</ol></div>
    <button class="btn block" data-go="rana">Jugar y sumar XP</button>`;
}

/* ================= events ================= */
let ro=null;
function afterRender(){
  if(ro){ ro.disconnect(); ro=null; }
  if(view==="ideas" && ideas.routeId){ drawLinks(); ro=new ResizeObserver(()=>drawLinks()); ro.observe($("#map")); }
  if(view==="rana" && game && !game.done && !game.answered){ placeFrog(null,false); }
  const f=$("#ideaForm");
  if(f) f.addEventListener("submit", e=>{ e.preventDefault(); const a=$("#fFrom").value.trim(), b=$("#fTo").value.trim(); if(a&&b&&sampleFn) generate(a,b); });
}
document.addEventListener("click", e=>{
  const t=e.target;
  let b;
  if((b=t.closest("[data-pair]"))){ const [a,c]=b.dataset.pair.split("|"); $("#fFrom").value=a; $("#fTo").value=c; ideas.from=a; ideas.to=c; return; }
  if((b=t.closest("[data-open]"))){ ideas={...ideas, routeId:b.dataset.open, sel:-1, error:""}; go("ideas"); render(); return; }
  if((b=t.closest("[data-link]"))){ const i=+b.dataset.link; ideas.sel = ideas.sel===i?-1:i; render(); return; }
  if((b=t.closest("[data-play]"))){ startGame(b.dataset.play); return; }
  if((b=t.closest("[data-pick]"))){ pick(+b.dataset.pick); return; }
  if((b=t.closest("[data-net]"))){ netSel = netSel===b.dataset.net?null:b.dataset.net; render(); return; }
  if(t.closest("#next")){ nextQ(); return; }
  if(t.closest("#quit")){ game=null; render(); return; }
  if(t.closest("#backIdeas")){ ideas={...ideas, routeId:null, sel:-1}; render(); return; }
  if(t.closest("#stopGen")){ ideas.ctl && ideas.ctl.abort(); return; }
});
document.addEventListener("keydown", e=>{
  if(e.target.matches("input,textarea")) return;
  if(view==="rana" && game && !game.done){
    if(!game.answered && /^[1-4]$/.test(e.key)){ const pads=[...document.querySelectorAll(".pad")]; const p=pads[+e.key-1]; if(p){ e.preventDefault(); pick(+p.dataset.pick); } }
    else if(game.answered && e.key==="Enter" && document.activeElement && document.activeElement.id!=="next"){ e.preventDefault(); nextQ(); }
  }
  if(view==="red" && (e.key==="Enter"||e.key===" ")){ const g=e.target.closest && e.target.closest("[data-net]"); if(g){ e.preventDefault(); g.dispatchEvent(new MouseEvent("click",{bubbles:true})); } }
});
document.addEventListener("input", e=>{ if(e.target.id==="fFrom") ideas.from=e.target.value; if(e.target.id==="fTo") ideas.to=e.target.value; });
window.addEventListener("resize", ()=>{ if(view==="rana" && game && !game.answered) placeFrog(null,false); });

render();
