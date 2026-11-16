import { silabas } from './silabas.mjs'
import { jardin } from './jardin.mjs'
import { palabras } from './palabras.mjs'
import { frases } from './frases.mjs'
import { montana } from './montana.mjs'
import { cuentos } from './cuentos.mjs'

// Orden pedagógico de los mundos. Los dos primeros son de conciencia fonológica
// (solo audio) y se conservan del currículo original.
export const WORLDS = [
  {
    legacy: 'bosque',
    // Más ejercicios de rimas e inicio de palabra (solo audio), con las posiciones mezcladas.
    patch(world, { DICT, rng, shuffled, opt, confusable }) {
      const RIMAS = [['pato', 'gato'], ['rana', 'manzana'], ['rosa', 'mariposa'], ['lobo', 'globo'], ['sol', 'farol'],
        ['perro', 'cerro'], ['bota', 'gota'], ['queso', 'hueso'], ['cama', 'rama']]
      const INICIOS = [['sol', 's'], ['luna', 'l'], ['mano', 'm'], ['pato', 'p'], ['tomate', 't'], ['rana', 'r'],
        ['dedo', 'd'], ['sopa', 's'], ['mono', 'm'], ['lupa', 'l'], ['pera', 'p'], ['nota', 'n']]
      const L = (id) => world.lessons.find((l) => l.id === id)
      const r2 = rng('m0-l2')
      L('m0-l2').activities = shuffled(RIMAS, r2).slice(0, 6).map(([a, b], i) => {
        const bad = Object.keys(DICT).filter((k) => k.slice(-2) !== a.slice(-2) && k.slice(-2) !== b.slice(-2) && DICT[k] !== DICT[b] && !confusable(k, b))
        const ds = []
        for (const k of shuffled(bad, r2)) if (ds.length < 2 && !ds.some((d) => DICT[d] === DICT[k])) ds.push(k)
        return { id: `a${i + 1}`, type: 'word_picture', prompt: `¿Qué rima con ${a}?`, audio: `¿Qué rima con ${a}?`,
          options: shuffled([b, ...ds], r2).map(opt), answer: b }
      })
      const r3 = rng('m0-l3')
      L('m0-l3').activities = shuffled(INICIOS, r3).slice(0, 6).map(([w, ch], i) => ({
        id: `a${i + 1}`, type: 'listen_tap', prompt: `¿Con qué letra empieza ${w}?`, audio: w,
        options: shuffled([ch, ...shuffled([...'mpslntdr'].filter((c) => c !== ch), r3).slice(0, 2)], r3), answer: ch
      }))
    }
  },
  {
    legacy: 'vocales',
    // Cada vocal empieza con su tarjeta de presentación y su trazo, y suma dos juegos más.
    patch(world, { rng, shuffled }) {
      const O = (emoji, label) => ({ emoji, label })
      const VOWELS = {
        'm1-l1': ['a', O('🐝', 'abeja'), [O('🌳', 'árbol'), O('🐘', 'elefante'), O('🐻', 'oso')]],
        'm1-l2': ['e', O('🐘', 'elefante'), [O('🧹', 'escoba'), O('✈️', 'avión'), O('🏝️', 'isla')]],
        'm1-l3': ['i', O('🏝️', 'isla'), [O('⛪', 'iglesia'), O('🐻', 'oso'), O('🍇', 'uva')]],
        'm1-l4': ['o', O('🐻', 'oso'), [O('👁️', 'ojo'), O('✈️', 'avión'), O('🐘', 'elefante')]],
        'm1-l5': ['u', O('🍇', 'uva'), [O('🦄', 'unicornio'), O('🐻', 'oso'), O('🏝️', 'isla')]]
      }
      for (const lesson of world.lessons) {
        const spec = VOWELS[lesson.id]
        if (spec) {
          const [v, kw, extra] = spec
          const r = rng(lesson.id + '+')
          const others = shuffled([...'aeiou'].filter((x) => x !== v), r).slice(0, 2)
          lesson.activities = [
            { type: 'learn', letter: v, upper: v.toUpperCase(), keyword: kw.label, emoji: kw.emoji, focus: v,
              parts: [kw.label[0], kw.label.slice(1)], say: `${kw.label[0].toUpperCase() + kw.label.slice(1)} empieza con ${v}.`, syllables: [v] },
            { type: 'trace', letter: v },
            ...lesson.activities,
            { type: 'word_picture', prompt: `¿Cuál empieza con ${v}?`, audio: `¿Cuál empieza con ${v}?`, options: shuffled(extra, r), answer: extra[0].label },
            { type: 'listen_tap', prompt: '¿Qué vocal suena?', audio: v, options: shuffled([v, ...others], r), answer: v }
          ]
        }
        // repaso: juntar cada mayúscula con su minúscula
        for (const a of lesson.activities) if (a.type === 'memory') a.pairs = a.items.map((x) => [x.toUpperCase(), x])
        lesson.activities.forEach((a, i) => { a.id = `a${i + 1}` })
      }
    }
  },
  silabas,
  jardin,
  palabras,
  frases,
  montana,
  cuentos
]
