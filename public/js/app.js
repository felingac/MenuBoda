import { STARTER, DISH_SECTIONS, DRINK_SECTIONS, choiceLabel } from './menu-data.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Estado de la selección: { itemId, optionId } por tipo. Hay dos bebidas: una para empezar
// y otra para terminar; ambas salen de la misma lista.
const KINDS = ['dish', 'drinkStart', 'drinkEnd'];
const DRINK_SLOTS = [
  { kind: 'drinkStart', title: 'Para empezar', note: 'Para acompañar la entrada' },
  { kind: 'drinkEnd', title: 'Para terminar', note: 'Para cerrar el almuerzo' },
];
const state = { dish: null, drinkStart: null, drinkEnd: null };
const drinkItems = {};
DRINK_SECTIONS.forEach((s) => s.items.forEach((it) => (drinkItems[it.id] = { ...it, group: s.title })));
const itemsById = { dish: {}, drinkStart: drinkItems, drinkEnd: drinkItems };
DISH_SECTIONS.forEach((s) => s.items.forEach((it) => (itemsById.dish[it.id] = it)));

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

/* ---------- Render ---------- */

function sectionHead(title, note) {
  return `
    <div class="section__head">
      <svg class="section__branch" aria-hidden="true"><use href="#branch"/></svg>
      <h2 class="section__title">${esc(title)}</h2>
      <div class="rule"><span></span></div>
      ${note ? `<p class="section__note">${esc(note)}</p>` : ''}
    </div>`;
}

function card(item, kind) {
  const opts = chips(item);
  return `
    <article class="card card--${kind}" data-kind="${kind}" data-id="${item.id}" tabindex="0" role="button" aria-pressed="false">
      <div class="card__media">
        <img src="${item.img}" alt="${esc(item.name)}" loading="lazy" width="900" height="675">
        <span class="card__check" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        </span>
      </div>
      <div class="card__body">
        <h3 class="card__name">${esc(item.name)}</h3>
        ${item.desc ? `<p class="card__desc">${esc(item.desc)}</p>` : ''}
        ${opts}
      </div>
    </article>`;
}

function chips(item) {
  return item.options
    ? `<div class="chips" role="radiogroup" aria-label="Opciones de ${esc(item.name)}">
        ${item.options
          .map((o) => `<button type="button" class="chip" role="radio" aria-checked="false" data-opt="${o.id}">${esc(o.label)}</button>`)
          .join('')}
      </div>`
    : '';
}

// Mosaico compacto para bebidas: foto pequeña + nombre.
function tile(item, kind) {
  return `
    <article class="card card--tile" data-kind="${kind}" data-id="${item.id}" tabindex="0" role="button" aria-pressed="false">
      <div class="tile__media">
        <img src="${item.img}" alt="" loading="lazy" width="900" height="675">
        <span class="card__check" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        </span>
      </div>
      <div class="tile__body">
        <span class="tile__group">${esc(item.group)}</span>
        <h4 class="card__name">${esc(item.name)}</h4>
        ${chips(item)}
      </div>
    </article>`;
}

function render() {
  const tabs = [
    { id: 'antipasti', title: 'Antipasti' },
    ...DISH_SECTIONS.map((s) => ({ id: s.id, title: s.title })),
    { id: 'bebidas', title: 'Bebidas' },
  ];
  $('#tabs').innerHTML = tabs.map((t) => `<a href="#sec-${t.id}" data-tab="${t.id}">${esc(t.title)}</a>`).join('');

  const starter = `
    <section class="section" id="sec-antipasti">
      ${sectionHead('Antipasti', 'Entrada para compartir · servida a todos')}
      <article class="starter">
        <div class="starter__media"><img src="${STARTER.img}" alt="${esc(STARTER.name)}" loading="lazy" width="900" height="675"></div>
        <div class="starter__body">
          <span class="badge">Para todos</span>
          <h3 class="card__name">${esc(STARTER.name)}</h3>
          <p class="card__desc">${esc(STARTER.desc)}</p>
        </div>
      </article>
    </section>`;

  const intro = `
    <div class="step">
      <span class="step__num">1</span>
      <p>Elige tu <strong>plato fuerte</strong></p>
    </div>`;

  const dishes = DISH_SECTIONS.map(
    (s) => `
    <section class="section" id="sec-${s.id}">
      ${sectionHead(s.title)}
      <div class="grid grid--dish">${s.items.map((it) => card(it, 'dish')).join('')}</div>
    </section>`
  ).join('');

  const drinks = `
    <section class="section section--drinks" id="sec-bebidas">
      <div class="step"><span class="step__num">2</span><p>Elige tus <strong>dos bebidas</strong></p></div>
      ${sectionHead('Bebidas', 'Una para empezar y otra para terminar')}
      ${DRINK_SLOTS.map(
        (slot, i) => `
        <div class="drinks" id="slot-${slot.kind}">
          <div class="drinks__head">
            <span class="drinks__num">${i + 1}</span>
            <div>
              <h3 class="drinks__title">${slot.title}</h3>
              <p class="drinks__note">${slot.note}</p>
            </div>
          </div>
          <div class="grid grid--tile">${Object.values(drinkItems).map((it) => tile(it, slot.kind)).join('')}</div>
        </div>`
      ).join('')}
    </section>`;

  $('#menu').innerHTML = starter + intro + dishes + drinks;
}

/* ---------- Selección ---------- */

function select(kind, id, optionId) {
  const item = itemsById[kind][id];
  const cur = state[kind];
  // Si la opción no viene y ya estaba elegido el mismo ítem, se conserva la opción previa.
  const keepOpt = cur && cur.itemId === id ? cur.optionId : null;
  state[kind] = { itemId: id, optionId: optionId ?? keepOpt ?? (item.options ? null : undefined) };
  sync();
}

function labelFor(kind) {
  const s = state[kind];
  if (!s) return null;
  return choiceLabel(itemsById[kind][s.itemId], s.optionId);
}

function sync() {
  document.querySelectorAll('.card').forEach((el) => {
    const s = state[el.dataset.kind];
    const on = !!s && s.itemId === el.dataset.id;
    el.classList.toggle('is-selected', on);
    el.setAttribute('aria-pressed', on);
    const needsOpt = on && itemsById[el.dataset.kind][el.dataset.id].options && !s.optionId;
    el.classList.toggle('needs-option', !!needsOpt);
    el.querySelectorAll('.chip').forEach((c) => {
      const active = on && c.dataset.opt === s.optionId;
      c.classList.toggle('is-active', active);
      c.setAttribute('aria-checked', active);
    });
  });

  const labels = Object.fromEntries(KINDS.map((k) => [k, labelFor(k)]));
  const hint = (kind) => {
    const s = state[kind];
    if (!s) return 'Sin elegir';
    const it = itemsById[kind][s.itemId];
    return it.options ? 'Elige una opción' : 'Sin elegir';
  };
  for (const k of KINDS) {
    const el = document.querySelector(`[data-tray="${k}"]`);
    el.textContent = labels[k] || hint(k);
    el.classList.toggle('is-empty', !labels[k]);
  }
  $('#tray').hidden = KINDS.every((k) => !state[k]);
  document.body.classList.toggle('has-tray', !$('#tray').hidden);

  const btn = $('#trayBtn');
  const missing = missingKind();
  btn.classList.toggle('is-disabled', !!missing);
  btn.setAttribute('aria-disabled', !!missing);
  btn.textContent = !missing ? 'Continuar' : missing === 'dish' ? 'Falta el plato' : 'Falta bebida';

  store.set('gk-draft', state);
}

function missingKind() {
  return KINDS.find((k) => !labelFor(k));
}

function bindCards() {
  $('#menu').addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;
    const chip = e.target.closest('.chip');
    const kind = cardEl.dataset.kind;
    const wasEmpty = !labelFor(kind);
    select(kind, cardEl.dataset.id, chip ? chip.dataset.opt : undefined);
    // Al completar la bebida para empezar, se pasa sola a la de terminar.
    if (kind === 'drinkStart' && wasEmpty && labelFor(kind) && !state.drinkEnd) {
      setTimeout(() => $('#slot-drinkEnd').scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
  });
  $('#menu').addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) {
      e.preventDefault();
      select(e.target.dataset.kind, e.target.dataset.id);
    }
  });
  // Si falta algo, el botón lleva a la sección pendiente en vez de abrir el formulario.
  $('#trayBtn').addEventListener('click', () => {
    if (!missingKind()) openSheet();
    else scrollToMissing();
  });
}

function scrollToMissing() {
  const kind = missingKind();
  if (!kind) return;
  const s = state[kind];
  const target = s
    ? document.querySelector(`.card[data-kind="${kind}"][data-id="${s.itemId}"]`)
    : kind === 'dish' ? $('#sec-para-todo-el-dia') : $(`#slot-${kind}`);
  target?.scrollIntoView({ behavior: 'smooth', block: s ? 'center' : 'start' });
}

/* ---------- Pestañas activas ---------- */

function bindTabs() {
  const links = [...document.querySelectorAll('#tabs a')];
  const sections = [...document.querySelectorAll('.section')];
  let current = null;
  const update = () => {
    // Sección activa: la última cuyo inicio ya pasó bajo la barra superior.
    const offset = $('.topbar').offsetHeight + 120;
    let active = null;
    for (const sec of sections) if (sec.getBoundingClientRect().top <= offset) active = sec.id.replace('sec-', '');
    // Al final de la página la última sección puede no llegar arriba.
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) active = sections.at(-1).id.replace('sec-', '');
    if (active === current) return;
    current = active;
    links.forEach((a) => {
      const on = a.dataset.tab === active;
      a.classList.toggle('is-active', on);
      if (on) a.parentElement.scrollTo({ left: a.offsetLeft - a.parentElement.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
    });
  };
  addEventListener('scroll', update, { passive: true });
  update();
}

/* ---------- Envío ---------- */

function openSheet() {
  $('#sumStarter').textContent = STARTER.name;
  $('#sumDish').textContent = labelFor('dish');
  $('#sumDrinkStart').textContent = labelFor('drinkStart');
  $('#sumDrinkEnd').textContent = labelFor('drinkEnd');
  $('#formError').textContent = '';
  const saved = store.get('gk-sent');
  if (saved?.name && !$('#name').value) $('#name').value = saved.name;
  $('#sheet').hidden = false;
  document.body.classList.add('no-scroll');
  setTimeout(() => $('#name').focus(), 250);
}

function closeSheet() {
  $('#sheet').hidden = true;
  document.body.classList.remove('no-scroll');
}

function showThanks(rec) {
  $('#thanksName').textContent = rec.name.split(' ')[0];
  const drinks = rec.drinkStart === rec.drinkEnd
    ? `${rec.drinkStart} para empezar y para terminar`
    : `${rec.drinkStart} para empezar y ${rec.drinkEnd} para terminar`;
  $('#thanksText').textContent = `Te espera ${rec.dish}, con ${drinks}. La entrada llega a la mesa para todos. ¡Buen provecho!`;
  $('#thanks').hidden = false;
  document.body.classList.add('no-scroll');
}

function bindForm() {
  document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeSheet));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !$('#sheet').hidden && closeSheet());

  $('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#name').value.trim().replace(/\s+/g, ' ');
    if (name.length < 2) {
      $('#formError').textContent = 'Escribe tu nombre para que sepamos de quién es este plato.';
      $('#name').focus();
      return;
    }
    const payload = { name, dish: labelFor('dish'), drinkStart: labelFor('drinkStart'), drinkEnd: labelFor('drinkEnd') };
    const btn = $('#sendBtn');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    $('#formError').textContent = '';
    try {
      const res = await fetch('/api/choices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No pudimos guardar tu elección.');
      store.set('gk-sent', payload);
      closeSheet();
      showThanks(payload);
    } catch (err) {
      $('#formError').textContent = `${err.message} Inténtalo de nuevo en un momento.`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar';
    }
  });

  $('#changeBtn').addEventListener('click', () => {
    $('#thanks').hidden = true;
    document.body.classList.remove('no-scroll');
    $('#sec-para-todo-el-dia').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ---------- Inicio ---------- */

render();
bindCards();
bindTabs();
bindForm();

const draft = store.get('gk-draft');
if (draft) {
  for (const kind of KINDS) {
    const d = draft[kind];
    if (d && itemsById[kind][d.itemId]) state[kind] = { itemId: d.itemId, optionId: d.optionId ?? undefined };
  }
}
sync();
