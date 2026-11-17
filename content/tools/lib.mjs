// Motor de decodificación del español: separa grafemas y sílabas y comprueba
// si una palabra se puede leer con lo que ya se enseñó (estado acumulado).
// Desarrollado por Christopher Flores

const STRONG = new Set('aeoáéó')
const ACCENTED_WEAK = new Set('íú')
const VOWELS = new Set('aeiouáéíóúü')
const CLUSTERS = new Set(['pl', 'pr', 'bl', 'br', 'fl', 'fr', 'gl', 'gr', 'cl', 'cr', 'tr', 'dr'])
const FRONT = 'eiéí'

export function cleanWord(w) {
  return w.toLowerCase().normalize('NFC').replace(/[¿?¡!.,;:"()]/g, '').trim()
}

export function wordsOf(text) {
  return text.split(/\s+/).map(cleanWord).filter(Boolean)
}

const C = (k) => ({ t: 'C', k })
const V = (k) => ({ t: 'V', k })

export function tokenize(word) {
  const w = cleanWord(word)
  const out = []
  let i = 0
  while (i < w.length) {
    const c = w[i], n = w[i + 1], n2 = w[i + 2]
    if (c === 'c' && n === 'h') { out.push(C('ch')); i += 2; continue }
    if (c === 'l' && n === 'l') { out.push(C('ll')); i += 2; continue }
    if (c === 'r' && n === 'r') { out.push(C('rr')); i += 2; continue }
    if (c === 'q' && n === 'u' && n2 && FRONT.includes(n2)) { out.push(C('qu')); i += 2; continue }
    if (c === 'g' && n === 'u' && n2 && FRONT.includes(n2)) { out.push(C('gu')); i += 2; continue }
    if (c === 'g' && n === 'ü') { out.push(C('gü')); i += 2; continue }
    if (c === 'c') { out.push(C(n && FRONT.includes(n) ? 'ce' : 'c')); i++; continue }
    if (c === 'g') { out.push(C(n && FRONT.includes(n) ? 'ge' : 'g')); i++; continue }
    if (c === 'y') { out.push(i === w.length - 1 ? V('y') : C('y')); i++; continue }
    if (VOWELS.has(c)) { out.push(V(c)); i++; continue }
    if ('bdfhjklmnñprstvxzw'.includes(c)) { out.push(C(c)); i++; continue }
    out.push({ t: 'X', k: c }); i++
  }
  return out
}

function joins(a, b) {
  if (STRONG.has(a) && STRONG.has(b)) return false
  if (ACCENTED_WEAK.has(a) || ACCENTED_WEAK.has(b)) return false
  return true
}

export function syllabify(word) {
  const tokens = tokenize(word)
  const nuclei = []
  for (let i = 0; i < tokens.length;) {
    if (tokens[i].t === 'V') {
      let j = i
      while (j + 1 < tokens.length && tokens[j + 1].t === 'V' && joins(tokens[j].k, tokens[j + 1].k)) j++
      nuclei.push([i, j]); i = j + 1
    } else i++
  }
  if (!nuclei.length) return [{ onset: tokens.map((t) => t.k), nucleus: '', coda: [] }]
  const sylls = nuclei.map(([a, b]) => ({ nucleus: tokens.slice(a, b + 1).map((t) => t.k).join(''), onset: [], coda: [] }))
  sylls[0].onset = tokens.slice(0, nuclei[0][0]).map((t) => t.k)
  for (let k = 0; k < nuclei.length - 1; k++) {
    const between = tokens.slice(nuclei[k][1] + 1, nuclei[k + 1][0]).map((t) => t.k)
    const n = between.length
    let s = 0
    if (n === 2) s = CLUSTERS.has(between[0] + between[1]) ? 0 : 1
    else if (n >= 3) s = CLUSTERS.has(between[n - 2] + between[n - 1]) ? n - 2 : n - 1
    sylls[k].coda = between.slice(0, s)
    sylls[k + 1].onset = between.slice(s)
  }
  sylls[sylls.length - 1].coda = tokens.slice(nuclei[nuclei.length - 1][1] + 1).map((t) => t.k)
  return sylls
}

export function countSyllables(word) {
  return syllabify(word).length
}

// Sílabas como texto ("mariposa" → ma·ri·po·sa) para colorearlas y unirlas en pantalla.
const KEY_TEXT = { ce: 'c', ge: 'g' }
export function syllableStrings(word) {
  const w = cleanWord(word)
  const parts = syllabify(w).map((s) => [...s.onset, s.nucleus, ...s.coda].map((k) => KEY_TEXT[k] ?? k).join(''))
  return parts.join('') === w ? parts : [w]
}

// Cómo suena una sílaba en español latinoamericano: sirve para no poner como
// distractores dos sílabas que suenan igual (ba/va, ce/se, za/sa, lla/ya, ge/je, ha/a).
export function soundKey(syl) {
  return syl
    .replace(/^h/, '')
    .replace(/^qu/, 'k')
    .replace(/^gu(?=[ei])/, 'G')
    .replace(/^g(?=[ei])/, 'j')
    .replace(/^c(?=[ei])/, 's')
    .replace(/^c(?!h)/, 'k')
    .replace(/^z/, 's')
    .replace(/^v/, 'b')
    .replace(/^ll/, 'y')
    .replace(/z$/, 's')
}

const strip = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function newState() {
  return { units: new Set(), sight: new Set() }
}

// Devuelve la lista de "unidades" que faltan para poder leer la palabra ([] = decodificable).
export function missingFor(word, state) {
  const w = cleanWord(word)
  if (!w) return []
  if (state.sight.has(w)) return []
  const missing = new Set()
  for (const t of tokenize(w)) {
    if (t.t === 'X') missing.add(`?${t.k}`)
    if (t.t === 'V' && t.k === 'y') missing.add('sight:y')
    if (t.t === 'C' && ['x', 'k', 'w'].includes(t.k)) missing.add(`?${t.k}`)
  }
  for (const s of syllabify(w)) {
    if (s.onset.length === 1 && !state.units.has(s.onset[0])) missing.add(s.onset[0])
    if (s.onset.length === 2) {
      const cl = s.onset[0] + s.onset[1]
      if (!state.units.has(cl)) missing.add(cl)
    }
    if (s.onset.length > 2) missing.add(`?${s.onset.join('')}`)
    const base = strip(s.nucleus)
    if (s.nucleus !== base && !state.units.has('tilde')) missing.add('tilde')
    if (base.length > 1 && base !== 'y' && !state.units.has(base)) missing.add(base)
    for (const cd of s.coda) if (!state.units.has(`-${cd}`)) missing.add(`-${cd}`)
  }
  return [...missing]
}

export const isDecodable = (word, state) => missingFor(word, state).length === 0

export function applyUnlocks(state, lesson) {
  for (const u of lesson.unlock ?? []) state.units.add(u)
  for (const s of lesson.sight ?? []) state.sight.add(cleanWord(s))
}

// RNG con semilla para que cada reconstrucción dé el mismo resultado.
export function rng(seedText) {
  let h = 1779033703 ^ seedText.length
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled(items, rand) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
