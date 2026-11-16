// Genera docs/CURRICULO.md (tablas + guiones) y content/audio/ (lista de frases para voz grabada).
// Uso:  node content/tools/docs.mjs      (después de build.mjs)
// Desarrollado por Christopher Flores
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', '..')
const data = JSON.parse(fs.readFileSync(path.join(root, 'content', 'worlds.json'), 'utf8'))

// ---------- 1) Lista de audios ----------
const lines = new Map()
const add = (text) => { const t = String(text ?? '').trim(); if (t) lines.set(t, true) }
const FIXED = ['¡Muy bien!', '¡Genial!', '¡Excelente!', '¡Lo lograste!', '¡Eres increíble!', '¡Qué grande!',
  'Casi. ¡Intenta otra vez!', 'Casi casi. ¡Otra vez!', 'Tú puedes. ¡Prueba de nuevo!', '¿Qué vocal falta?',
  'Mira y escucha la secuencia. Después repítela.', 'Lee la palabra y toca su dibujo.', 'Lee la frase y toca el dibujo.',
  'Toca cada sílaba para escucharla.', 'Toca las sílabas y júntalas.', 'Lee la frase en voz alta.', 'Lee la frase.', 'Toca la letra para escucharla.',
  'Dibuja la letra con tu dedo.', 'Junta la mayúscula con su minúscula.', 'Encuentra las parejas iguales', 'Arma la palabra.',
  'Vamos a leerla juntos.', 'Ahora tú.', '¡Leíste muy bien!']
FIXED.forEach(add)
for (const w of data.worlds) for (const l of w.lessons) for (const a of l.activities) {
  switch (a.type) {
    case 'listen_tap': add(a.audio); a.options.forEach(add); break
    case 'word_picture': add(a.audio === '' ? a.answer : (a.audio ?? a.prompt)); a.options.forEach((o) => add(o.label)); break
    case 'build_word': case 'missing_letter': case 'count_syllables': add(a.word); break
    case 'learn': add(a.say); add(a.note); add(a.keyword); a.syllables.forEach(add); break
    case 'blend': add(a.word); a.parts.forEach(add); break
    case 'trace': add(a.letter); break
    case 'sentence_picture': add(a.sentence); add(a.question); break
    case 'read_aloud': add(a.text); break
    case 'odd_one_out': add(a.prompt); break
    case 'story': a.pages.forEach((p) => add(p.text)); a.questions.forEach((q) => { add(q.q); q.options.forEach(add) }); break
    default: break
  }
}
const manifest = [...lines.keys()].sort((x, y) => x.localeCompare(y, 'es')).map((text) => ({
  id: crypto.createHash('sha1').update(text.toLowerCase().normalize('NFC')).digest('hex').slice(0, 12), text
}))
fs.mkdirSync(path.join(root, 'content', 'audio'), { recursive: true })
fs.writeFileSync(path.join(root, 'content', 'audio', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
fs.writeFileSync(path.join(root, 'content', 'audio', 'lineas.tsv'), manifest.map((m) => `${m.id}\t${m.text}`).join('\n') + '\n')

// ---------- 2) Documento del currículo ----------
const unitName = (u) => u.startsWith('-') ? `final ${u.slice(1)}` : u === 'tilde' ? 'tilde (á é í ó ú)' : u
let totalLessons = 0, totalActs = 0, reading = 0
const rows = []
for (const w of data.worlds) {
  rows.push(`\n### ${w.emoji} ${w.title} · *${w.subtitle}*\n`)
  rows.push('| Lección | Qué aprende | Sílabas / palabras de práctica | Frase de ejemplo |')
  rows.push('|---|---|---|---|')
  for (const l of w.lessons) {
    totalLessons++
    const acts = l.activities
    totalActs += acts.length
    acts.forEach((a) => { if (['sentence_picture', 'read_aloud', 'story'].includes(a.type) || (a.type === 'word_picture' && a.audio === '')) reading++ })
    const learn = [...(l.unlocks ?? []).map(unitName), ...(l.sight ?? []).map((s) => `“${s}” (palabra mágica)`)].join(', ') || l.goal
    const sample = acts.find((a) => a.type === 'read_aloud')?.text ?? acts.find((a) => a.type === 'sentence_picture')?.sentence ?? acts.find((a) => a.type === 'story')?.pages?.[0]?.text ?? ''
    const practice = [(l.syllables ?? []).slice(0, 6).join(' '), (l.words ?? []).slice(0, 10).join(', ') + ((l.words ?? []).length > 10 ? '…' : '')].filter(Boolean).join(' · ')
    rows.push(`| **${l.title}** (\`${l.id}\`) | ${learn} | ${practice || '—'} | ${sample || '—'} |`)
  }
}

const doc = `# Currículo de lectura de Chispa

> Desarrollado por Christopher Flores · generado con \`node content/tools/docs.mjs\`

**${data.worlds.length} mundos · ${totalLessons} lecciones · ${totalActs} actividades** (${reading} piden leer texto de verdad).

## 1. Principios

1. **Todo lo que el niño lee es decodificable.** Cada palabra de una frase o cuento usa solo sílabas que ya practicó (o una *palabra mágica* enseñada antes). El validador lo comprueba sílaba por sílaba; si una frase no se puede leer con lo aprendido, el contenido no se genera.
2. **Orden de lo fácil a lo difícil:** sonidos → vocales → sílabas directas (consonante + vocal) → palabras → frases → sílabas inversas (an, er, os…) → trabadas (bla, tra…) → diptongos → cuentos.
3. **Primero se enseña, después se pregunta.** Cada letra nueva empieza con una tarjeta de presentación (la letra, una palabra clave y sus sílabas para tocar y escuchar) y con el juego de *unir sílabas* (ma + má → mamá). En esas dos actividades no hay forma de equivocarse.
4. **Leer primero, escuchar después.** En las actividades de lectura la voz solo dice la instrucción; la palabra o la frase la lee el niño. La ayuda aparece tras un error: la voz la dice sílaba por sílaba y luego completa.
5. **Ayuda que crece, nunca castigo.** Primer error: se repite el sonido o aparece el botón de ayuda. Segundo error: la respuesta correcta brilla. Siempre se termina la actividad con éxito.
6. **Repaso espaciado.** Cada lección de letra nueva incluye una palabra de lecciones anteriores, y las sílabas a elegir contrastan con letras ya vistas (ma / me / pa), no solo con otra vocal.
7. **Todo en minúscula y por sílabas.** Las fichas usan la misma letra minúscula de los textos, las palabras sueltas se muestran con las sílabas en dos colores y, mientras aprende sílabas, las palabras se arman con fichas de sílaba (no letra por letra). Las mayúsculas se practican en los repasos, juntando cada una con su minúscula.
8. **La mano también aprende.** Cada letra nueva se dibuja con el dedo sobre su silueta.
9. **Comprender, no adivinar.** Las frases llevan una pregunta dicha en voz alta (“¿Quién usa la lupa?”) y los tres dibujos son del mismo tipo, así que hay que leer la frase completa. Ningún dibujo se puede confundir con la respuesta.
10. **Lo que cuesta, vuelve.** Lo que falla regresa al final de la lección; si ahí lo resuelve, no le resta estrellas. Lo que sigue costando aparece después en el “Repaso de hoy” y en la zona de Padres.
11. **Sesiones cortas.** 9–12 actividades por lección ≈ 5–8 minutos; se puede salir y retomar, y la app sugiere descansar al llegar al tiempo diario.
12. **Respuestas mezcladas.** La respuesta correcta está repartida casi por igual entre las tres posiciones, y nunca hay dos opciones que suenen igual (ba/va, ce/se, lla/ya).

## 2. Secuencia completa
${rows.join('\n')}

## 3. Palabras mágicas (se aprenden de memoria)

Aparecen en actividades “Palabra mágica” y se pueden usar en frases desde que se enseñan:

${data.worlds.flatMap((w) => w.lessons.filter((l) => l.sight?.length).map((l) => `- **${l.sight.join(', ')}** — ${l.title}`)).join('\n')}

## 4. Guion de una sesión (10–15 minutos)

**Antes de empezar (30 s).** Un lugar tranquilo, sin otras pantallas, el adulto sentado al lado.
> “Hola, campeón. Hoy leemos con Chispa. Tú eres el que lee y yo te acompaño.”

**1) Calentamiento (2 min, sin pantalla).** Tarjetas con 5 sílabas o palabras que ya conoce, de la lección anterior. Ritmo suave, sin cronómetro.
> “Esta ya la conoces. ¿Cómo suena?”

**2) Lección en la app (6–7 min).** Una lección. Si se cansa, se corta: terminar bien es mejor que terminar mucho.
- Antes de cada actividad de lectura: *“Pon tu dedo debajo y vamos sonido por sonido.”*
- No responder por él. Si se equivoca, aplicar la **regla de 3 pasos**:
  1. Esperar 5 segundos en silencio.
  2. Pista: *“Empieza con mmm…”*
  3. Modelo (eco): el adulto lo lee despacio, el niño lo repite.

**3) Lectura compartida (2 min).** El adulto lee una frase de la lección y el niño lee la siguiente (lectura “en eco” o por turnos).
> “Yo leo esta, tú lees la otra.”

**4) Cierre (1 min).** Elogiar el esfuerzo, no solo el resultado.
> “Hoy te esforzaste en las sílabas con *p*. ¡Mañana seguimos!”

### Frases que ayudan y frases que conviene evitar

| Sí | Evitar |
|---|---|
| “Casi. Mira otra vez la primera sílaba.” | “No, está mal.” |
| “Lo estás intentando muy bien.” | “¿Todavía no te la sabes?” |
| “Vamos juntos, despacito.” | “Apúrate, es fácil.” |
| “Esa es difícil. A muchos nos costó.” | Comparar con otros niños o hermanos |

## 5. Cuándo avanzar y cuándo repetir

| Situación | Qué hacer |
|---|---|
| Acierta ~80 % o más en dos sesiones | Avanzar a la siguiente lección |
| Saca 1 estrella dos veces seguidas | Repetir con tarjetas en papel antes de volver a la app |
| Se frustra o se distrae | Parar, hacer algo que le guste y retomar otro día |
| Confunde la misma pareja (b/d, m/n, p/q) | Jugar solo con esas dos, con objetos y dibujos, antes de leer |
| Va muy fácil | Pasar al siguiente mundo sin repetir lecciones |

## 6. Juegos sin pantalla (5 min, 2–3 veces por semana)

- **Tarjetas de sílabas:** una por una, en montoncitos de “ya sé” y “todavía no”.
- **Bingo de sílabas o palabras** con fichas o tapitas.
- **Tesoro escondido:** esconder tarjetas con palabras de la lección; cada una que encuentra, la lee.
- **Escribir en harina, arena o con el dedo en la espalda** (sentir la letra ayuda a recordarla).
- **Armar palabras** con letras recortables, las mismas que usa la app.
- **Dictado con fichas:** el adulto dice una palabra y el niño la arma con las letras.

## 7. Cómo mantener este contenido

\`\`\`bash
node content/tools/build.mjs      # genera content/worlds.json desde content/curriculum/
node content/tools/validate.mjs   # estructura + decodificabilidad (debe dar 0 errores)
node content/tools/docs.mjs       # regenera este documento y la lista de audios
docker compose up -d --build      # para publicarlo
\`\`\`

- Editar **solo** los archivos de \`content/curriculum/\` (nunca \`worlds.json\` a mano).
- Una palabra nueva con imagen va en \`dict.mjs\` (un emoji claro y distinto de los demás).
- Si el validador marca “no es decodificable todavía”, la frase usa una letra que aún no se enseñó: se cambia la frase o se mueve la lección.
- **No cambiar los IDs** de lecciones (\`m2-l3\`…): el progreso guardado se enlaza por ellos.

## 8. Audio

\`content/audio/manifest.json\` y \`lineas.tsv\` listan los **${manifest.length} textos** que la app dice en voz alta (sílabas, palabras, frases, cuentos, preguntas y felicitaciones), con un identificador estable (hash del texto). Sirven para generar los MP3 con Piper una sola vez o para grabar la voz de papá y mamá en los sonidos clave (sílabas sueltas), que suelen sonar mejor que la voz del navegador.

## 9. Señales para hablar con la maestra o un especialista

Con práctica diaria breve durante varias semanas, conviene comentarlo con su maestra, su pediatra o un psicopedagogo si ves: no retiene sonidos de letras que ya practicó mucho; confusión persistente de letras o sílabas; rechazo fuerte a leer o mucha frustración; antecedentes familiares de dificultad lectora; o dudas sobre vista y oído. Pedir una revisión **no** es una mala señal: es la forma más rápida de darle el apoyo adecuado.
`
fs.mkdirSync(path.join(root, 'docs'), { recursive: true })
fs.writeFileSync(path.join(root, 'docs', 'CURRICULO.md'), doc)
console.log(`docs/CURRICULO.md · ${manifest.length} líneas de audio · ${reading} actividades de lectura`)
