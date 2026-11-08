/* ================= Chatbot de Starly (abajo a la izquierda) =================
   Preguntas y respuestas rápidas. El servidor (/api/chat) prueba varios modelos
   de Gemini en orden y pasa al siguiente si uno tarda o está saturado. */
(function(){
  const API = "/api/chat";
  const STORE = "starly.chat";
  const TIMEOUT_MS = 35000;
  const SUGGEST = ["¿Qué es la fotosíntesis?", "Explícame una fracción con pizza", "Dame un truco para memorizar"];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  let msgs = [];
  try { msgs = JSON.parse(sessionStorage.getItem(STORE) || "[]"); } catch (e) {}
  let busy = false, ctl = null;
  const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30))); } catch (e) {} };

  const root = document.createElement("div");
  root.className = "chatbot";
  root.innerHTML = `
    <section class="chat-panel" id="chatPanel" role="dialog" aria-label="Chat con Starly" hidden>
      <header class="chat-head">
        <svg class="chat-star" viewBox="0 0 100 100" aria-hidden="true"><use href="#star"/></svg>
        <div style="flex:1;min-width:0"><b>Pregúntale a Starly</b><small>Respuestas rápidas con IA</small></div>
        <button class="chat-x" id="chatClear" title="Borrar conversación" aria-label="Borrar conversación">↺</button>
        <button class="chat-x" id="chatClose" aria-label="Cerrar chat">✕</button>
      </header>
      <div class="chat-log" id="chatLog" aria-live="polite"></div>
      <form class="chat-form" id="chatForm">
        <input id="chatInput" class="chat-input" maxlength="500" autocomplete="off" placeholder="Escribe tu pregunta…" aria-label="Tu pregunta">
        <button class="chat-send" type="submit" aria-label="Enviar">➤</button>
      </form>
    </section>
    <button class="chat-fab" id="chatFab" aria-expanded="false" aria-controls="chatPanel">
      <svg viewBox="0 0 100 100" aria-hidden="true"><use href="#star"/></svg><span>¿Dudas?</span>
    </button>`;
  document.body.appendChild(root);

  const $ = id => document.getElementById(id);
  const panel = $("chatPanel"), log = $("chatLog"), input = $("chatInput"), fab = $("chatFab");

  function paint(){
    const hello = `<div class="msg bot">¡Hola! Soy Starly. Pregúntame lo que quieras y te respondo rápido.</div>
      ${msgs.length ? "" : `<div class="chat-suggest">${SUGGEST.map(s => `<button type="button" class="chip" data-ask="${esc(s)}">${esc(s)}</button>`).join("")}</div>`}`;
    log.innerHTML = hello + msgs.map(m => `<div class="msg ${m.role === "user" ? "me" : m.error ? "bot err" : "bot"}">${esc(m.text)}</div>`).join("")
      + (busy ? `<div class="msg bot typing" aria-label="Starly está escribiendo"><i></i><i></i><i></i></div>` : "");
    log.scrollTop = log.scrollHeight;
  }

  function open(on){
    panel.hidden = !on;
    fab.setAttribute("aria-expanded", on);
    root.classList.toggle("open", on);
    if (on) { paint(); setTimeout(() => input.focus(), 50); }
  }

  async function send(text){
    text = text.trim();
    if (!text || busy) return;
    msgs.push({ role: "user", text });
    busy = true; paint(); save();
    ctl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, TIMEOUT_MS);
    let reply, error = false;
    try {
      const history = msgs.filter(m => !m.error).slice(-10).map(m => ({ role: m.role, text: m.text }));
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }), signal: ctl.signal });
      if (res.status === 404 || res.status === 405) throw { code: "no_server" };
      const body = await res.text();
      if (!res.ok) { let code = "upstream_error"; try { code = JSON.parse(body).code || code; } catch (e) {} throw { code }; }
      const at = body.indexOf("@@ERROR:");
      if (at >= 0) throw { code: body.slice(at + 8).trim() };
      reply = body.trim();
      if (!reply) throw { code: "empty" };
    } catch (e) {
      error = true;
      const code = timedOut ? "timeout" : e && e.code;
      reply = code === "no_server" ? "No encuentro el servidor del chat. Prueba en la versión publicada de la página."
        : code === "no_key" ? "Falta configurar la clave del chat en el servidor."
        : code === "timeout" ? "Tardé demasiado en responder. ¿Me lo preguntas otra vez?"
        : code === "rate_limited" ? "Estoy saturada en este momento. Inténtalo en unos segundos."
        : code === "refused" ? "No puedo responder eso. Prueba con otra pregunta."
        : "Algo falló. Inténtalo de nuevo.";
    }
    clearTimeout(timer);
    msgs.push({ role: "model", text: reply, error });
    busy = false; save();
    if (!panel.hidden) paint();
  }

  fab.addEventListener("click", () => open(panel.hidden));
  $("chatClose").addEventListener("click", () => { open(false); fab.focus(); });
  $("chatClear").addEventListener("click", () => { if (busy && ctl) ctl.abort(); msgs = []; busy = false; save(); paint(); input.focus(); });
  $("chatForm").addEventListener("submit", e => { e.preventDefault(); const t = input.value; input.value = ""; send(t); });
  log.addEventListener("click", e => { const b = e.target.closest("[data-ask]"); if (b) send(b.dataset.ask); });
  panel.addEventListener("keydown", e => { if (e.key === "Escape") { open(false); fab.focus(); } });
})();
