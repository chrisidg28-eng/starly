// Función de IA de Starly para Netlify (sin dependencias).
// Ruta: POST /api/generar-ruta   Body: { from, to, known: string[], steps: [{n,name,hint}] }
// Responde texto: el JSON de la ruta, o "@@ERROR:<código>" si algo falla.
// Mientras Gemini piensa, envía espacios para que Netlify no corte la conexión.

// La clave se lee de la variable de entorno GEMINI_API_KEY (configúrala en Netlify).
const DEFAULT_MODEL = "gemini-3.8-flash";

const DEFAULT_STEPS = [
  { n: 1, name: "Reconocer", hint: "identifica qué de lo que ya sabes aplica aquí" },
  { n: 2, name: "Descomponer", hint: "separa el principio de su contexto original" },
  { n: 3, name: "Comparar", hint: "decide si es igual, similar o distinto" },
  { n: 4, name: "Traducir", hint: "di el principio con el lenguaje de la nueva disciplina" },
  { n: 5, name: "Detectar trampas", hint: "encuentra dónde la analogía falla" },
  { n: 6, name: "Aplicar", hint: "úsalo en un caso nuevo" },
];

const clean = (s, max = 60) => String(s ?? "").replace(/[\r\n"]+/g, " ").trim().slice(0, max);

function buildPrompt(from, to, known, steps) {
  return `Eres el motor de "Traducción Cognitiva" de Starly, una app que enseña una disciplina nueva a partir de otra que el estudiante ya domina.

Disciplina que domina: "${from}"
Disciplina que quiere aprender: "${to}"
${known.length
    ? `Otras disciplinas que ya aprendió en Starly: ${known.join(", ")}. Úsalas como apoyo: menciona alguna en al menos una explicación o pregunta si de verdad ayuda, y llena "puentes" con 1 a 3 conexiones concretas.`
    : `No ha aprendido otras disciplinas en Starly todavía: deja "puentes" como lista vacía.`}

Tareas:
1. Extrae de 4 a 5 principios clave de cada disciplina. Frases cortas de máximo 6 palabras.
2. Conecta principios de la disciplina que domina (a) con los de la nueva (b): entre 5 y 7 enlaces. Cada enlace tiene tipo "igual" (funciona igual en ambas), "similar" (se parece, con matices) o "distinta" (parece igual pero funciona distinto; es una trampa común). Incluye al menos uno de cada tipo. Explica cada enlace en 1 o 2 frases.
3. Escribe exactamente 6 preguntas de opción múltiple basadas en ese mapa, una por paso y en este orden:
${steps.map((s) => `   ${s.n}. ${s.name}: ${s.hint}.`).join("\n")}
   Cada pregunta tiene 3 opciones cortas (máximo 14 palabras), solo una correcta, y una explicación de 1 frase.

Responde solo con JSON (sin texto antes ni después, sin bloque de código) con esta forma exacta:
{"a":[{"id":"a1","t":"..."}],"b":[{"id":"b1","t":"..."}],"enlaces":[{"a":"a1","b":"b1","tipo":"igual","porque":"..."}],"preguntas":[{"paso":1,"q":"...","opciones":["...","...","..."],"correcta":0,"porque":"..."}],"puentes":[{"disciplina":"...","idea":"..."}]}

Escribe en español, tono cercano, tuteando al estudiante.`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function askGemini(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const payload = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingLevel: "low" },
    },
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: payload,
      });
    } catch (e) {
      console.error("Error de red:", e);
      return { err: "upstream_error" };
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Error de Gemini:", res.status, detail.slice(0, 500));
      if (res.status === 503 && attempt < 2) { await sleep(3000 * (attempt + 1)); continue; }
      if (res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(detail))) return { err: "no_key" };
      if (res.status === 429 || res.status === 503) return { err: "rate_limited" };
      return { err: "upstream_error" };
    }
    const data = await res.json().catch(() => ({}));
    const cand = data.candidates?.[0] || {};
    const finish = cand.finishReason || "";
    if (["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"].includes(finish)) return { err: "refused" };
    const text = (cand.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    if (finish === "MAX_TOKENS" || !text.trim()) return { err: "bad_json" };
    return { text };
  }
  return { err: "rate_limited" };
}

const jsonError = (code, status) =>
  new Response(JSON.stringify({ code }), { status, headers: { "Content-Type": "application/json" } });

export default async (request) => {
  if (request.method !== "POST") return jsonError("method_not_allowed", 405);

  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  const model = Netlify.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
  if (!apiKey) return jsonError("no_key", 500);

  let body;
  try { body = await request.json(); } catch { return jsonError("bad_request", 400); }
  const from = clean(body.from), to = clean(body.to);
  if (!from || !to) return jsonError("bad_request", 400);
  const known = Array.isArray(body.known) ? body.known.slice(0, 12).map((k) => clean(k)).filter(Boolean) : [];
  const steps = Array.isArray(body.steps) && body.steps.length === 6
    ? body.steps.map((s, i) => ({ n: i + 1, name: clean(s?.name, 40), hint: clean(s?.hint, 120) }))
    : DEFAULT_STEPS;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t) => controller.enqueue(enc.encode(t));
      send(" ");
      const beat = setInterval(() => send(" "), 8000);
      try {
        const { text, err } = await askGemini(apiKey, model, buildPrompt(from, to, known, steps));
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
