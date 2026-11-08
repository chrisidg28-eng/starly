"""Chatbot de Starly para Vercel (Python, sin dependencias externas).

Ruta: POST /api/chat   Body: {"messages": [{"role": "user" | "model", "text": "..."}]}
Responde texto plano con la respuesta, o "@@ERROR:<código>" si algo falla.
La clave se lee de GEMINI_CHAT_KEY (o GEMINI_API_KEY si no existe).
Prueba modelos rápidos en orden; si uno está saturado o tarda, pasa al siguiente.
"""

import json
import os
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

API_KEY = os.environ.get("GEMINI_CHAT_KEY") or os.environ.get("GEMINI_API_KEY", "")
MODELS = [m.strip() for m in os.environ.get(
    "GEMINI_CHAT_MODELS", "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.5-flash"
).split(",") if m.strip()]
PER_MODEL_TIMEOUT = 12
TOTAL_BUDGET = 30
MAX_TURNS = 10
MAX_CHARS = 800

SYSTEM = (
    "Eres Starly, la estrella que acompaña a los estudiantes en la app Starly (aprender una disciplina nueva "
    "a partir de otra que ya dominan). Responde preguntas rápidas de cualquier tema escolar o general. "
    "Reglas: español, tono cercano, tutea. Respuestas cortas: máximo 3 o 4 frases (unas 80 palabras), salvo que "
    "pidan más detalle. Si sirve, da un ejemplo o una analogía con algo cotidiano. Texto plano, sin markdown."
)


def call_model(model, contents, timeout):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    thinking = True
    for _ in range(2):
        config = {"temperature": 0.6, "maxOutputTokens": 500}
        if thinking:
            config["thinkingConfig"] = {"thinkingLevel": "minimal"}
        payload = json.dumps({"systemInstruction": {"parts": [{"text": SYSTEM}]},
                              "contents": contents, "generationConfig": config}).encode("utf-8")
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
        text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
        if not text:
            return None, "retry"
        return text, None
    return None, "retry"


def ask(contents):
    start = time.time()
    for model in MODELS:
        left = TOTAL_BUDGET - (time.time() - start)
        if left < 3:
            break
        text, err = call_model(model, contents, min(PER_MODEL_TIMEOUT, left))
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
        msgs = body.get("messages") if isinstance(body.get("messages"), list) else []
        contents = []
        for m in msgs[-MAX_TURNS:]:
            if not isinstance(m, dict):
                continue
            text = str(m.get("text") or "")[:MAX_CHARS]
            if text.strip():
                contents.append({"role": "model" if m.get("role") == "model" else "user", "parts": [{"text": text}]})
        if not contents or contents[-1]["role"] != "user":
            return self._send(400, json.dumps({"code": "bad_request"}), "application/json")
        text, err = ask(contents)
        self._send(200, text if text else "@@ERROR:" + err)
