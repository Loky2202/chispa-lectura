# AGENTS.md

App de lectura en español para un niño de 6 años. Dos paquetes sin workspace raíz:
`server/` (Fastify + `node:sqlite`) y `web/` (React 19 + Vite 7 + Tailwind v4 + PWA).
El currículo vive en `content/worlds.json` y se siembra en SQLite al arrancar.

## Comandos

Node 24 es obligatorio (`server` usa `node:sqlite`/`DatabaseSync`; el Dockerfile usa
`node:24-bookworm-slim`). No hay `package.json` en la raíz: ejecuta npm dentro de
`web/` o `server/`.

Docker (flujo normal):

```powershell
docker compose up -d --build   # cambios de código o dependencias
docker compose restart         # solo cambios en content/worlds.json
docker compose logs -f
```

La app queda en http://localhost:3100 (host 3100 → contenedor 3000; el 3000 lo usa
otro contenedor local). `content/` está montado de solo lectura: editarlo dentro del
contenedor no persiste; edita el archivo del host y reinicia.

Desarrollo local (dos terminales):

```powershell
cd server; npm install; $env:PORT='3100'; npm run dev
cd web; npm install; npm run dev    # http://localhost:5173
```

`web/vite.config.ts` fija el proxy `/api` a `http://localhost:3100`; el servidor local
debe escuchar en 3100. El servidor sirve `web/dist` si existe, así que para probar el
flujo completo local compila la web antes.

Verificación (no hay tests ni lint; no inventes `npm test`):

```powershell
cd web; npm run typecheck; npm run build
node -e "JSON.parse(require('fs').readFileSync('content/worlds.json','utf8'))"
```

No hay CI: corre estas comprobaciones a mano antes de dar algo por terminado.

## Cableado

- `server/src/index.js`: todas las rutas Fastify, estáticos de `web/dist` y fallback
  SPA (los 404 de `/api/` son aparte). `db.js`: esquema y seed. `rewards.js`: catálogo
  de coches, stickers y medallas.
- `web/src/App.tsx`: rutas. `components/Activities.tsx`: switch de los 11 tipos de
  actividad. `lib/store.ts`: Zustand + caché en localStorage + cola offline.
  `types.ts`: contrato del contenido.
- `content/worlds.json` es la única fuente del currículo. No hay migraciones: el
  esquema usa `CREATE TABLE IF NOT EXISTS`.

## Contenido: trampas verificadas

- Al arrancar, el servidor hace `DELETE` + `INSERT` de `worlds` y `lessons` desde el
  JSON; `progress`, `attempts`, `badges`, `daily` y `unlocks` sobreviven. **El
  `lesson.id` es la clave del progreso: nunca renombres una lección existente.**
- IDs: `m{índiceMundo}-l{n}` (m0 bosque … m6 cuentos). Actividades: `a1`, `a2`… por
  lección.
- Todo `answer` debe estar en `options` (comparación sin mayúsculas ni tildes vía
  `normalize`) y las opciones no deben repetirse.
- `missing_letter`: `display` mide igual que `word`, tiene exactamente un `_` y el
  hueco debe corresponder a `answer` (ej. `word: "ala"`, `display: "_la"`,
  `answer: "a"`). La respuesta es una sola vocal.
- `count_syllables`: `answer` = número de grupos vocálicos de `word`.
- `word_picture` con “¿Cuál empieza con X?”: la respuesta empieza con X y ninguna otra
  opción lo hace.
- `sentence_picture`: la respuesta debe aparecer en `sentence`.
- `story`: cada pregunta debe responderse con las páginas, no con el título; evita
  distractores que también aparezcan en el texto.
- `build_word`: sin espacios; palabras de ≤8 letras para un niño de 6 años.
- Las metas deben describir lo que la lección realmente practica (las lecciones
  `m2-*` cubren las cinco sílabas de su consonante).
- UI y contenido en español latinoamericano neutro.

## Comportamiento del juego

- Estrellas: 3 = sin errores, 2 = ≤2 errores, 1 = completada. Con 1 estrella se
  avanza: no hay estados de fallo. El servidor limita a 1–3 y paga
  `stars*5 + 5` la primera vez.
- Desbloqueo de mundo: `ceil(leccionesDelMundoAnterior * 0.7)` completadas.
- Offline: claves `chispa.*` en localStorage; las lecciones se encolan en
  `chispa.queue` y se envían al volver `online`.
- TTS prefiere es-MX/es-419; el reconocimiento usa `webkitSpeechRecognition` con
  `es-MX`. Micrófono y PWA exigen HTTPS o localhost; por HTTP en LAN, `read_aloud`
  cae al botón “Ya leí”.
- La racha diaria usa `TZ` (por defecto `America/Mexico_City`).

## Datos: no romper el progreso real

- `data/lectura.db` contiene el progreso real del niño y está en `.gitignore`.
  Nunca lo borres, lo reinicies ni uses `docker compose down -v` para “arreglar” algo.
- Respaldo: `/api/backup` (hace checkpoint del WAL) o la zona de Padres. No copies el
  `.db` mientras el servidor corre.
- El repo es público: no metas datos reales del niño en `content/` ni en commits.

## Estilo

- Tailwind v4 sin `tailwind.config.*`; los tokens viven en `web/src/index.css`
  (`pika`, `ink`, `cream`, `mint`, `grape`, `coral`, `sky`).
- Prioridad tablet: botones grandes, sin anuncios, sin castigos por error.
