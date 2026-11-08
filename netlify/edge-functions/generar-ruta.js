// Función de IA de Starly para Netlify (sin dependencias).
// Ruta: POST /api/generar-ruta   Body: { from, to, known: string[], steps: [{n,name,hint}] }
// Responde texto: el JSON de la ruta, o "@@ERROR:<código>" si algo falla.
// Mientras Gemini piensa, envía espacios para que Netlify no corte la conexión.

// La clave se lee de la variable de entorno GEMINI_API_KEY (configúrala en Netlify).
// Modelos rápidos en orden: si uno está saturado (503/429) o tarda demasiado, se prueba el siguiente.
// Se puede cambiar con la variable GEMINI_MODELS="modelo1,modelo2".
const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"];
const PER_MODEL_TIMEOUT_MS = 20000;   // tiempo máximo por intento
const TOTAL_BUDGET_MS = 55000;        // tiempo máximo total antes de rendirse

const DEFAULT_STEPS = [
  { n: 1, name: "Reconocer", hint: "identifica qué de lo que ya sabes aplica aquí" },
  { n: 2, name: "Descomponer", hint: "separa el principio de su contexto original" },
  { n: 3, name: "Comparar", hint: "decide si es igual, similar o distinto" },
  { n: 4, name: "Traducir", hint: "di el principio con el lenguaje de la nueva disciplina" },
  { n: 5, name: "Detectar trampas", hint: "encuentra dónde la analogía falla" },
  { n: 6, name: "Aplicar", hint: "úsalo en un caso nuevo" },
];

// Dificultad según el nivel del estudiante (sale del diagnóstico).
const LEVELS = {
  1: "Inicial: lenguaje muy sencillo, ejemplos cotidianos, preguntas directas y distractores claramente incorrectos.",
  2: "Básico: lenguaje sencillo, preguntas de comprensión, distractores fáciles de descartar.",
  3: "Intermedio: preguntas de aplicación con distractores plausibles.",
  4: "Avanzado: preguntas de análisis y casos nuevos, vocabulario técnico, distractores sutiles.",
  5: "Experto: preguntas desafiantes de razonamiento, excepciones y matices, distractores muy sutiles.",
};
const clean = (s, max = 60) => String(s ?? "").replace(/[\r\n"]+/g, " ").trim().slice(0, max);

// Prompt corto: menos texto de entrada y salida = respuesta más rápida.
function buildPrompt(from, to, known, steps, level) {
  return `Eres el motor de Starly: enseñas "${to}" a alguien que domina "${from}".
Nivel del estudiante: ${LEVELS[level]} Ajusta la dificultad de las preguntas y el lenguaje a ese nivel.
${known.length
    ? `También sabe: ${known.join(", ")}. Llena "puentes" con 1 a 3 conexiones concretas con esas disciplinas.`
    : `"puentes" debe ser [].`}

1. "a": 4 principios clave de ${from}; "b": 4 de ${to}. Máximo 6 palabras cada uno.
2. "enlaces": 5 conexiones a→b. "tipo": "igual", "similar" o "distinta" (parece igual pero es una trampa); al menos uno de cada tipo. "porque": 1 frase.
3. "preguntas": 6 de opción múltiple, una por paso en este orden: ${steps.map((s) => `${s.n}) ${s.name}: ${s.hint}`).join("; ")}.
   3 opciones cortas (máx. 12 palabras), "correcta" es el índice (0-2), "porque": 1 frase.

Solo JSON, en español, tuteando:
{"a":[{"id":"a1","t":""}],"b":[{"id":"b1","t":""}],"enlaces":[{"a":"a1","b":"b1","tipo":"igual","porque":""}],"preguntas":[{"paso":1,"q":"","opciones":["","",""],"correcta":0,"porque":""}],"puentes":[{"disciplina":"","idea":""}]}`;
}

async function callModel(apiKey, model, prompt, timeoutMs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let thinking = true;
  for (let tries = 0; tries < 2; tries++) {
    const generationConfig = { responseMimeType: "application/json", temperature: 0.6, maxOutputTokens: 3000 };
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
      // El modelo no acepta "minimal": se repite sin configuración de razonamiento.
      if (res.status === 400 && thinking && /thinking/i.test(detail)) { thinking = false; continue; }
      if (res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(detail))) return { err: "no_key" };
      if (res.status === 429 || res.status === 503 || res.status === 500 || res.status === 404) return { err: "retry" };
      return { err: "upstream_error" };
    }
    const data = await res.json().catch(() => ({}));
    const cand = data.candidates?.[0] || {};
    const finish = cand.finishReason || "";
    if (["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"].includes(finish)) return { err: "refused" };
    const text = (cand.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    if (finish === "MAX_TOKENS" || !text.trim()) return { err: "retry" };
    try { JSON.parse(text); } catch { console.error(model, "JSON inválido"); return { err: "retry" }; }
    return { text };
  }
  return { err: "retry" };
}

async function askGemini(apiKey, models, prompt) {
  const start = Date.now();
  let last = "rate_limited";
  for (const model of models) {
    const left = TOTAL_BUDGET_MS - (Date.now() - start);
    if (left < 4000) break;
    const r = await callModel(apiKey, model, prompt, Math.min(PER_MODEL_TIMEOUT_MS, left));
    if (r.text) return r;
    if (r.err !== "retry") return r;   // clave mala o contenido rechazado: no tiene caso seguir
    last = "rate_limited";
  }
  return { err: last };
}

const jsonError = (code, status) =>
  new Response(JSON.stringify({ code }), { status, headers: { "Content-Type": "application/json" } });

export default async (request) => {
  if (request.method !== "POST") return jsonError("method_not_allowed", 405);

  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  const models = (Netlify.env.get("GEMINI_MODELS") || "").split(",").map((m) => m.trim()).filter(Boolean);
  if (!apiKey) return jsonError("no_key", 500);

  let body;
  try { body = await request.json(); } catch { return jsonError("bad_request", 400); }
  const from = clean(body.from), to = clean(body.to);
  if (!from || !to) return jsonError("bad_request", 400);
  const known = Array.isArray(body.known) ? body.known.slice(0, 8).map((k) => clean(k)).filter(Boolean) : [];
  const steps = Array.isArray(body.steps) && body.steps.length === 6
    ? body.steps.map((s, i) => ({ n: i + 1, name: clean(s?.name, 40), hint: clean(s?.hint, 120) }))
    : DEFAULT_STEPS;
  const level = Math.min(5, Math.max(1, Math.round(Number(body.level) || 3)));

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t) => controller.enqueue(enc.encode(t));
      send(" ");
      const beat = setInterval(() => send(" "), 5000);
      try {
        const { text, err } = await askGemini(apiKey, models.length ? models : DEFAULT_MODELS, buildPrompt(from, to, known, steps, level));
        send(text ? text : "\n@@ERROR:" + err);
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
};

export const config = { path: "/api/generar-ruta" };
