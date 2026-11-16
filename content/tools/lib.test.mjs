// Pruebas del motor de sílabas y decodificabilidad.  node --test "content/tools/*.test.mjs"
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyUnlocks,
  cleanWord,
  countSyllables,
  isDecodable,
  missingFor,
  newState,
  rng,
  shuffled,
  soundKey,
  syllableStrings,
  wordsOf
} from './lib.mjs'

test('separa en sílabas palabras del currículo', () => {
  const cases = {
    mamá: ['ma', 'má'],
    caballo: ['ca', 'ba', 'llo'],
    perro: ['pe', 'rro'],
    tren: ['tren'],
    queso: ['que', 'so'],
    lluvia: ['llu', 'via'],
    guitarra: ['gui', 'ta', 'rra'],
    blanco: ['blan', 'co'],
    chocolate: ['cho', 'co', 'la', 'te'],
    ciudad: ['ciu', 'dad']
  }
  for (const [word, parts] of Object.entries(cases)) {
    assert.deepEqual(syllableStrings(word), parts, word)
    assert.equal(countSyllables(word), parts.length, word)
  }
})

test('la tilde rompe el diptongo (hiato)', () => {
  assert.deepEqual(syllableStrings('día'), ['dí', 'a'])
  assert.deepEqual(syllableStrings('sandía'), ['san', 'dí', 'a'])
  assert.deepEqual(syllableStrings('aéreo'), ['a', 'é', 're', 'o'])
})

test('limpia signos y separa las palabras de una frase', () => {
  assert.equal(cleanWord('¡Hola!'), 'hola')
  assert.deepEqual(wordsOf('Mi mamá me ama.'), ['mi', 'mamá', 'me', 'ama'])
})

test('sílabas que suenan igual comparten clave', () => {
  assert.equal(soundKey('ce'), soundKey('se'))
  assert.equal(soundKey('ba'), soundKey('va'))
  assert.notEqual(soundKey('ma'), soundKey('pa'))
})

test('una palabra solo es decodificable con lo ya enseñado', () => {
  const state = newState()
  assert.ok(isDecodable('a', state), 'las vocales se leen desde el inicio')
  assert.ok(missingFor('mamá', state).includes('m'))

  applyUnlocks(state, { unlock: ['m'], sight: ['y'] })
  assert.ok(!missingFor('mamá', state).includes('m'))
  assert.ok(isDecodable('y', state), 'las palabras de memoria cuentan como leídas')
  assert.deepEqual(missingFor('pulpo', state), ['p', '-l'])
})

test('el azar con semilla es determinista', () => {
  assert.equal(rng('x')(), rng('x')())
  assert.deepEqual(shuffled([1, 2, 3, 4], rng('a')), shuffled([1, 2, 3, 4], rng('a')))
  assert.deepEqual([...shuffled([1, 2, 3, 4], rng('a'))].sort(), [1, 2, 3, 4])
})
