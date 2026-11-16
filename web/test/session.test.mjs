// Pruebas de la lógica pura de la sesión (Node 24 ejecuta el .ts quitándole los tipos).  npm test
import test from 'node:test'
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
}

const { buildReview, listenKind, reachedDailyLimit, setDailyLimit, starsFor } = await import(
  '../src/lib/session.ts'
)

test('estrellas: 3 sin errores, 2 con uno o dos, 1 con más', () => {
  assert.deepEqual([0, 1, 2, 3, 9].map(starsFor), [3, 2, 2, 1, 1])
})

test('clasifica qué practica un “escucha y toca”', () => {
  const tap = (prompt, answer) => ({ id: 'a1', type: 'listen_tap', prompt, audio: answer, options: [answer], answer })
  assert.equal(listenKind(tap('Toca la letra', 'm')), 'letter')
  assert.equal(listenKind(tap('Toca la sílaba', 'ma')), 'syllable')
  assert.equal(listenKind(tap('Toca la palabra', 'mamá')), 'word-hear')
  assert.equal(listenKind(tap('Palabra mágica', 'y')), 'sight')
})

test('el tiempo diario invita a descansar al llegar al límite; 0 lo apaga', () => {
  setDailyLimit(10)
  assert.equal(reachedDailyLimit(9 * 60), false)
  assert.equal(reachedDailyLimit(10 * 60), true)
  setDailyLimit(0)
  assert.equal(reachedDailyLimit(99 * 60), false)
})

const content = [
  {
    lessons: [
      {
        activities: [
          { id: 'a1', type: 'listen_tap', prompt: 'Toca la sílaba', audio: 'ma', options: ['ma', 'pa', 'sa'], answer: 'ma' },
          { id: 'a2', type: 'listen_tap', prompt: 'Toca la sílaba', audio: 'ma', options: ['me', 'ma', 'mi'], answer: 'ma' },
          {
            id: 'a3',
            type: 'word_picture',
            prompt: 'Lee: mamá',
            audio: '',
            options: [
              { emoji: '👩', label: 'mamá' },
              { emoji: '🗺️', label: 'mapa' }
            ],
            answer: 'mamá'
          },
          // Con audio no es lectura: no debe usarse para repasar "word-read".
          { id: 'a4', type: 'word_picture', prompt: '¿Dónde está papá?', options: [{ emoji: '👨', label: 'papá' }], answer: 'papá' }
        ]
      }
    ]
  }
]

test('el repaso arma una actividad por cada cosa que cuesta', () => {
  const review = buildReview(content, [
    { kind: 'syllable', item: 'ma', count: 2 },
    { kind: 'word-read', item: 'mamá', count: 1 },
    { kind: 'word-read', item: 'papá', count: 1 },
    { kind: 'syllable', item: 'zu', count: 1 }
  ])
  assert.deepEqual(review.map((entry) => [entry.kind, entry.item]), [
    ['syllable', 'ma'],
    ['word-read', 'mamá']
  ])
  assert.deepEqual(review.map((entry) => entry.activity.id), ['r1', 'r2'])
})

test('el repaso varía la actividad y mezcla opciones sin cambiarlas', () => {
  const seen = new Set()
  for (let i = 0; i < 60; i += 1) {
    const [entry] = buildReview(content, [{ kind: 'syllable', item: 'ma', count: 1 }])
    const options = entry.activity.options
    seen.add([...options].sort().join(','))
    assert.equal(entry.activity.answer, 'ma')
    assert.ok(options.includes('ma'))
  }
  assert.deepEqual([...seen].sort(), ['ma,me,mi', 'ma,pa,sa'])
})

test('el repaso tiene un máximo de 6 actividades', () => {
  const lessons = [
    {
      activities: 'bcdfglmn'.split('').map((letter, index) => ({
        id: `a${index}`,
        type: 'listen_tap',
        prompt: 'Toca la sílaba',
        audio: `${letter}a`,
        options: [`${letter}a`, `${letter}e`],
        answer: `${letter}a`
      }))
    }
  ]
  const trouble = 'bcdfglmn'.split('').map((letter) => ({ kind: 'syllable', item: `${letter}a`, count: 1 }))
  assert.equal(buildReview([{ lessons }], trouble).length, 6)
})
