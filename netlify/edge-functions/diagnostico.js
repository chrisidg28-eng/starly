// Diagnóstico de Starly para Netlify ("el pollo cruza la calle").
// Ruta: POST /api/diagnostico   Body: { from, to, level: 1-5, temas: string[] }
// Responde texto: {"preguntas":[...]} con 7 preguntas de dificultad creciente,
// o "@@ERROR:<código>". Usa la misma cadena de modelos rápidos que generar-ruta.
const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"];
const PER_MODEL_TIMEOUT_MS = 20000;
const TOTAL_BUDGET_MS = 50000;

const LEVELS = {
  1: "Inicial (muy sencillo, ejemplos cotidianos)",
  2: "Básico (comprensión, distractores fáciles)",
  3: "Intermedio (aplicación, distractores plausibles)",
  4: "Avanzado (análisis, casos nuevos, distractores sutiles)",
  5: "Experto (razonamiento difícil, excepciones y matices)",
};
const clean = (s, max = 60) => String(s ?? "").replace(/[\r\n"]+/g, " ").trim().slice(0, max);

// Dificultad de cada pregunta: empieza en el nivel actual y sube.
const ladder = (level) => [0, 0, 1, 1, 1, 2, 2].map((d) => Math.min(5, level + d));

function buildPrompt(from, to, level, temas) {
  const lv = ladder(level);
  return `Eres el evaluador de Starly. El estudiante domina "${from}" y está aprendiendo "${to}".
${temas.length ? `Temas que acaba de practicar: ${temas.join("; ")}.` : ""}
Escribe 7 preguntas de opción múltiple sobre "${to}" (puedes apoyarte en "${from}") para medir su nivel.
Dificultad de cada pregunta, en orden: ${lv.map((n, i) => `${i + 1}) ${LEVELS[n]}`).join("; ")}.
Cada pregunta: 3 opciones cortas (máx. 12 palabras), "correcta" es el índice (0-2), "porque" 1 frase, "nivel" el número de su dificultad.
Que las preguntas sean distintas entre sí y no triviales para su nivel.
Solo JSON, en español, tuteando:
{"preguntas":[{"q":"","opciones":["","",""],"correcta":0,"porque":"","nivel":${lv[0]}}]}`;
}

// Esquema: obliga al modelo a devolver JSON válido con esta forma.
const SCHEMA = {
  type: "OBJECT",
  properties: { preguntas: { type: "ARRAY", items: { type: "OBJECT", properties: {
    q: { type: "STRING" }, opciones: { type: "ARRAY", items: { type: "STRING" } },
    correcta: { type: "INTEGER" }, porque: { type: "STRING" }, nivel: { type: "INTEGER" },
  }, required: ["q", "opciones", "correcta", "porque", "nivel"] } } },
  required: ["preguntas"],
};

async function callModel(apiKey, model, prompt, timeoutMs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let thinking = true;
  for (let tries = 0; tries < 2; tries++) {
    const generationConfig = { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.7, maxOutputTokens: 2000 };
    if (thinking) generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig }),
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
    const text = (cand.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    if (cand.finishReason === "MAX_TOKENS" || !text.trim()) return { err: "retry" };
    try { JSON.parse(text); } catch { console.error(model, "JSON inválido"); return { err: "retry" }; }
    return { text };
  }
  return { err: "retry" };
}

async function ask(apiKey, models, prompt) {
  const start = Date.now();
  for (const model of models) {
    const left = TOTAL_BUDGET_MS - (Date.now() - start);
    if (left < 4000) break;
    const r = await callModel(apiKey, model, prompt, Math.min(PER_MODEL_TIMEOUT_MS, left));
    if (r.text) return r;
    if (r.err !== "retry") return r;
  }
  return { err: "rate_limited" };
}

const jsonError = (code, status) =>
  new Response(JSON.stringify({ code }), { status, headers: { "Content-Type": "application/json" } });

export default async (request) => {
  if (request.method !== "POST") return jsonError("method_not_allowed", 405);
  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) return jsonError("no_key", 500);
  const models = (Netlify.env.get("GEMINI_MODELS") || "").split(",").map((m) => m.trim()).filter(Boolean);

  let body;
  try { body = await request.json(); } catch { return jsonError("bad_request", 400); }
  const from = clean(body.from), to = clean(body.to);
  if (!from || !to) return jsonError("bad_request", 400);
  const level = Math.min(5, Math.max(1, Math.round(Number(body.level) || 3)));
  const temas = Array.isArray(body.temas) ? body.temas.slice(0, 8).map((t) => clean(t, 80)).filter(Boolean) : [];

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t) => controller.enqueue(enc.encode(t));
      send(" ");
      const beat = setInterval(() => send(" "), 5000);
      try {
        const { text, err } = await ask(apiKey, models.length ? models : DEFAULT_MODELS, buildPrompt(from, to, level, temas));
        send(text ? text : "\n@@ERROR:" + err);
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
};

export const config = { path: "/api/diagnostico" };
