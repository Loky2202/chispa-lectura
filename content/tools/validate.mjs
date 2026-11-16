// Valida content/worlds.json: estructura de cada actividad + decodificabilidad.
// Uso:  node content/tools/validate.mjs [ruta/worlds.json]
// Desarrollado por Christopher Flores
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyUnlocks, cleanWord, isDecodable, missingFor, newState, wordsOf } from './lib.mjs'
import { confusable } from '../curriculum/dict.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const file = process.argv[2] ?? path.join(here, '..', 'worlds.json')
const data = JSON.parse(fs.readFileSync(file, 'utf8'))

let errors = 0
let warnings = 0
const err = (where, msg) => { errors++; console.log(`  ✖ ${where}: ${msg}`) }
const warn = (where, msg) => { warnings++; if (process.env.VERBOSE) console.log(`  ⚠ ${where}: ${msg}`) }

const state = newState()
const seenIds = new Set()
const pos = [0, 0, 0, 0, 0]
let posTotal = 0
let readingActs = 0
let totalActs = 0

function checkText(where, text, st, level = 'error') {
  for (const w of wordsOf(text)) {
    const miss = missingFor(w, st)
    if (miss.length) (level === 'error' ? err : warn)(where, `"${w}" no es decodificable todavía (falta: ${miss.join(', ')})`)
  }
}

for (const world of data.worlds) {
  for (const lesson of world.lessons) {
    if (seenIds.has(lesson.id)) err(lesson.id, 'ID de lección duplicado')
    seenIds.add(lesson.id)
    applyUnlocks(state, { unlock: lesson.unlocks, sight: lesson.sight })
    const strict = lesson.decodable !== false
    const ids = new Set()
    if (!lesson.activities?.length) err(lesson.id, 'sin actividades')
    for (const a of lesson.activities ?? []) {
      totalActs++
      const where = `${lesson.id}/${a.id}`
      if (ids.has(a.id)) err(where, 'ID de actividad duplicado')
      ids.add(a.id)
      const labels = (a.options ?? []).map((o) => (typeof o === 'object' ? o.label : o))
      if (['listen_tap', 'word_picture', 'sentence_picture', 'odd_one_out'].includes(a.type) || a.type === 'missing_letter') {
        if (!labels.includes(a.answer)) err(where, `la respuesta "${a.answer}" no está en las opciones`)
        if (new Set(labels).size !== labels.length) err(where, 'opciones repetidas')
        const i = labels.indexOf(a.answer)
        if (i >= 0 && i < 5 && labels.length === 3) { pos[i]++; posTotal++ }
      }
      if (['word_picture', 'sentence_picture', 'odd_one_out'].includes(a.type)) {
        const emojis = a.options.map((o) => o.emoji)
        if (new Set(emojis).size !== emojis.length) err(where, 'dos opciones con la misma imagen')
        if (a.options.some((o) => !o.emoji)) err(where, 'opción sin imagen')
        for (const o of a.options) if (o.label !== a.answer && confusable(o.label, a.answer)) err(where, `el dibujo de "${o.label}" se confunde con "${a.answer}"`)
      }
      if (a.type === 'count_syllables' && !a.options.includes(a.answer)) err(where, 'respuesta fuera de las opciones')
      if (a.type === 'missing_letter' && a.display.replace('_', a.answer) !== a.word) err(where, 'display no coincide con word')
      if (a.parts && a.parts.join('') !== cleanWord(a.type === 'word_picture' ? a.answer : a.type === 'learn' ? a.keyword : a.word)) err(where, 'las sílabas (parts) no forman la palabra')
      if (a.type === 'learn') {
        if (!a.syllables?.length) err(where, 'presentación sin sílabas')
        if (a.focus && !a.syllables.includes(a.focus)) err(where, 'la sílaba de la palabra clave no está en la tarjeta')
        if (a.syllables?.length > 6) err(where, 'demasiadas sílabas en la presentación')
      }
      if (a.type === 'blend' && (a.parts?.length ?? 0) < 2) err(where, 'unir sílabas necesita al menos dos')
      if (a.type === 'trace' && !/^[a-zñ]{1,2}$/.test(a.letter ?? '')) err(where, 'trazo sin letra')
      if (a.type === 'build_word' && a.extra?.some((x) => a.parts.includes(x))) err(where, 'la ficha que sobra repite una sílaba de la palabra')
      if (a.type === 'memory' && a.pairs?.some((p) => p.length !== 2 || p[0] === p[1])) err(where, 'pareja de memoria inválida')
      if (a.type === 'sentence_picture' && a.question && !/^¿.+\?$/.test(a.question)) err(where, 'pregunta mal formada')
      if (!strict) continue
      switch (a.type) {
        case 'listen_tap': for (const o of a.options) if (o.length > 1 || a.options.some((x) => x.length > 1)) checkText(where, o, state); break
        case 'word_picture': if (a.audio === '') { readingActs++; checkText(where, a.prompt.replace(/^Lee:\s*/, ''), state) } else for (const o of a.options) checkText(where, o.label, state, 'warn'); break
        case 'build_word': checkText(where, a.word, state); break
        case 'blend': checkText(where, a.word, state); break
        case 'learn': if (a.keyword) checkText(where, a.keyword, state); break
        case 'missing_letter': checkText(where, a.word, state); break
        case 'count_syllables': checkText(where, a.word, state); break
        case 'sentence_picture': readingActs++; checkText(where, a.sentence, state); for (const o of a.options) checkText(where, o.label, state, 'warn'); break
        case 'read_aloud': readingActs++; checkText(where, a.text, state); break
        case 'story': readingActs++; a.pages.forEach((p, i) => checkText(`${where}/p${i + 1}`, p.text, state)); a.questions.forEach((q, i) => { checkText(`${where}/q${i + 1}`, q.q, state, 'warn'); q.options.forEach((o) => checkText(`${where}/q${i + 1}`, o, state, 'warn')) }); break
        case 'odd_one_out': for (const o of a.options) checkText(where, o.label, state, 'warn'); break
        default: break
      }
    }
  }
}

const lessons = data.worlds.reduce((n, w) => n + w.lessons.length, 0)
console.log(`\nMundos: ${data.worlds.length} · Lecciones: ${lessons} · Actividades: ${totalActs} · De lectura real: ${readingActs}`)
console.log(`Posición de la respuesta correcta (de ${posTotal} con 3 opciones): 1ª ${pos[0]} · 2ª ${pos[1]} · 3ª ${pos[2]}`)
console.log(`Errores: ${errors} · Avisos: ${warnings}${warnings && !process.env.VERBOSE ? ' (VERBOSE=1 para verlos)' : ''}`)
process.exit(errors ? 1 : 0)
