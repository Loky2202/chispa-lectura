# Contenido de Chispa Lectura

`worlds.json` **se genera**; no se edita a mano. La fuente está en `curriculum/`.

```bash
node content/tools/build.mjs      # curriculum/ → content/worlds.json
node content/tools/validate.mjs   # estructura + decodificabilidad (debe dar 0 errores)
node content/tools/docs.mjs       # docs/CURRICULO.md + content/audio/manifest.json
```

| Archivo | Para qué sirve |
|---|---|
| `curriculum/index.mjs` | Orden de los mundos |
| `curriculum/dict.mjs` | Palabras con su imagen (emoji) |
| `curriculum/silabas.mjs` … `cuentos.mjs` | Las lecciones de cada mundo |
| `tools/lib.mjs` | Motor de sílabas del español (separa y comprueba qué se puede leer) |
| `tools/build.mjs` | Arma las actividades de cada lección |
| `tools/validate.mjs` | Revisa que todo lo que el niño lee sea decodificable |
| `tools/docs.mjs` | Genera el documento del currículo y la lista de audios |
| `legacy/worlds.legacy.json` | Contenido original (lo usan los dos primeros mundos) |

## Cómo añadir una lección

1. Si usa palabras nuevas, agrégalas a `dict.mjs` con un emoji claro y distinto.
2. Añade la lección al archivo de su mundo:

```js
{ id: 'm7-l19', title: 'La letra X', emoji: '🎷', goal: 'Leer xa xe xi xo xu',
  unlock: ['x'],                  // letras o sonidos que la lección enseña
  sight: ['hoy'],                 // palabras que se aprenden de memoria
  syl: ['xa', 'xe', 'xi'],        // sílabas de práctica
  words: ['saxofón'],             // palabras (deben existir en dict.mjs)
  sents: [['Papá usa el saxofón.', 'saxofón'], ['Hoy sale el sol.', null]] }
```

En `sents`, el segundo valor es la palabra cuya imagen hay que elegir; con `null` la frase solo se lee en voz alta. Un tercer valor opcional es la pregunta que se dice en voz alta (`['Mamá toma café en la taza.', 'taza', '¿En qué toma café mamá?']`); si no lo pones, se genera sola cuando la frase es sencilla (“¿Quién…?”, “¿Qué…?”).

Otros campos: `extra` (palabras sin imagen para unir sílabas y dictado) e `intro: { letter, note }` (ajusta la tarjeta de presentación). Si dos dibujos se parecen, agrégalos a un grupo de `CONFUSABLE` en `dict.mjs` para que nunca salgan juntos.

3. `node content/tools/build.mjs && node content/tools/validate.mjs`

**Reglas que no hay que romper**
- No cambies los IDs (`m2-l3`…): el progreso guardado se enlaza por ellos.
- Si el validador dice “no es decodificable todavía”, la frase usa una letra aún no enseñada: cambia la frase o mueve la lección.
- Una lección puede traer `review: ['m7-l1', 'm7-l2']` y toma sílabas y palabras de esas lecciones.
