// Cloudflare Worker: sirve la carta (assets estáticos) y guarda las elecciones.
//
// Las elecciones viven en un Durable Object (`Guests`): una sola instancia con almacenamiento
// fuertemente consistente, así un borrado o un cambio se ve al instante en /resultados.
// (Antes se usaba KV, que es eventualmente consistente y seguía mostrando registros borrados;
// los datos que quedaron en KV se copian una sola vez al Durable Object.)
import { DurableObject } from 'cloudflare:workers';
import { STARTER, DISH_LABELS, DRINK_LABELS } from '../public/js/menu-data.js';

const PREFIX = 'choice:';
const IMPORTED_FLAG = 'meta:kv-imported';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const normalize = (name) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);

function isAdmin(request, env) {
  const auth = request.headers.get('authorization') || '';
  return !!env.ADMIN_KEY && auth === `Bearer ${env.ADMIN_KEY}`;
}

export class Guests extends DurableObject {
  // Copia única de las elecciones que había en KV antes del cambio.
  async #importFromKv() {
    if (await this.ctx.storage.get(IMPORTED_FLAG)) return;
    const kv = this.env.CHOICES;
    if (kv) {
      let cursor;
      do {
        const page = await kv.list({ prefix: PREFIX, cursor });
        for (const k of page.keys) {
          const rec = await kv.get(k.name, 'json');
          if (rec && !(await this.ctx.storage.get(k.name))) await this.ctx.storage.put(k.name, rec);
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
    }
    await this.ctx.storage.put(IMPORTED_FLAG, true);
  }

  async all() {
    await this.#importFromKv();
    const map = await this.ctx.storage.list({ prefix: PREFIX });
    return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async upsert(key, record) {
    await this.#importFromKv();
    const prev = await this.ctx.storage.get(key);
    const saved = { ...record, createdAt: prev?.createdAt ?? record.createdAt };
    await this.ctx.storage.put(key, saved);
    return saved;
  }

  async remove(key) {
    await this.#importFromKv();
    return this.ctx.storage.delete(key);
  }
}

const guests = (env) => env.GUESTS.get(env.GUESTS.idFromName('boda-gk'));

async function handleApi(request, env, url) {
  if (url.pathname !== '/api/choices') return json({ error: 'No encontrado.' }, 404);

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Solicitud inválida.' }, 400);
    }
    const name = String(body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const { dish, drinkStart, drinkEnd } = body;
    if (name.length < 2) return json({ error: 'Falta tu nombre.' }, 400);
    if (!DISH_LABELS.includes(dish)) return json({ error: 'Plato no válido.' }, 400);
    if (!DRINK_LABELS.includes(drinkStart)) return json({ error: 'Bebida para empezar no válida.' }, 400);
    if (!DRINK_LABELS.includes(drinkEnd)) return json({ error: 'Bebida para terminar no válida.' }, 400);

    const now = new Date().toISOString();
    const record = await guests(env).upsert(PREFIX + normalize(name), {
      name,
      starter: STARTER.name,
      dish,
      drinkStart,
      drinkEnd,
      createdAt: now,
      updatedAt: now,
    });
    return json({ ok: true, record });
  }

  if (!isAdmin(request, env)) return json({ error: 'Clave incorrecta.' }, 401);

  if (request.method === 'GET') return json(await guests(env).all());

  if (request.method === 'DELETE') {
    const name = url.searchParams.get('name') || '';
    await guests(env).remove(PREFIX + normalize(name));
    return json({ ok: true });
  }

  return json({ error: 'Método no permitido.' }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
