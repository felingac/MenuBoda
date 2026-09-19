# Menú de bodas G & K

Carta digital para el almuerzo de bodas (basada en la carta de Stellina). Cada invitado elige
**plato fuerte + una bebida para empezar + una para terminar**, escribe su nombre y envía. La entrada (chicharrones y bastones de maíz)
es la misma para todos. Los novios ven la tabla en `/resultados` con una clave.

```
public/
  index.html          portada G & K + carta + formulario
  resultados.html     tabla de elecciones (con clave)
  css/styles.css
  js/menu-data.js     platos, bebidas y descripciones (fuente única)
  js/app.js           carta y envío
  js/resultados.js    tabla, conteos, CSV/JSON
  img/                fotos (créditos en img/CREDITS.md)
src/worker.js         Cloudflare Worker: API + archivos estáticos
wrangler.toml
dev-server.py         servidor local de pruebas (misma API, guarda choices.json)
```

## Publicar en Cloudflare Workers

Requiere Node 18+.

```bash
npx wrangler login
npx wrangler kv namespace create CHOICES
```

Copia el `id` que imprime el último comando en `wrangler.toml` (`REEMPLAZAR_CON_EL_ID_DE_KV`).

```bash
npx wrangler secret put ADMIN_KEY
npx wrangler deploy
```

- Carta: `https://menu-gk.<tu-subdominio>.workers.dev/`
- Elecciones: `https://menu-gk.<tu-subdominio>.workers.dev/resultados`, con la clave que pusiste en `ADMIN_KEY`.

## Probar en local

Sin Node (solo Python 3):

```bash
ADMIN_KEY=mi-clave python3 dev-server.py
```

Abre http://localhost:8787 (la clave por defecto de `/resultados` es `gk-local`).

Con Wrangler: copia `.dev.vars.example` a `.dev.vars` y ejecuta `npx wrangler dev`.

## API

| Método | Ruta | Clave | Uso |
|---|---|---|---|
| `POST` | `/api/choices` | no | `{ name, dish, drinkStart, drinkEnd }`. Si el mismo nombre envía otra vez, se reemplaza su elección. |
| `GET` | `/api/choices` | sí | Lista JSON con todas las elecciones. |
| `DELETE` | `/api/choices?name=…` | sí | Borra la elección de un invitado. |

La clave va en `Authorization: Bearer <ADMIN_KEY>`. Cada elección se guarda en KV como
`{ name, starter, dish, drinkStart, drinkEnd, createdAt, updatedAt }`.
Los registros antiguos con una sola bebida (`drink`) se muestran como bebida para empezar.

## Cambiar platos o textos

Edita `public/js/menu-data.js`. El Worker valida los envíos con esa misma lista, así que la carta
y la validación no se desincronizan.
