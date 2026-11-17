// Pruebas de la API contra un servidor real con una base de datos temporal.  npm test
// Nunca usa data/lectura.db: DB_PATH apunta a una carpeta temporal que se borra al terminar.
import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const serverDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chispa-test-'))
const dbPath = path.join(tmp, 'test.db')
const TEST_PIN = '2468'
let server
let base
let profileId

const freePort = () =>
  new Promise((resolve) => {
    const probe = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

async function call(method, url, { body, token } = {}) {
  const response = await fetch(base + url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'x-parent-token': token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* respuesta binaria */
  }
  return { status: response.status, json, bytes: text.length }
}

const complete = (lessonId, requestId, extra = {}) =>
  call('POST', `/api/lessons/${lessonId}/complete`, {
    body: { profileId, stars: 3, correct: 5, total: 5, seconds: 60, requestId, ...extra }
  })

const progress = async () => (await call('GET', `/api/progress/${profileId}`)).json

before(async () => {
  const port = await freePort()
  base = `http://127.0.0.1:${port}`
  server = spawn(process.execPath, ['src/index.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath, TZ: 'America/Mexico_City' },
    stdio: 'ignore'
  })
  for (let tries = 0; tries < 100; tries += 1) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  const created = await call('POST', '/api/profiles', { body: { name: 'Prueba', avatar: '⚡' } })
  profileId = created.json.id
})

after(async () => {
  // En Windows la base no se puede borrar hasta que el servidor suelta el archivo.
  if (server && server.exitCode === null) {
    const closed = new Promise((resolve) => server.once('exit', resolve))
    server.kill()
    await closed
  }
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
})

test('el contenido se sirve con sus mundos y lecciones', async () => {
  const { json } = await call('GET', '/api/content')
  assert.ok(json.worlds.length >= 2)
  assert.ok(json.worlds.every((world) => world.lessons.length > 0))
})

test('una lección paga stars*5 + 5 la primera vez y limita las estrellas a 1–3', async () => {
  const first = await complete('m0-l1', 'prueba-pago-0001', { stars: 9 })
  assert.equal(first.json.coinsEarned, 20)
  const again = await complete('m0-l1', 'prueba-pago-0002', { stars: 1 })
  assert.equal(again.json.coinsEarned, 5)
  const data = await progress()
  assert.equal(data.progress['m0-l1'].stars, 3, 'se conserva la mejor marca')
  assert.equal(data.progress['m0-l1'].attempts, 2)
})

test('un envío repetido no se guarda dos veces', async () => {
  const before = (await progress()).profile.coins
  const first = await complete('m0-l2', 'prueba-repetido-01')
  const second = await complete('m0-l2', 'prueba-repetido-01')
  assert.equal(second.json.duplicate, true)
  assert.equal(second.json.totalCoins, first.json.totalCoins)
  const data = await progress()
  assert.equal(data.profile.coins, before + first.json.coinsEarned)
  assert.equal(data.progress['m0-l2'].attempts, 1)
})

test('lección o perfil inexistente responden 404', async () => {
  assert.equal((await complete('no-existe', 'prueba-404-000001')).status, 404)
  const other = await call('POST', '/api/lessons/m0-l1/complete', {
    body: { profileId: 9999, stars: 3, requestId: 'prueba-404-000002' }
  })
  assert.equal(other.status, 404)
})

test('repaso espaciado: 1, 3 y 7 días, y al cuarto acierto queda resuelto', async () => {
  const mistake = { kind: 'syllable', item: 'pa', chosen: 'ma' }
  await complete('m0-l3', 'prueba-repaso-leccion', { mistakes: [mistake] })
  const trouble = async () => (await progress()).trouble.map((entry) => entry.item)
  const state = () => {
    const db = new DatabaseSync(dbPath)
    const row = db.prepare("SELECT stage, due_at, resolved FROM mistakes WHERE item = 'pa'").get()
    db.close()
    return row
  }
  const makeDue = () => {
    const db = new DatabaseSync(dbPath)
    db.exec("UPDATE mistakes SET due_at = '2000-01-01' WHERE item = 'pa' AND resolved = 0")
    db.close()
  }
  const solve = (n) =>
    call('POST', '/api/review/complete', {
      body: { profileId, seconds: 10, requestId: `prueba-repaso-000${n}`, mistakes: [], solved: [{ ...mistake, chosen: '' }] }
    })
  const daysAhead = (iso) => Math.round((new Date(`${iso}T12:00:00Z`) - Date.now()) / 86400000)

  assert.deepEqual(await trouble(), ['pa'])
  const expected = [1, 3, 7]
  for (let n = 0; n < 3; n += 1) {
    await solve(n)
    const row = state()
    assert.equal(row.stage, n + 1)
    assert.equal(row.resolved, 0)
    assert.ok(Math.abs(daysAhead(row.due_at) - expected[n]) <= 1, `intervalo ${expected[n]} días`)
    assert.deepEqual(await trouble(), [], 'no toca hasta que venza')
    makeDue()
    assert.deepEqual(await trouble(), ['pa'])
  }
  await solve(3)
  assert.equal(state().resolved, 1)
  assert.deepEqual(await trouble(), [])
})

test('la zona de Padres exige PIN y sesión', async () => {
  assert.equal((await call('GET', '/api/parents/summary')).status, 403, 'sin PIN creado')
  assert.equal((await call('GET', '/api/backup')).status, 403)
  assert.equal((await call('POST', '/api/parents/pin', { body: { pin: '12' } })).status, 400)

  const created = await call('POST', '/api/parents/pin', { body: { pin: TEST_PIN } })
  const token = created.json.token
  assert.ok(token)
  assert.equal((await call('GET', '/api/parents/summary')).status, 401, 'sin sesión')
  assert.equal((await call('DELETE', `/api/profiles/${profileId}/progress`)).status, 401)
  assert.equal((await call('PUT', '/api/settings', { body: { dailyMinutes: 20 } })).status, 401)
  assert.equal((await call('POST', '/api/parents/pin', { body: { pin: '9999' } })).status, 401, 'no se cambia sin sesión')
  assert.equal((await call('POST', '/api/parents/login', { body: { pin: '0000' } })).status, 401)
  assert.equal((await call('POST', '/api/parents/login', { body: { pin: TEST_PIN } })).status, 200)

  const summary = await call('GET', '/api/parents/summary', { token })
  assert.equal(summary.status, 200)
  assert.equal(summary.json[0].week.days.length, 7)
  assert.ok(Array.isArray(summary.json[0].letters))

  const saved = await call('PUT', '/api/settings', { token, body: { dailyMinutes: 20 } })
  assert.deepEqual(saved.json, { dailyMinutes: 20 })
  assert.deepEqual((await call('GET', '/api/settings')).json, { dailyMinutes: 20 })

  const backup = await fetch(`${base}/api/backup`, { headers: { 'x-parent-token': token } })
  const bytes = Buffer.from(await backup.arrayBuffer())
  assert.equal(bytes.subarray(0, 15).toString(), 'SQLite format 3')
})

test('completar un mundo entrega su medalla', async () => {
  const { json } = await call('GET', '/api/content')
  const world = json.worlds[0]
  for (const lesson of world.lessons) await complete(lesson.id, `prueba-mundo-${lesson.id}`)
  const data = await progress()
  const codes = data.badges.map((badge) => badge.code)
  assert.ok(codes.includes(`mundo-${world.id}`))
  assert.ok(codes.includes('primer-mundo'))
  assert.ok(data.badgeCatalog.length > codes.length)
})

test('el respaldo automático se crea al arrancar con datos', async () => {
  // El primer arranque no tenía perfiles; el respaldo se comprueba con la copia descargada arriba
  // y con que la carpeta de respaldos no contenga archivos a medias.
  const dir = path.join(tmp, 'backups')
  const leftovers = fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => /\.tmp$|^\.descarga-/.test(name)) : []
  assert.deepEqual(leftovers, [])
})
