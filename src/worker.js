// Cloudflare Worker: sirve la carta (assets estáticos) y guarda las elecciones en KV.
// Cada invitado es una clave `choice:<nombre-normalizado>`; el registro va también en la
// metadata para poder leer todo con un solo `list()` (y sin perder escrituras simultáneas).
import { STARTER, DISH_LABELS, DRINK_LABELS } from '../public/js/menu-data.js';

const PREFIX = 'choice:';

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

async function listChoices(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.CHOICES.list({ prefix: PREFIX, cursor });
    for (const k of page.keys) {
      out.push(k.metadata ?? JSON.parse(await env.CHOICES.get(k.name)));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

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

    const key = PREFIX + normalize(name);
    const prev = await env.CHOICES.get(key, 'json');
    const now = new Date().toISOString();
    const record = {
      name,
      starter: STARTER.name,
      dish,
      drinkStart,
      drinkEnd,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
    await env.CHOICES.put(key, JSON.stringify(record), { metadata: record });
    return json({ ok: true, record });
  }

  if (!isAdmin(request, env)) return json({ error: 'Clave incorrecta.' }, 401);

  if (request.method === 'GET') return json(await listChoices(env));

  if (request.method === 'DELETE') {
    const name = url.searchParams.get('name') || '';
    await env.CHOICES.delete(PREFIX + normalize(name));
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
