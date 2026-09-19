#!/usr/bin/env python3
"""Servidor local de pruebas con la misma API que el Worker.

Guarda las elecciones en choices.json. Uso:
    ADMIN_KEY=mi-clave python3 dev-server.py   # http://localhost:8787
"""
import json
import os
import re
import unicodedata
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
DATA = os.path.join(ROOT, "choices.json")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "gk-local")
PORT = int(os.environ.get("PORT", "8787"))
lock = Lock()


def menu_labels():
    """Extrae los nombres válidos de menu-data.js (la misma fuente que usa el Worker)."""
    src = open(os.path.join(PUBLIC, "js", "menu-data.js"), encoding="utf-8").read()
    starter = re.search(r"STARTER = \{.*?name: '([^']+)'", src, re.S).group(1)
    dish_src, drink_src = src.split("export const DRINK_SECTIONS")
    dish_src = dish_src.split("export const DISH_SECTIONS")[1]

    def labels(block):
        # Cada trozo empieza con el nombre de un ítem; si trae opciones, valen sus `full`.
        out = []
        for item in block.split("name: '")[1:]:
            fulls = re.findall(r"full: '([^']+)'", item)
            out += fulls or [item.split("'", 1)[0]]
        return out

    return starter, labels(dish_src), labels(drink_src)


STARTER, DISHES, DRINKS = menu_labels()


def normalize(name):
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"\s+", "-", re.sub(r"[^a-z0-9ñ ]", "", s))[:80]


def load():
    try:
        return json.load(open(DATA, encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save(data):
    json.dump(data, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PUBLIC, **kw)

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("cache-control", "no-store")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def is_admin(self):
        return self.headers.get("authorization") == f"Bearer {ADMIN_KEY}"

    def api(self, method):
        url = urlparse(self.path)
        if url.path != "/api/choices":
            return self.send_json({"error": "No encontrado."}, 404)
        if method == "POST":
            try:
                body = json.loads(self.rfile.read(int(self.headers.get("content-length", 0))))
            except json.JSONDecodeError:
                return self.send_json({"error": "Solicitud inválida."}, 400)
            name = re.sub(r"\s+", " ", str(body.get("name", "")).strip())[:60]
            if len(name) < 2:
                return self.send_json({"error": "Falta tu nombre."}, 400)
            if body.get("dish") not in DISHES:
                return self.send_json({"error": "Plato no válido."}, 400)
            if body.get("drinkStart") not in DRINKS:
                return self.send_json({"error": "Bebida para empezar no válida."}, 400)
            if body.get("drinkEnd") not in DRINKS:
                return self.send_json({"error": "Bebida para terminar no válida."}, 400)
            now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            with lock:
                data = load()
                key = normalize(name)
                prev = data.get(key, {})
                data[key] = {
                    "name": name, "starter": STARTER, "dish": body["dish"],
                    "drinkStart": body["drinkStart"], "drinkEnd": body["drinkEnd"],
                    "createdAt": prev.get("createdAt", now), "updatedAt": now,
                }
                save(data)
            return self.send_json({"ok": True, "record": data[key]})
        if not self.is_admin():
            return self.send_json({"error": "Clave incorrecta."}, 401)
        if method == "GET":
            return self.send_json(sorted(load().values(), key=lambda r: r["createdAt"]))
        if method == "DELETE":
            name = parse_qs(url.query).get("name", [""])[0]
            with lock:
                data = load()
                data.pop(normalize(name), None)
                save(data)
            return self.send_json({"ok": True})

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self.api("GET")
        if urlparse(self.path).path.rstrip("/") == "/resultados":
            self.path = "/resultados.html"
        return super().do_GET()

    def do_POST(self):
        self.api("POST")

    def do_DELETE(self):
        self.api("DELETE")


if __name__ == "__main__":
    print(f"Platos: {DISHES}\nBebidas: {DRINKS}")
    print(f"http://localhost:{PORT}  ·  /resultados (clave: {ADMIN_KEY})")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
