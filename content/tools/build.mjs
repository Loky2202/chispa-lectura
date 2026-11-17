// Genera content/worlds.json a partir de la especificación en content/curriculum/.
// Uso:  node content/tools/build.mjs
// Desarrollado por Christopher Flores
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyUnlocks, cleanWord, countSyllables, isDecodable, newState, rng, shuffled, soundKey, syllableStrings, wordsOf
} from './lib.mjs'
import { ANIMATE, DICT, confusable } from '../curriculum/dict.mjs'
import { WORLDS } from '../curriculum/index.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const MAX_ACTS = 9 // actividades por lección (las de letra nueva suman presentación, trazo y repaso: 12)
const SMALL_WORDS = ['a', 'la', 'mi', 'me', 'de', 'no', 'su', 'tu', 'un', 'el', 'es', 'en', 'con', 'y', 'yo', 'se', 'sí', 'da', 've', 'que', 'una', 'los', 'las']

const opt = (k) => ({ emoji: DICT[k], label: k })
const pickN = (arr, n, rand) => shuffled(arr, rand).slice(0, n)

function uniqueByEmoji(keys) {
  const seen = new Set()
  return keys.filter((k) => (seen.has(DICT[k]) ? false : (seen.add(DICT[k]), true)))
}

// Distractores para opciones con imagen: primero palabras que el niño ya puede leer,
// y nunca un dibujo que se pueda confundir con la respuesta.
// `sameKind`: para preguntas “¿Quién…?” / “¿Qué…?” los distractores son del mismo tipo.
function distractors(ctx, answerKey, n, rand, banned = new Set(), sameKind = false) {
  const base = Object.keys(DICT).filter((k) => DICT[k] !== DICT[answerKey] && !banned.has(k) && !confusable(k, answerKey))
  const readable = base.filter((k) => isDecodable(k, ctx.state))
  let ordered = [...shuffled(readable, rand), ...shuffled(base.filter((k) => !readable.includes(k)), rand)]
  if (sameKind) {
    const kind = ANIMATE.has(answerKey)
    ordered = [...ordered.filter((k) => ANIMATE.has(k) === kind), ...ordered.filter((k) => ANIMATE.has(k) !== kind)]
  }
  return uniqueByEmoji(ordered).slice(0, n)
}

// Pregunta de comprensión para una frase: obliga a leerla entera, no solo una palabra.
function questionFor(text, key) {
  const ws = text.replace(/[.!¡]/g, '').split(/\s+/)
  const i = ws.findIndex((w) => cleanWord(w) === key || cleanWord(w) === key + 's')
  if (i < 0) return null
  if (i <= 2 && i < ws.length - 1) { // la respuesta es el sujeto: “El oso usa la lupa.” → “¿Quién usa la lupa?”
    const rest = ws.slice(i + 1).join(' ').split(' y ')[0]
    if (!rest || rest.startsWith('y ')) return null
    const plural = cleanWord(ws[i]) !== key
    const who = ANIMATE.has(key) && !/^(es|son) /.test(rest)
    return who ? `¿${plural ? 'Quiénes' : 'Quién'} ${rest}?` : `¿Qué ${rest}?`
  }
  // la respuesta es el objeto: “Papá pisa la lata.” → “¿Qué pisa papá?”
  if (ANIMATE.has(key)) return null
  const m = text.replace(/[.!¡]/g, '').match(/^(Mamá|Papá|Chispa|Yo|(?:El|La|Mi|Un|Una) \S+) (me )?(\S+) (?:(?:un|una|la|el) )?(\S+)(?: \S+)?$/)
  if (!m || cleanWord(m[4]) !== key) return null
  const subject = m[1] === 'Chispa' ? m[1] : m[1][0].toLowerCase() + m[1].slice(1)
  return `¿Qué ${m[2] ?? ''}${m[3]} ${subject}?`
}

function textDistractors(ctx, target, n, rand) {
  const t = cleanWord(target)
  const pool = [...Object.keys(DICT), ...ctx.plainWords].filter((k) => k !== t && isDecodable(k, ctx.state))
  const sameLen = pool.filter((k) => Math.abs(k.length - t.length) <= 1)
  const sharing = sameLen.filter((k) => k[0] === t[0] || k.slice(-2) === t.slice(-2))
  const merged = [...new Set([...shuffled(sharing, rand), ...shuffled(sameLen, rand), ...shuffled(pool, rand)])]
  return merged.slice(0, n)
}

// Dos distractores: uno cambia la vocal (ma/me) y otro cambia la consonante (ma/pa),
// para que el niño tenga que fijarse en las dos letras. Nunca dos que suenen igual.
function sylDistractors(spec, ctx, target, rand) {
  const differs = (s, others) => [target, ...others].every((o) => soundKey(o) !== soundKey(s))
  const own = shuffled((spec.syl ?? []).filter((s) => s !== target), rand)
  const older = shuffled(ctx.pastSyl.filter((s) => s !== target && !own.includes(s)), rand)
  const out = []
  const sameStart = own.find((s) => s[0] === target[0] && differs(s, out))
  if (sameStart) out.push(sameStart)
  const sameVowel = [...older, ...own].find((s) => s.length === target.length && s.slice(-1) === target.slice(-1) && s[0] !== target[0] && differs(s, out))
  if (sameVowel) out.push(sameVowel)
  for (const s of [...own, ...older]) if (out.length < 2 && !out.includes(s) && differs(s, out)) out.push(s)
  return out
}

// Sílabas que se muestran en la tarjeta de presentación (máximo 6).
function introSyllables(syl, focus) {
  let shown = syl
  if (syl.length > 6) {
    const groups = new Map()
    for (const s of syl) { const g = s.replace(/[aeiou]+$/, ''); if (!groups.has(g)) groups.set(g, s) }
    shown = groups.size >= 3 ? [...groups.values()].slice(0, 6) : syl.slice(0, 6)
  }
  if (focus && !shown.includes(focus)) {
    const g = focus.replace(/[aeiou]+$/, '')
    const i = shown.findIndex((s) => s.replace(/[aeiou]+$/, '') === g)
    shown = [...shown]
    shown[i >= 0 ? i : shown.length - 1] = focus
  }
  return shown
}

const strip = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
const SYLLABLE_WORLDS = new Set(['silabas', 'jardin']) // aquí las palabras se arman por sílabas

const A = {
  // Presentación (sin errores): la letra, una palabra clave y sus sílabas para tocar y escuchar.
  learn(spec, syl, words) {
    const intro = spec.intro ?? {}
    const units = (spec.unlock ?? []).filter((u) => u !== 'tilde')
    const letter = intro.letter ?? (units.length === 1 && /^[a-zñ]{1,2}$/.test(units[0]) ? units[0] : null)
    let keyword = null, focus = null, starts = true
    for (const w of words) { const s = syl.find((x) => w.startsWith(x)); if (s) { keyword = w; focus = s; break } }
    if (!keyword) for (const w of words) { const s = syl.find((x) => w.includes(x)); if (s) { keyword = w; focus = s; starts = false; break } }
    const act = { type: 'learn', syllables: introSyllables(syl, focus) }
    if (letter) { act.letter = letter; if (letter !== 'rr') act.upper = letter[0].toUpperCase() + letter.slice(1) }
    if (keyword) {
      Object.assign(act, { keyword, emoji: DICT[keyword], focus, parts: syllableStrings(keyword) })
      const cap = keyword[0].toUpperCase() + keyword.slice(1)
      act.say = starts ? `${cap} empieza con ${focus}.` : `${cap} tiene ${focus}.`
    }
    if (intro.note) act.note = intro.note
    return act
  },
  // Unir sílabas (sin errores): toca ma, toca má → ¡mamá!
  blend(key) {
    const parts = syllableStrings(key)
    if (parts.length < 2) return null
    return { type: 'blend', word: key, parts, ...(DICT[key] ? { emoji: DICT[key] } : {}) }
  },
  syl(spec, ctx, rand, target) {
    const opts = shuffled([target, ...sylDistractors(spec, ctx, target, rand)], rand)
    return { type: 'listen_tap', prompt: '¿Qué sílaba escuchas?', audio: target, options: opts, answer: target }
  },
  read(ctx, rand, key) {
    const opts = shuffled([key, ...distractors(ctx, key, 2, rand)], rand).map(opt)
    return { type: 'word_picture', prompt: `Lee: ${key}`, audio: '', hideLabels: true, parts: syllableStrings(key), options: opts, answer: key }
  },
  hear(ctx, rand, key, explicit) {
    const ds = explicit ?? textDistractors(ctx, key, 2, rand)
    if (ds.length < 2) return null
    return { type: 'listen_tap', prompt: '¿Qué palabra escuchas?', audio: key, options: shuffled([key, ...ds], rand), answer: key }
  },
  // `syl`: armar con fichas de sílaba (más una que sobra); sin `syl`, letra por letra.
  build(key, syl) {
    const act = { type: 'build_word', word: key, emoji: DICT[key] }
    const parts = syllableStrings(key)
    if (!syl || parts.length < 2) return act
    const spare = shuffled(syl.pool, syl.rand).find((s) => parts.every((p) => soundKey(strip(p)) !== soundKey(s)))
    return { ...act, parts, ...(spare ? { extra: [spare] } : {}) }
  },
  trace(letter) {
    return { type: 'trace', letter }
  },
  missing(rand, key) {
    const idx = [...key].map((c, i) => ('aeiou'.includes(c) ? i : -1)).filter((i) => i >= 0)
    if (!idx.length) return null
    const at = idx[Math.floor(rand() * idx.length)]
    const answer = key[at]
    const opts = shuffled([answer, ...pickN([...'aeiou'].filter((v) => v !== answer), 2, rand)], rand)
    return { type: 'missing_letter', word: key, display: key.slice(0, at) + '_' + key.slice(at + 1), emoji: DICT[key], options: opts, answer }
  },
  sight(ctx, rand, word) {
    const pool = SMALL_WORDS.filter((w) => w !== word && (ctx.state.sight.has(w) || isDecodable(w, ctx.state)))
    const ds = pickN(pool, 2, rand)
    return { type: 'listen_tap', prompt: `Palabra mágica: ¿cuál dice “${word}”?`, audio: word, options: shuffled([word, ...ds], rand), answer: word }
  },
  sentencePic(ctx, rand, text, key, asked) {
    const inSentence = new Set([...wordsOf(text), ...wordsOf(text).map((w) => w.replace(/s$/, ''))])
    const question = asked ?? questionFor(text, key)
    const ds = distractors(ctx, key, 2, rand, inSentence, Boolean(question))
    return { type: 'sentence_picture', sentence: text, ...(question ? { question } : {}), hideLabels: true,
      options: shuffled([key, ...ds], rand).map(opt), answer: key }
  },
  readAloud(text, key) {
    return key && DICT[key] ? { type: 'read_aloud', text, emoji: DICT[key] } : { type: 'read_aloud', text }
  },
  count(rand, key) {
    const n = countSyllables(key)
    const pool = [1, 2, 3, 4, 5].filter((x) => x !== n && Math.abs(x - n) <= 2)
    return { type: 'count_syllables', word: key, emoji: DICT[key], options: shuffled([n, ...pickN(pool, 2, rand)], rand), answer: n }
  },
  odd(rand, prompt, pair, oddKey) {
    return { type: 'odd_one_out', prompt, options: shuffled([...pair, oddKey], rand).map(opt), answer: oddKey }
  },
  story(rand, s) {
    return {
      type: 'story',
      title: s.title,
      pages: s.pages.map(([text, emoji]) => ({ text, emoji })),
      questions: s.qs.map(([q, answer, ...ds]) => ({ q, options: shuffled([answer, ...ds], rand), answer }))
    }
  },
  memory(rand, items, pairs) {
    return pairs ? { type: 'memory', items: pairs.map((p) => p[1]), pairs } : { type: 'memory', items }
  }
}

function buildLesson(world, spec, ctx) {
  const rand = rng(spec.id)
  applyUnlocks(ctx.state, spec)
  let words = spec.words ?? []
  let syl = spec.syl ?? []
  if (spec.review) {
    const from = spec.review.map((id) => ctx.byId[id]).filter(Boolean)
    syl = [...new Set(from.flatMap((l) => l.syl ?? []))]
    words = [...new Set(from.flatMap((l) => l.words ?? []))]
  }
  const s = { ...spec, syl }
  const extra = spec.extra ?? [] // palabras sin imagen: solo para unir sílabas y dictado
  for (const w of words) if (!DICT[w]) throw new Error(`${spec.id}: palabra sin emoji en dict.mjs → "${w}"`)
  for (const w of extra) if (!isDecodable(w, ctx.state)) throw new Error(`${spec.id}: palabra extra no decodificable → "${w}"`)
  ctx.plainWords.push(...extra)

  const acts = []
  if (spec.story) {
    acts.push(A.story(rand, spec.story))
  } else if (spec.custom) {
    for (const make of spec.custom) acts.push(make({ A, ctx, rand, opt, DICT }))
  } else {
    const q = { learn: [], trace: [], blend: [], rev: [], syl: [], read: [], build: [], hear: [], miss: [], sight: [], count: [], odd: [], mem: [] }
    const isNew = !spec.review && (spec.unlock ?? []).length > 0 && syl.length > 0
    if (isNew) {
      const learn = A.learn(spec, syl, words)
      q.learn.push(learn)
      if (learn.letter) q.trace.push(A.trace(learn.letter))
    }
    // unir sílabas: una palabra con imagen y, si hay, una sin imagen
    const multi = (list) => shuffled(list.filter((k) => syllableStrings(k).length >= 2 && k.length <= 9), rand)
    const blendKeys = [...multi(words).slice(0, 1), ...multi(extra).slice(0, 1)]
    for (const k of multi(words)) if (blendKeys.length < 2 && !blendKeys.includes(k)) blendKeys.push(k)
    blendKeys.forEach((k) => { const b = A.blend(k); if (b) q.blend.push(b) })
    // repaso espaciado: leer una palabra de lecciones anteriores
    if (isNew) {
      const old = ctx.pastWords.filter((k) => !words.includes(k)).slice(-10)
      if (old.length) q.rev.push(A.read(ctx, rand, shuffled(old, rand)[0]))
    }
    const sylPick = shuffled(syl, rand)
    sylPick.slice(0, spec.review ? 3 : 3).forEach((t) => q.syl.push(A.syl(s, ctx, rand, t)))
    const w2 = shuffled(words, rand)
    w2.slice(0, 3).forEach((k) => q.read.push(A.read(ctx, rand, k)))
    const bySyl = SYLLABLE_WORLDS.has(world.id) ? { pool: [...new Set([...syl, ...ctx.pastSyl])], rand } : null
    shuffled(words.filter((k) => k.length >= 3 && k.length <= 9), rand).slice(0, 2).forEach((k) => q.build.push(A.build(k, bySyl)))
    if (spec.hear) spec.hear.forEach(([k, ds]) => q.hear.push(A.hear(ctx, rand, k, ds)))
    else shuffled([...words, ...extra], rand).slice(0, 2).forEach((k) => { const a = A.hear(ctx, rand, k); if (a) q.hear.push(a) })
    const m = A.missing(rand, shuffled(words.filter((k) => !/[áéíóúü]/.test(k)), rand)[0] ?? '')
    if (m) q.miss.push(m)
    ;(spec.sight ?? []).forEach((w) => q.sight.push(A.sight(ctx, rand, w)))
    ;(spec.count ?? []).forEach((k) => q.count.push(A.count(rand, k)))
    ;(spec.odd ?? []).forEach(([p, pair, o]) => q.odd.push(A.odd(rand, p, pair, o)))
    if (spec.review) {
      // repaso: juntar cada mayúscula con su minúscula (o parejas de sílabas si hay pocas letras)
      const letters = [...new Set(spec.review.flatMap((id) => ctx.byId[id]?.unlock ?? []))]
        .filter((u) => /^[a-zñ]{1,2}$/.test(u) && !['rr', 'ce', 'ge', 'gu'].includes(u))
      if (letters.length >= 3) q.mem.push(A.memory(rand, null, pickN(letters, 4, rand).map((l) => [l[0].toUpperCase() + l.slice(1), l])))
      else if (syl.length >= 4) q.mem.push(A.memory(rand, pickN(syl, 4, rand)))
    }

    const pattern = spec.pattern ?? (spec.review
      ? ['syl', 'read', 'mem', 'blend', 'syl', 'hear', 'read', 'build', 'miss', 'syl', 'hear']
      : ['learn', 'trace', 'syl', 'syl', 'blend', 'read', 'build', 'sight', 'rev', 'syl', 'hear', 'blend', 'read', 'miss', 'hear', 'build', 'read', 'count', 'odd'])
    const order = []
    const cursor = {}
    let guard = 0
    while (guard++ < 200) {
      let any = false
      for (const kind of pattern) {
        const i = cursor[kind] ?? 0
        if (q[kind][i]) { order.push(q[kind][i]); cursor[kind] = i + 1; any = true }
      }
      if (!any) break
    }
    // si hay muchas, priorizamos variedad: quitamos de la cola en vez de cortar siempre al final
    const keyed = (spec.sents ?? []).filter(([, key]) => key)
    const plain = (spec.sents ?? []).filter(([, key]) => !key)
    const nPics = spec.pics ?? 2
    const nReads = spec.reads ?? 1
    const sentActs = [
      ...keyed.slice(0, nPics).map(([text, key, asked]) => A.sentencePic(ctx, rand, text, key, asked)),
      ...[...plain, ...keyed.slice(nPics)].slice(0, nReads).map(([text, key]) => A.readAloud(text, key))
    ]
    const budget = Math.max(3, (spec.max ?? (isNew ? MAX_ACTS + 3 : MAX_ACTS)) - sentActs.length)
    acts.push(...order.slice(0, budget), ...sentActs)
  }
  acts.forEach((a, i) => { a.id = `a${i + 1}` })
  ctx.byId[spec.id] = { syl, words, unlock: spec.unlock ?? [] }
  for (const x of syl) if (!ctx.pastSyl.includes(x)) ctx.pastSyl.push(x)
  for (const x of words) if (!ctx.pastWords.includes(x)) ctx.pastWords.push(x)
  return {
    id: spec.id,
    title: spec.title,
    goal: spec.goal,
    emoji: spec.emoji,
    unlocks: spec.unlock ?? [],
    sight: spec.sight ?? [],
    syllables: syl,
    words,
    ...(spec.audioOnly ? { decodable: false } : {}),
    activities: acts
  }
}

function legacyWorld(id, rand) {
  const legacy = JSON.parse(fs.readFileSync(path.join(root, 'legacy', 'worlds.legacy.json'), 'utf8'))
  const w = legacy.worlds.find((x) => x.id === id)
  for (const l of w.lessons) {
    l.decodable = false
    l.unlocks = []
    l.sight = []
    const r = rand(l.id)
    for (const a of l.activities) {
      if (Array.isArray(a.options) && a.options.length > 1) a.options = shuffled(a.options, r)
    }
  }
  return w
}

function main() {
  const ctx = { state: newState(), byId: {}, pastSyl: [], pastWords: [], plainWords: [] }
  const out = { worlds: [] }
  for (const item of WORLDS) {
    if (item.legacy) {
      const w = legacyWorld(item.legacy, (id) => rng(id))
      if (item.patch) item.patch(w, { A, DICT, rng, opt, shuffled, confusable })
      out.worlds.push(w)
      continue
    }
    const world = { id: item.id, title: item.title, subtitle: item.subtitle, emoji: item.emoji, theme: item.theme, lessons: [] }
    for (const spec of item.lessons) world.lessons.push(buildLesson(world, spec, ctx))
    out.worlds.push(world)
  }
  fs.writeFileSync(path.join(root, 'worlds.json'), JSON.stringify(out, null, 2) + '\n')
  const lessons = out.worlds.reduce((n, w) => n + w.lessons.length, 0)
  const acts = out.worlds.reduce((n, w) => n + w.lessons.reduce((m, l) => m + l.activities.length, 0), 0)
  console.log(`worlds.json generado: ${out.worlds.length} mundos, ${lessons} lecciones, ${acts} actividades`)
}

main()
