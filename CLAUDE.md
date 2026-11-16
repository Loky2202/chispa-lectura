# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

La guía principal del repo es `AGENTS.md` (comandos, cableado, reglas de contenido,
comportamiento del juego y cuidado de los datos). Se importa aquí para no duplicarla;
mantén esa como fuente única y agrega en este archivo solo lo que falte allá.

@AGENTS.md

## Flujo del contenido, de punta a punta

```
content/curriculum/*.mjs ──build.mjs──▶ content/worlds.json ──seedContent()──▶ SQLite (worlds, lessons)
        + legacy/worlds.legacy.json                                              │
                                                                  GET /api/content ▼
                                                       web: lib/store.ts → pages/Lesson.tsx → Activities.tsx
```

- En cada arranque, `seedContent` (`server/src/db.js`) **borra y reinserta** `worlds` y
  `lessons` desde `worlds.json`. Las tablas de progreso (`progress`, `attempts`,
  `mistakes`, `badges`, `unlocks`, `daily`, `audio`) no se tocan y se enlazan solo por el
  ID de lección: por eso un ID renombrado deja progreso huérfano.
- Las actividades viajan como JSON opaco en `lessons.activities`; el servidor no conoce
  sus tipos. El contrato vive en `web/src/types.ts`.
- Un tipo de actividad nuevo (o un campo nuevo) se toca en varios sitios a la vez:
  `content/tools/build.mjs` (lo genera), `content/tools/validate.mjs` (lo valida),
  `content/tools/docs.mjs` (manifiesto de audio), `web/src/types.ts`,
  `web/src/components/activities/<Tipo>.tsx` más el switch de `Activities.tsx` (lo dibuja), `web/src/pages/Lesson.tsx` y
  `web/src/lib/session.ts` (cómo se reintenta y cómo entra al repaso).

## Escribir una lección

`content/README.md` trae el ejemplo completo. Lo que no está en `AGENTS.md`:

- `syl`: sílabas de práctica. `words`: deben existir en `dict.mjs`.
- `sents`: `[frase, palabraDeLaImagen | null, preguntaOpcional]`; con `null` la frase
  solo se lee en voz alta.
- `extra`: palabras sin imagen (unir sílabas y dictado). `intro: { letter, note }`
  ajusta la tarjeta de presentación.

Tras editar el currículo, corre los tres scripts en orden (`build` → `validate` →
`docs`): los tres archivos generados van juntos en el mismo cambio.
