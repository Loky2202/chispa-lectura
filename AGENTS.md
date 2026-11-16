# AGENTS.md

App de lectura en español para un niño de 6 años. Dos paquetes sin workspace raíz:
`server/` (Fastify + `node:sqlite`) y `web/` (React 19 + Vite 7 + Tailwind v4 + PWA).
El currículo se escribe en `content/curriculum/`, se genera en `content/worlds.json` y
el servidor lo siembra en SQLite al arrancar.

## Comandos

Node 24 es obligatorio (`server` usa `node:sqlite`/`DatabaseSync`; el Dockerfile usa
`node:24-bookworm-slim`). No hay `package.json` en la raíz: ejecuta npm dentro de
`web/` o `server/`.

Docker (flujo normal):

```powershell
docker compose up -d --build   # cambios de código o dependencias
docker compose restart         # solo contenido regenerado
docker compose logs -f
```

La app queda en http://localhost:3100 (host 3100 → contenedor 3000; el 3000 lo usa
otro contenedor local). `content/` está montado de solo lectura: editarlo dentro del
contenedor no persiste; edita el archivo del host y reinicia.

Contenido (es generado, no se edita a mano):

```powershell
node content/tools/build.mjs      # curriculum/ -> content/worlds.json
node content/tools/validate.mjs   # debe imprimir "Errores: 0"
node content/tools/docs.mjs       # docs/CURRICULO.md + content/audio/manifest.json
```

Después de regenerar, `docker compose restart` basta. No edites `content/worlds.json`
directamente: se sobrescribe en cada build.

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
node content/tools/validate.mjs
```

No hay CI: corre estas comprobaciones a mano antes de dar algo por terminado.

## Cableado

- `server/src/index.js`: todas las rutas Fastify, estáticos de `web/dist` y fallback
  SPA (los 404 de `/api/` son aparte). `db.js`: esquema y seed. `rewards.js`: catálogo
  de coches, stickers y medallas.
- `web/src/App.tsx`: rutas. `components/Activities.tsx`: switch de los 14 tipos de
  actividad. `lib/store.ts`: Zustand + caché en localStorage + cola offline.
  `types.ts`: contrato del contenido.
- `content/curriculum/index.mjs`: orden de los mundos. `dict.mjs`: palabras con su
  emoji. `silabas.mjs`, `jardin.mjs`, `palabras.mjs`, `frases.mjs`, `montana.mjs`,
  `cuentos.mjs`: lecciones por mundo. `tools/lib.mjs`: sílabas y decodificabilidad.
  `tools/build.mjs`: genera las actividades. `tools/validate.mjs`: valida.
  `tools/docs.mjs`: documentación y manifiesto de audio.
- `content/legacy/worlds.legacy.json`: los dos primeros mundos (bosque, vocales).
- `content/worlds.json`, `docs/CURRICULO.md` y `content/audio/manifest.json` son
  generados. `content/audio/` solo trae manifiesto y líneas para grabación futura; la
  app usa TTS.
- `content/tools/build.mjs` es determinista: usa un RNG con semilla. Si regeneras sin
  cambiar el currículo, el diff debería ser vacío.

## Contenido: reglas

- Un dibujo nunca debe poder confundirse con la respuesta: los grupos están en
  `CONFUSABLE` (`dict.mjs`) y el validador lo exige. `ANIMATE` decide “¿Quién…?” / “¿Qué…?”.
- En `sents`, un tercer valor opcional es la pregunta de comprensión; si falta, el build
  la genera cuando puede.
- **Los IDs de lección son la clave del progreso: no los renombres.** No infieras el
  orden del mundo por el prefijo (`m7` es el 4.º mundo, no el 8.º).
- Palabras nuevas → `curriculum/dict.mjs` con un emoji único y claro.
- `validate.mjs` exige decodificabilidad: una frase solo puede usar letras/sílabas ya
  enseñadas. Si falla, cambia la frase o mueve la lección; no debilites el validador.
- Campos de lección: `unlock` (letras/sonidos que enseña), `sight` (palabras de
  memoria), `review` (toma sílabas/palabras de otras lecciones), `decodable: false`
  solo para actividades de audio.
- El build genera `audio: ''` (lectura silenciosa, sin audio automático) y
  `hideLabels: true` (oculta la palabra bajo la imagen). El código debe respetarlos.
- Las preguntas de `story` deben responderse con las páginas, no con el título.
- `build_word`: palabras cortas; la más larga actual es `bicicleta` (9 letras).
- UI y contenido en español latinoamericano neutro.

## Comportamiento del juego

- Lo que se falla vuelve una vez al final de la lección (máx. 4); si ahí sale bien a la
  primera deja de contar como error. Tras un error hay una pausa corta y al segundo
  error la respuesta brilla. `learn`, `blend` y `trace` no tienen error posible.
- Estrellas: 3 = sin errores pendientes, 2 = ≤2, 1 = completada. Con 1 estrella se
  avanza: no hay estados de fallo. El servidor limita a 1–3 y paga
  `stars*5 + 5` la primera vez.
- Desbloqueo de mundo: `ceil(leccionesDelMundoAnterior * 0.7)` completadas.
- Cada error se guarda en la tabla `mistakes` (qué debía encontrar y qué tocó). Con
  eso se arma el “Repaso de hoy” (`/repaso`, `lib/session.ts`) y la lista de la zona de
  Padres. Repaso espaciado: cada acierto a la primera en un repaso sube `stage` y aleja `due_at`
  (1, 3 y 7 días); al cuarto acierto queda `resolved`. Un nuevo error lo reinicia. El
  repaso elige al azar entre las actividades que coinciden y mezcla sus opciones.
- Una lección a medias se retoma: `chispa.resume.<perfil>` (24 h). El tiempo diario
  sugerido (15 min por defecto) solo invita a descansar, no bloquea; se guarda en el
  servidor (`/api/settings`, tabla `config`) y `chispa.dailyMinutes` es su copia local.
  Los segundos de una lección son tiempo activo (`createActiveClock`): no cuentan con la
  app en segundo plano y cada pausa sin tocar la pantalla suma 1 minuto como máximo.
- Voces grabadas: tabla `audio` (clave = texto normalizado) y `/api/audio`. `speak()`
  usa la grabación si existe y si no la voz del navegador. La grabadora también importa
  archivos en bloque: el nombre es el texto (`ma.mp3`) o el id de `content/audio/lineas.tsv`. Grabar exige HTTPS o localhost.
- Offline: claves `chispa.*` en localStorage; lecciones y repasos se encolan en
  `chispa.queue` y se envían al volver `online`. Cada envío lleva un `requestId` y el
  servidor (tabla `requests`) no lo guarda dos veces; un rechazo 4xx se descarta de la cola.
- TTS prefiere es-MX/es-419; el reconocimiento usa `webkitSpeechRecognition` con
  `es-MX`. Micrófono y PWA exigen HTTPS o localhost; por HTTP en LAN, `read_aloud`
  cae al botón “Ya leí”.
- La racha diaria usa `TZ` (por defecto `America/Mexico_City`).

## Datos: no romper el progreso real

- `data/lectura.db` contiene el progreso real del niño y está en `.gitignore`.
  Nunca lo borres, lo reinicies ni uses `docker compose down -v` para “arreglar” algo.
- Respaldo: el servidor guarda solo una copia diaria en `data/backups/auto-AAAA-MM-DD.db`
  (`VACUUM INTO`, conserva las últimas `BACKUP_KEEP`, 14 por defecto) y no toca archivos
  con otro nombre. La zona de Padres descarga una copia al momento (`/api/backup`, pide
  sesión de Padres). No copies el `.db` mientras el servidor corre.
- Zona de Padres: PIN guardado como hash en la tabla `config`; `/api/parents/login`
  entrega un token en memoria (2 h) que viaja en `x-parent-token`. Lo exigen
  `/api/parents/summary`, `/api/backup`, reiniciar progreso y grabar/borrar voces. PIN
  olvidado: arranca una vez con `PARENT_PIN_RESET=1`.
- El repo es público: no metas datos reales del niño en `content/` ni en commits.

## Estilo

- Tailwind v4 sin `tailwind.config.*`; los tokens viven en `web/src/index.css`
  (`pika`, `ink`, `cream`, `mint`, `grape`, `coral`, `sky`).
- Prioridad tablet: botones grandes, sin anuncios, sin castigos por error.
