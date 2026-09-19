import { STARTER, STARTER_QTY, DISH_LABELS, DRINK_LABELS, PRICES } from './menu-data.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const session = {
  get() { try { return sessionStorage.getItem('gk-key'); } catch { return null; } },
  set(v) { try { sessionStorage.setItem('gk-key', v); } catch { /* sin almacenamiento */ } },
  clear() { try { sessionStorage.removeItem('gk-key'); } catch { /* sin almacenamiento */ } },
};

let key = session.get();
let rows = [];

async function api(method, query = '') {
  const res = await fetch(`/api/choices${query}`, {
    method,
    cache: 'no-store',
    headers: { authorization: `Bearer ${key}` },
  });
  if (res.status === 401) throw Object.assign(new Error('Clave incorrecta.'), { auth: true });
  if (!res.ok) throw new Error('No se pudo conectar con el servidor.');
  return res.json();
}

async function load() {
  try {
    // Registros anteriores tenían una sola bebida (`drink`): cuenta como bebida para empezar.
    rows = (await api('GET')).map((r) => ({ drinkStart: r.drink, drinkEnd: null, ...r }));
    session.set(key);
    $('#login').hidden = true;
    $('#board').hidden = false;
    render();
  } catch (err) {
    if (err.auth) session.clear();
    $('#login').hidden = false;
    $('#board').hidden = true;
    $('#loginError').textContent = err.message;
  }
}

function tally(labels, fields) {
  const counts = Object.fromEntries(labels.map((l) => [l, 0]));
  rows.forEach((r) => fields.forEach((f) => r[f] && (counts[r[f]] = (counts[r[f]] || 0) + 1)));
  const max = Math.max(1, ...Object.values(counts));
  const list = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<p class="empty">Aún no hay elecciones.</p>';
  return list
    .map(
      ([name, n]) => `
      <div class="bar">
        <span class="bar__name">${esc(name)}</span>
        <span class="bar__count">${n}</span>
        <div class="bar__track"><div class="bar__fill" style="width:${(n / max) * 100}%"></div></div>
      </div>`
    )
    .join('');
}

const money = (n) => '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
const price = (label) => PRICES[label] ?? 0;
const drinksPrice = (r) => price(r.drinkStart) + price(r.drinkEnd);
const drinkCount = () => rows.reduce((n, r) => n + !!r.drinkStart + !!r.drinkEnd, 0);

// Total genérico: la entrada cuenta STARTER_QTY veces para toda la mesa, más el plato
// y la bebida de cada invitado.
function totals() {
  const starter = STARTER.price * STARTER_QTY;
  const dishes = rows.reduce((sum, r) => sum + price(r.dish), 0);
  const drinks = rows.reduce((sum, r) => sum + drinksPrice(r), 0);
  return { starter, dishes, drinks, total: starter + dishes + drinks };
}

const fmtTime = (iso) =>
  new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const drinkCell = (label) =>
  label ? `<td>${esc(label)}<span class="price">${money(price(label))}</span></td>` : '<td class="fixed">—</td>';

function render() {
  const favorite = (field) => {
    const c = {};
    rows.forEach((r) => (c[r[field]] = (c[r[field]] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  };
  const t = totals();
  $('#stats').innerHTML = `
    <div class="stat"><div class="stat__num">${rows.length}</div><div class="stat__label">Invitados</div></div>
    <div class="stat"><div class="stat__num stat__num--money">${money(t.total)}</div><div class="stat__label">Total del menú</div></div>
    <div class="stat"><div class="stat__num" style="font-size:22px;line-height:1.2">${esc(favorite('dish'))}</div><div class="stat__label">Plato favorito</div></div>`;

  $('#dishTally').innerHTML = tally(DISH_LABELS, ['dish']);
  $('#drinkTally').innerHTML = tally(DRINK_LABELS, ['drinkStart', 'drinkEnd']);

  const q = $('#search').value.trim().toLowerCase();
  const visible = rows.filter((r) => !q || r.name.toLowerCase().includes(q));
  $('#rows').innerHTML = visible.length
    ? visible
        .map(
          (r, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name">${esc(r.name)}</td>
        <td class="fixed">${esc(r.starter || STARTER.name)}</td>
        <td>${esc(r.dish)}<span class="price">${money(price(r.dish))}</span></td>
        ${drinkCell(r.drinkStart)}
        ${drinkCell(r.drinkEnd)}
        <td class="money">${money(price(r.dish) + drinksPrice(r))}</td>
        <td class="time">${fmtTime(r.updatedAt || r.createdAt)}</td>
        <td><button class="del" data-name="${esc(r.name)}" type="button">Borrar</button></td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="9" class="empty" style="text-align:center">${rows.length ? 'Sin resultados para esa búsqueda.' : 'Aún no hay elecciones.'}</td></tr>`;

  $('#foot').innerHTML = `
    <tr><td colspan="6">Entrada · ${esc(STARTER.name)} × ${STARTER_QTY} <span class="price">${money(STARTER.price)} c/u</span></td><td class="money">${money(t.starter)}</td><td colspan="2"></td></tr>
    <tr><td colspan="6">Platos fuertes (${rows.length})</td><td class="money">${money(t.dishes)}</td><td colspan="2"></td></tr>
    <tr><td colspan="6">Bebidas (${drinkCount()})</td><td class="money">${money(t.drinks)}</td><td colspan="2"></td></tr>
    <tr class="grand"><td colspan="6">Total del menú</td><td class="money">${money(t.total)}</td><td colspan="2"></td></tr>`;
}

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

$('#login').addEventListener('submit', (e) => {
  e.preventDefault();
  key = $('#key').value;
  $('#loginError').textContent = '';
  load();
});
$('#search').addEventListener('input', render);
$('#refresh').addEventListener('click', load);
$('#jsonBtn').addEventListener('click', () =>
  download(
    'elecciones-gk.json',
    JSON.stringify(
      {
        invitados: rows.map(({ drink, ...r }) => ({
          ...r,
          dishPrice: price(r.dish),
          drinkStartPrice: price(r.drinkStart),
          drinkEndPrice: price(r.drinkEnd),
        })),
        totales: { ...totals(), starterQty: STARTER_QTY, starterPrice: STARTER.price },
      },
      null,
      2
    ),
    'application/json'
  )
);
$('#csv').addEventListener('click', () => {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const t = totals();
  const lines = [
    ['Invitado', 'Entrada', 'Plato fuerte', 'Precio plato', 'Bebida para empezar', 'Precio', 'Bebida para terminar', 'Precio', 'Subtotal', 'Fecha'].map(cell).join(','),
    ...rows.map((r) =>
      [r.name, r.starter || STARTER.name, r.dish, price(r.dish), r.drinkStart, price(r.drinkStart), r.drinkEnd ?? '', price(r.drinkEnd), price(r.dish) + drinksPrice(r), r.updatedAt || r.createdAt]
        .map(cell)
        .join(',')
    ),
    '',
    [`Entrada x ${STARTER_QTY}`, '', '', '', '', '', '', '', t.starter].map(cell).join(','),
    ['Platos fuertes', '', '', '', '', '', '', '', t.dishes].map(cell).join(','),
    ['Bebidas', '', '', '', '', '', '', '', t.drinks].map(cell).join(','),
    ['Total del menú', '', '', '', '', '', '', '', t.total].map(cell).join(','),
  ];
  download('elecciones-gk.csv', '﻿' + lines.join('\n'), 'text/csv;charset=utf-8');
});
$('#rows').addEventListener('click', async (e) => {
  const btn = e.target.closest('.del');
  if (!btn || !confirm(`¿Borrar la elección de ${btn.dataset.name}?`)) return;
  btn.disabled = true;
  try {
    await api('DELETE', `?name=${encodeURIComponent(btn.dataset.name)}`);
    // Se quita de la tabla en el acto, sin esperar a que el servidor vuelva a listar.
    rows = rows.filter((r) => r.name !== btn.dataset.name);
    render();
  } catch (err) {
    btn.disabled = false;
    alert(err.message);
  }
});

if (key) load();
