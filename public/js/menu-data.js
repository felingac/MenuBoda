// Fuente única del menú: la usan la carta, la página de resultados y el Worker (validación).
// Descripciones y precios (COP) tomados de la carta de Stellina. Los precios solo se
// muestran en /resultados; la carta de los invitados no los enseña.

export const STARTER = {
  id: 'chicharrones',
  name: 'Chicharrones y bastones de maíz',
  price: 34900,
  desc: 'Panza de cerdo y tiras de maíz tierno con miel de chile y gremolata.',
  img: 'img/chicharrones.jpg',
};

export const DISH_SECTIONS = [
  {
    id: 'para-todo-el-dia',
    title: 'Para todo el día',
    items: [
      {
        id: 'tilapia',
        name: 'Tilapia a la plancha',
        price: 34900,
        desc: 'Con reducción de vino, alcaparras. Acompañado de casco de papa amarilla.',
        img: 'img/tilapia.jpg',
      },
    ],
  },
  {
    id: 'pasta',
    title: 'Pasta',
    items: [
      {
        id: 'spaghetti',
        name: 'Spaghetti con albóndigas',
        price: 39900,
        desc: 'Res y salumis con salsa pomodoro, albahaca y grana padano.',
        img: 'img/spaghetti.jpg',
      },
      {
        id: 'fetuccini-pesto',
        name: 'Fetuccini al pesto y stracciatella',
        price: 38900,
        desc: 'Con tomate uvalina, nuez marañón y grana padano.',
        img: 'img/fetuccini-pesto.jpg',
      },
      {
        id: 'linguini-alfredo',
        name: 'Linguini Alfredo con pollo',
        price: 36900,
        desc: 'Pollo a la plancha, grana padano y albahaca.',
        img: 'img/linguini-alfredo.jpg',
      },
    ],
  },
  {
    id: 'lasagna',
    title: 'Lasagna',
    items: [
      {
        id: 'lasagna',
        name: 'Lasagna Bolognesa',
        price: 42900,
        desc: 'De res, salumis y pomodoro. Gratinado con mozzarella. Terminado con grana padano. Acompañado con pan de la casa.',
        img: 'img/lasagna.jpg',
      },
    ],
  },
  {
    id: 'pasta-rellena',
    title: 'Pasta Rellena',
    items: [
      {
        id: 'ravioli',
        name: 'Ravioli de lomo',
        price: 41900,
        desc: 'En salsa pomodoro y gratinado con mozzarella al horno de leña.',
        img: 'img/ravioli.jpg',
      },
    ],
  },
  {
    id: 'fuertes',
    title: 'Fuertes',
    items: [
      {
        id: 'striploin',
        name: 'Striploin nacional',
        price: 64900,
        desc: 'Chata de res (330 g) en mantequilla. Con ensalada de la casa y pasta al burro.',
        img: 'img/striploin.jpg',
      },
      {
        id: 'pollo',
        name: 'Pollo al horno de piedra',
        price: 44900,
        desc: 'Con poleo, mantequilla paprika y san marzano rostizado. Acompañado de cascos de papa amarilla y ensalada verde.',
        img: 'img/pollo.jpg',
      },
      {
        id: 'secreto',
        name: 'Secreto de cerdo',
        price: 44900,
        desc: 'Con jus de portobello, ensalada de san marzanos y cascos de papa amarilla.',
        img: 'img/secreto.jpg',
      },
      {
        id: 'arroz-mar',
        name: 'Arroz de mar',
        price: 48900,
        desc: 'Arroz cocido en caldo de langosta. Con pesca del día, langostinos, almejas, mejillones y calamar. Terminado con pesto de san marzano y berenjena al forno.',
        img: 'img/arroz-mar.jpg',
      },
      {
        id: 'milanesa',
        name: 'Milanesa',
        desc: 'Con pasta al burro y ensalada de la casa.',
        img: 'img/milanesa.jpg',
        options: [
          { id: 'pollo', label: 'De pollo', full: 'Milanesa de pollo', price: 40900 },
          { id: 'ternera', label: 'De ternera', full: 'Milanesa de ternera', price: 42900 },
        ],
      },
    ],
  },
];

export const DRINK_SECTIONS = [
  {
    id: 'gaseosas',
    title: 'Gaseosas',
    items: [
      { id: 'coca-cola', name: 'Coca Cola', price: 7900, img: 'img/coca-cola.jpg' },
      { id: 'ginger', name: 'Ginger', price: 7900, img: 'img/ginger.jpg' },
      { id: 'tonica', name: 'Soda tónica', price: 7900, img: 'img/tonica.jpg' },
    ],
  },
  {
    id: 'jugos',
    title: 'Jugos',
    items: [
      { id: 'sandia', name: 'Jugo de sandía', price: 8900, img: 'img/sandia.jpg' },
      { id: 'mandarina', name: 'Jugo de mandarina', price: 8900, img: 'img/mandarina.jpg' },
      { id: 'limonada', name: 'Limonada', price: 8900, img: 'img/limonada.jpg' },
    ],
  },
  {
    id: 'agua',
    title: 'Agua',
    items: [
      {
        id: 'agua',
        name: 'Agua Purezza',
        desc: 'Agua con o sin gas filtrada y mineralizada.',
        img: 'img/agua.jpg',
        options: [
          { id: 'sin-gas', label: 'Sin gas', full: 'Agua sin gas', price: 4900 },
          { id: 'con-gas', label: 'Con gas', full: 'Agua con gas', price: 4900 },
        ],
      },
    ],
  },
];

// Nombre final que se guarda para un ítem (+ opción, si la tiene).
export function choiceLabel(item, optionId) {
  if (!item.options) return item.name;
  const opt = item.options.find((o) => o.id === optionId);
  return opt ? opt.full : null;
}

function allLabels(sections) {
  return sections.flatMap((s) =>
    s.items.flatMap((it) => (it.options ? it.options.map((o) => o.full) : [it.name]))
  );
}

export const DISH_LABELS = allLabels(DISH_SECTIONS);
export const DRINK_LABELS = allLabels(DRINK_SECTIONS);

// Precio por nombre final guardado (plato, bebida o entrada).
export const PRICES = Object.fromEntries(
  [STARTER, ...[...DISH_SECTIONS, ...DRINK_SECTIONS].flatMap((s) => s.items)].flatMap((it) =>
    it.options ? it.options.map((o) => [o.full, o.price]) : [[it.name, it.price]]
  )
);

// La entrada se cuenta de forma genérica: esta cantidad para toda la mesa.
export const STARTER_QTY = 2;
