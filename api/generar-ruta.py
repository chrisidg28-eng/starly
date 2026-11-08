"""Función de IA de Starly para Vercel (Python, sin dependencias externas).

Ruta: POST /api/generar-ruta   Body: {"from", "to", "known": [...], "steps": [...]}
Responde texto: el JSON de la ruta, o "@@ERROR:<código>" si algo falla.
"""

import json
import os
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

# La clave se lee de la variable de entorno GEMINI_API_KEY (configúrala en Vercel).
# Modelos rápidos en orden: si uno está saturado o tarda demasiado, se prueba el siguiente.
API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODELS = [m.strip() for m in os.environ.get(
    "GEMINI_MODELS", "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.5-flash"
).split(",") if m.strip()]
PER_MODEL_TIMEOUT = 20
TOTAL_BUDGET = 55

DEFAULT_STEPS = [
    {"n": 1, "name": "Reconocer", "hint": "identifica qué de lo que ya sabes aplica aquí"},
    {"n": 2, "name": "Descomponer", "hint": "separa el principio de su contexto original"},
    {"n": 3, "name": "Comparar", "hint": "decide si es igual, similar o distinto"},
    {"n": 4, "name": "Traducir", "hint": "di el principio con el lenguaje de la nueva disciplina"},
    {"n": 5, "name": "Detectar trampas", "hint": "encuentra dónde la analogía falla"},
    {"n": 6, "name": "Aplicar", "hint": "úsalo en un caso nuevo"},
]


def clean(value, max_len=60):
    text = str(value if value is not None else "")
    for ch in "\r\n\"":
        text = text.replace(ch, " ")
    return text.strip()[:max_len]


def build_prompt(from_, to, known, steps):
    if known:
        known_line = f'También sabe: {", ".join(known)}. Llena "puentes" con 1 a 3 conexiones concretas con esas disciplinas.'
    else:
        known_line = '"puentes" debe ser [].'
    steps_text = "; ".join(f"{s['n']}) {s['name']}: {s['hint']}" for s in steps)
    return f"""Eres el motor de Starly: enseñas "{to}" a alguien que domina "{from_}".
{known_line}

1. "a": 4 principios clave de {from_}; "b": 4 de {to}. Máximo 6 palabras cada uno.
2. "enlaces": 5 conexiones a→b. "tipo": "igual", "similar" o "distinta" (parece igual pero es una trampa); al menos uno de cada tipo. "porque": 1 frase.
3. "preguntas": 6 de opción múltiple, una por paso en este orden: {steps_text}.
   3 opciones cortas (máx. 12 palabras), "correcta" es el índice (0-2), "porque": 1 frase.

Solo JSON, en español, tuteando:
{{"a":[{{"id":"a1","t":""}}],"b":[{{"id":"b1","t":""}}],"enlaces":[{{"a":"a1","b":"b1","tipo":"igual","porque":""}}],"preguntas":[{{"paso":1,"q":"","opciones":["","",""],"correcta":0,"porque":""}}],"puentes":[{{"disciplina":"","idea":""}}]}}"""


def call_model(model, prompt, timeout):
    """Devuelve (texto, código). El código "retry" significa: probar el siguiente modelo."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    thinking = True
    for _ in range(2):
        config = {"responseMimeType": "application/json", "temperature": 0.6, "maxOutputTokens": 3000}
        if thinking:
            config["thinkingConfig"] = {"thinkingLevel": "minimal"}
        payload = json.dumps({"contents": [{"role": "user", "parts": [{"text": prompt}]}],
                              "generationConfig": config}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, method="POST", headers={
            "Content-Type": "application/json", "x-goog-api-key": API_KEY})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                data = json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")
            print(model, "error", exc.code, detail[:300])
            if exc.code == 400 and thinking and "thinking" in detail.lower():
                thinking = False
                continue
            if exc.code in (401, 403) or (exc.code == 400 and "api key" in detail.lower()):
                return None, "no_key"
            if exc.code in (404, 429, 500, 503):
                return None, "retry"
            return None, "upstream_error"
        except Exception as exc:  # red caída o tiempo agotado
            print(model, "sin respuesta:", exc)
            return None, "retry"
        cand = (data.get("candidates") or [{}])[0]
        finish = cand.get("finishReason", "")
        if finish in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"):
            return None, "refused"
        parts = (cand.get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
        if finish == "MAX_TOKENS" or not text.strip():
            return None, "retry"
        return text, None
    return None, "retry"


def ask_gemini(prompt):
    """Prueba los modelos en orden hasta que uno responda. Devuelve (texto, código_de_error)."""
    start = time.time()
    for model in MODELS:
        left = TOTAL_BUDGET - (time.time() - start)
        if left < 4:
            break
        text, err = call_model(model, prompt, min(PER_MODEL_TIMEOUT, left))
        if text:
            return text, None
        if err != "retry":
            return None, err
    return None, "rate_limited"


class handler(BaseHTTPRequestHandler):
    def _send(self, status, text, ctype="text/plain; charset=utf-8"):
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._send(405, json.dumps({"code": "method_not_allowed"}), "application/json")

    def do_POST(self):
        if not API_KEY:
            return self._send(500, json.dumps({"code": "no_key"}), "application/json")
        try:
            length = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except Exception:
            return self._send(400, json.dumps({"code": "bad_request"}), "application/json")

        from_, to = clean(body.get("from")), clean(body.get("to"))
        if not from_ or not to:
            return self._send(400, json.dumps({"code": "bad_request"}), "application/json")

        known = body.get("known") if isinstance(body.get("known"), list) else []
        known = [k for k in (clean(x) for x in known[:8]) if k]

        steps = body.get("steps")
        if isinstance(steps, list) and len(steps) == 6 and all(isinstance(s, dict) for s in steps):
            steps = [{"n": i + 1, "name": clean(s.get("name"), 40), "hint": clean(s.get("hint"), 120)}
                     for i, s in enumerate(steps)]
        else:
            steps = DEFAULT_STEPS

        text, err = ask_gemini(build_prompt(from_, to, known, steps))
        self._send(200, text if text else "@@ERROR:" + err)
