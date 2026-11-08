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
API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")

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
        known_line = (
            f"Otras disciplinas que ya aprendió en Starly: {', '.join(known)}. "
            "Úsalas como apoyo: menciona alguna en al menos una explicación o pregunta "
            'si de verdad ayuda, y llena "puentes" con 1 a 3 conexiones concretas.'
        )
    else:
        known_line = 'No ha aprendido otras disciplinas en Starly todavía: deja "puentes" como lista vacía.'
    steps_text = "\n".join(f"   {s['n']}. {s['name']}: {s['hint']}." for s in steps)
    return f"""Eres el motor de "Traducción Cognitiva" de Starly, una app que enseña una disciplina nueva a partir de otra que el estudiante ya domina.

Disciplina que domina: "{from_}"
Disciplina que quiere aprender: "{to}"
{known_line}

Tareas:
1. Extrae exactamente 4 principios clave de cada disciplina. Frases cortas de máximo 6 palabras.
2. Conecta principios de la disciplina que domina (a) con los de la nueva (b): entre 5 y 6 enlaces. Cada enlace tiene tipo "igual" (funciona igual en ambas), "similar" (se parece, con matices) o "distinta" (parece igual pero funciona distinto; es una trampa común). Incluye al menos uno de cada tipo. Explica cada enlace en 1 o 2 frases.
3. Escribe exactamente 6 preguntas de opción múltiple basadas en ese mapa, una por paso y en este orden:
{steps_text}
   Cada pregunta tiene 3 opciones cortas (máximo 14 palabras), solo una correcta, y una explicación de 1 frase.

Responde solo con JSON (sin texto antes ni después, sin bloque de código) con esta forma exacta:
{{"a":[{{"id":"a1","t":"..."}}],"b":[{{"id":"b1","t":"..."}}],"enlaces":[{{"a":"a1","b":"b1","tipo":"igual","porque":"..."}}],"preguntas":[{{"paso":1,"q":"...","opciones":["...","...","..."],"correcta":0,"porque":"..."}}],"puentes":[{{"disciplina":"...","idea":"..."}}]}}

Escribe en español, tono cercano, tuteando al estudiante."""


def ask_gemini(prompt):
    """Devuelve (texto, código_de_error)."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    payload = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.7,
            "maxOutputTokens": 8192,
            "thinkingConfig": {"thinkingLevel": "low"},
        },
    }).encode("utf-8")

    for attempt in range(3):
        req = urllib.request.Request(url, data=payload, method="POST", headers={
            "Content-Type": "application/json",
            "x-goog-api-key": API_KEY,
        })
        try:
            with urllib.request.urlopen(req, timeout=280) as res:
                data = json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")
            print("Error de Gemini:", exc.code, detail[:500])
            if exc.code == 503 and attempt < 2:
                time.sleep(1.2 * (attempt + 1))
                continue
            if exc.code in (401, 403) or (exc.code == 400 and "api key" in detail.lower()):
                return None, "no_key"
            if exc.code in (429, 503):
                return None, "rate_limited"
            return None, "upstream_error"
        except Exception as exc:  # red caída, tiempo agotado
            print("Error inesperado:", exc)
            return None, "upstream_error"

        cand = (data.get("candidates") or [{}])[0]
        finish = cand.get("finishReason", "")
        if finish in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"):
            return None, "refused"
        parts = (cand.get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
        if finish == "MAX_TOKENS" or not text.strip():
            return None, "bad_json"
        return text, None
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
        known = [k for k in (clean(x) for x in known[:12]) if k]

        steps = body.get("steps")
        if isinstance(steps, list) and len(steps) == 6 and all(isinstance(s, dict) for s in steps):
            steps = [{"n": i + 1, "name": clean(s.get("name"), 40), "hint": clean(s.get("hint"), 120)}
                     for i, s in enumerate(steps)]
        else:
            steps = DEFAULT_STEPS

        text, err = ask_gemini(build_prompt(from_, to, known, steps))
        self._send(200, text if text else "@@ERROR:" + err)
