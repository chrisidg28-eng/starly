"""Diagnóstico de Starly para Vercel ("el pollo cruza la calle").

Ruta: POST /api/diagnostico   Body: {"from", "to", "level": 1-5, "temas": [...]}
Responde texto: {"preguntas":[...]} con 7 preguntas de dificultad creciente, o "@@ERROR:<código>".
Usa la misma cadena de modelos rápidos que generar-ruta.
"""

import json
import os
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODELS = [m.strip() for m in os.environ.get(
    "GEMINI_MODELS", "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.5-flash"
).split(",") if m.strip()]
PER_MODEL_TIMEOUT = 20
TOTAL_BUDGET = 50

LEVELS = {
    1: "Inicial (muy sencillo, ejemplos cotidianos)",
    2: "Básico (comprensión, distractores fáciles)",
    3: "Intermedio (aplicación, distractores plausibles)",
    4: "Avanzado (análisis, casos nuevos, distractores sutiles)",
    5: "Experto (razonamiento difícil, excepciones y matices)",
}


def clean(value, max_len=60):
    text = str(value if value is not None else "")
    for ch in "\r\n\"":
        text = text.replace(ch, " ")
    return text.strip()[:max_len]


def build_prompt(from_, to, level, temas):
    lv = [min(5, level + d) for d in (0, 0, 1, 1, 1, 2, 2)]
    temas_line = f"Temas que acaba de practicar: {'; '.join(temas)}." if temas else ""
    niveles = "; ".join(f"{i + 1}) {LEVELS[n]}" for i, n in enumerate(lv))
    return f"""Eres el evaluador de Starly. El estudiante domina "{from_}" y está aprendiendo "{to}".
{temas_line}
Escribe 7 preguntas de opción múltiple sobre "{to}" (puedes apoyarte en "{from_}") para medir su nivel.
Dificultad de cada pregunta, en orden: {niveles}.
Cada pregunta: 3 opciones cortas (máx. 12 palabras), "correcta" es el índice (0-2), "porque" 1 frase, "nivel" el número de su dificultad.
Que las preguntas sean distintas entre sí y no triviales para su nivel.
Solo JSON, en español, tuteando:
{{"preguntas":[{{"q":"","opciones":["","",""],"correcta":0,"porque":"","nivel":{lv[0]}}}]}}"""


SCHEMA = {
    "type": "OBJECT",
    "properties": {"preguntas": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
        "q": {"type": "STRING"}, "opciones": {"type": "ARRAY", "items": {"type": "STRING"}},
        "correcta": {"type": "INTEGER"}, "porque": {"type": "STRING"}, "nivel": {"type": "INTEGER"},
    }, "required": ["q", "opciones", "correcta", "porque", "nivel"]}}},
    "required": ["preguntas"],
}


def call_model(model, prompt, timeout):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    thinking = True
    for _ in range(2):
        config = {"responseMimeType": "application/json", "responseSchema": SCHEMA, "temperature": 0.7, "maxOutputTokens": 2000}
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
        except Exception as exc:
            print(model, "sin respuesta:", exc)
            return None, "retry"
        cand = (data.get("candidates") or [{}])[0]
        if cand.get("finishReason") in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"):
            return None, "refused"
        parts = (cand.get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
        if cand.get("finishReason") == "MAX_TOKENS" or not text.strip():
            return None, "retry"
        try:
            json.loads(text)
        except ValueError:
            print(model, "JSON inválido")
            return None, "retry"
        return text, None
    return None, "retry"


def ask(prompt):
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
        try:
            level = min(5, max(1, int(round(float(body.get("level") or 3)))))
        except (TypeError, ValueError):
            level = 3
        temas = body.get("temas") if isinstance(body.get("temas"), list) else []
        temas = [t for t in (clean(x, 80) for x in temas[:8]) if t]
        text, err = ask(build_prompt(from_, to, level, temas))
        self._send(200, text if text else "@@ERROR:" + err)
