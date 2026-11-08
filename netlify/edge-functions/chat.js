// Chatbot de Starly para Netlify (preguntas y respuestas rápidas).
// Ruta: POST /api/chat   Body: { messages: [{ role: "user" | "model", text }] }
// Responde texto plano con la respuesta, o "@@ERROR:<código>" si algo falla.
//
// La clave se lee de GEMINI_CHAT_KEY (si no existe, usa GEMINI_API_KEY).
// Igual que generar-ruta: prueba modelos rápidos en orden; si uno está saturado
// o tarda demasiado, pasa al siguiente. Se puede cambiar con GEMINI_CHAT_MODELS="m1,m2".
const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"];
const PER_MODEL_TIMEOUT_MS = 12000;
const TOTAL_BUDGET_MS = 30000;
const MAX_TURNS = 10;
const MAX_CHARS = 800;

const SYSTEM = `Eres Starly, la estrella que acompaña a los estudiantes en la app Starly (aprender una disciplina nueva a partir de otra que ya dominan).
Responde preguntas rápidas de cualquier tema escolar o general.
Reglas: español, tono cercano, tutea. Respuestas cortas: máximo 3 o 4 frases (unas 80 palabras), salvo que pidan más detalle.
Si sirve, da un ejemplo o una analogía con algo cotidiano. Texto plano, sin markdown ni encabezados.`;

async function callModel(apiKey, model, contents, timeoutMs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let thinking = true;
  for (let tries = 0; tries < 2; tries++) {
    const generationConfig = { temperature: 0.6, maxOutputTokens: 500 };
    if (thinking) generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      console.error(model, "sin respuesta:", e?.name || e);
      return { err: "retry" };
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(model, "error", res.status, detail.slice(0, 300));
      if (res.status === 400 && thinking && /thinking/i.test(detail)) { thinking = false; continue; }
      if (res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(detail))) return { err: "no_key" };
      if ([404, 429, 500, 503].includes(res.status)) return { err: "retry" };
      return { err: "upstream_error" };
    }
    const data = await res.json().catch(() => ({}));
    const cand = data.candidates?.[0] || {};
    if (["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"].includes(cand.finishReason)) return { err: "refused" };
    const text = (cand.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
    if (!text) return { err: "retry" };
    return { text };
  }
  return { err: "retry" };
}

async function ask(apiKey, models, contents) {
  const start = Date.now();
  for (const model of models) {
    const left = TOTAL_BUDGET_MS - (Date.now() - start);
    if (left < 3000) break;
    const r = await callModel(apiKey, model, contents, Math.min(PER_MODEL_TIMEOUT_MS, left));
    if (r.text) return r;
    if (r.err !== "retry") return r;
  }
  return { err: "rate_limited" };
}

const jsonError = (code, status) =>
  new Response(JSON.stringify({ code }), { status, headers: { "Content-Type": "application/json" } });

export default async (request) => {
  if (request.method !== "POST") return jsonError("method_not_allowed", 405);
  const apiKey = Netlify.env.get("GEMINI_CHAT_KEY") || Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) return jsonError("no_key", 500);
  const models = (Netlify.env.get("GEMINI_CHAT_MODELS") || "").split(",").map((m) => m.trim()).filter(Boolean);

  let body;
  try { body = await request.json(); } catch { return jsonError("bad_request", 400); }
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const contents = msgs
    .map((m) => ({ role: m && m.role === "model" ? "model" : "user", parts: [{ text: String(m?.text ?? "").slice(0, MAX_CHARS) }] }))
    .filter((m) => m.parts[0].text.trim());
  if (!contents.length || contents[contents.length - 1].role !== "user") return jsonError("bad_request", 400);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t) => controller.enqueue(enc.encode(t));
      const beat = setInterval(() => send(" "), 5000);
      try {
        const { text, err } = await ask(apiKey, models.length ? models : DEFAULT_MODELS, contents);
        send(text ? text : "@@ERROR:" + err);
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
};

export const config = { path: "/api/chat" };
