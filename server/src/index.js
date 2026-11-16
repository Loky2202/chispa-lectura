import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDb, seedContent, readContent } from './db.js'
import { REWARDS, BADGES } from './rewards.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'data/lectura.db')
const CONTENT_PATH = process.env.CONTENT_PATH || path.join(ROOT, 'content/worlds.json')
const WEB_DIST = path.join(ROOT, 'web/dist')
const PORT = Number(process.env.PORT || 3000)
const TZ = process.env.TZ || 'America/Mexico_City'
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), 'backups')
const BACKUP_KEEP = Math.max(1, Number(process.env.BACKUP_KEEP) || 14)

const db = openDb(DB_PATH)

if (fs.existsSync(CONTENT_PATH)) {
  const content = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'))
  seedContent(db, content)
  console.log(`Contenido cargado: ${content.worlds.length} mundos`)
} else {
  console.warn(`No se encontró el contenido en ${CONTENT_PATH}`)
}

function todayStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

function shiftDay(day, delta) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

function getStreak(profileId) {
  const days = new Set(
    db
      .prepare('SELECT day FROM daily WHERE profile_id = ? AND seconds > 0 ORDER BY day DESC')
      .all(profileId)
      .map((row) => row.day)
  )
  let cursor = todayStr()
  if (!days.has(cursor)) cursor = shiftDay(cursor, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

function getSummary(profileId) {
  const stats = db
    .prepare(
      'SELECT COUNT(*) AS lessons, COALESCE(SUM(stars), 0) AS stars FROM progress WHERE profile_id = ?'
    )
    .get(profileId)
  const seconds = db
    .prepare('SELECT COALESCE(SUM(seconds), 0) AS total FROM daily WHERE profile_id = ?')
    .get(profileId)
  const today = db
    .prepare('SELECT COALESCE(seconds, 0) AS total FROM daily WHERE profile_id = ? AND day = ?')
    .get(profileId, todayStr())
  const xp = stats.lessons * 10 + stats.stars * 5
  return {
    lessonsCompleted: stats.lessons,
    totalStars: stats.stars,
    totalSeconds: seconds.total,
    todaySeconds: today?.total ?? 0,
    streak: getStreak(profileId),
    energy: Math.min(10, 1 + Math.floor(xp / 40))
  }
}

// ---------- Envíos idempotentes ----------
// La app manda un requestId por lección o repaso terminado. Si el mismo envío llega dos veces
// (se perdió la respuesta, reintento de la cola offline), se devuelve lo ya guardado.
db.prepare('DELETE FROM requests WHERE created_at < ?').run(
  new Date(Date.now() - 60 * 86400000).toISOString()
)

const cleanRequestId = (raw) => {
  const id = String(raw ?? '').trim()
  return /^[\w-]{8,64}$/.test(id) ? id : ''
}

function replayRequest(requestId, profileId) {
  if (!requestId) return null
  const row = db.prepare('SELECT response FROM requests WHERE id = ?').get(requestId)
  if (!row) return null
  if (row.response) return { ...JSON.parse(row.response), duplicate: true }
  const coins = getProfile(profileId)?.coins ?? 0
  return { ok: true, duplicate: true, coinsEarned: 0, totalCoins: coins, newBadges: [], ...getSummary(profileId) }
}

function claimRequest(requestId, now) {
  if (requestId) db.prepare('INSERT INTO requests (id, created_at) VALUES (?, ?)').run(requestId, now)
}

function storeResponse(requestId, response) {
  if (requestId) db.prepare('UPDATE requests SET response = ? WHERE id = ?').run(JSON.stringify(response), requestId)
  return response
}

// ---------- Respaldos ----------
// VACUUM INTO escribe una copia completa y consistente aunque el servidor esté en uso.
function snapshotTo(dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.rmSync(dest, { force: true })
  db.prepare('VACUUM INTO ?').run(dest)
}

const AUTO_BACKUP = /^auto-\d{4}-\d{2}-\d{2}\.db$/

// Un respaldo por día en data/backups/auto-AAAA-MM-DD.db; se conservan los BACKUP_KEEP más recientes.
// Los archivos con otro nombre (respaldos manuales) no se tocan.
function autoBackup() {
  try {
    const hasData = db.prepare('SELECT 1 FROM profiles LIMIT 1').get()
    if (!hasData) return
    const dest = path.join(BACKUP_DIR, `auto-${todayStr()}.db`)
    if (fs.existsSync(dest)) return
    const partial = `${dest}.tmp`
    snapshotTo(partial)
    fs.renameSync(partial, dest)
    const old = fs
      .readdirSync(BACKUP_DIR)
      .filter((name) => AUTO_BACKUP.test(name))
      .sort()
      .reverse()
      .slice(BACKUP_KEEP)
    for (const name of old) fs.rmSync(path.join(BACKUP_DIR, name), { force: true })
    console.log(`Respaldo automático: ${dest}`)
  } catch (error) {
    console.error('No se pudo crear el respaldo automático:', error.message)
  }
}

// ---------- Zona de Padres: PIN ----------
// El PIN se guarda como hash (scrypt). Al entrar, el servidor entrega un token temporal
// que la app manda en la cabecera x-parent-token.
const PIN_KEY = 'parent_pin'
const SESSION_MS = 2 * 60 * 60 * 1000
const MAX_PIN_FAILS = 5
const LOCK_MS = 60 * 1000
const sessions = new Map()
let pinFails = 0
let lockedUntil = 0

if (process.env.PARENT_PIN_RESET === '1') {
  db.prepare('DELETE FROM config WHERE key = ?').run(PIN_KEY)
  console.warn('PARENT_PIN_RESET=1: se borró el PIN de Padres. Quita la variable y crea uno nuevo.')
}

const validPin = (pin) => /^\d{4,8}$/.test(pin)
const storedPin = () => db.prepare('SELECT value FROM config WHERE key = ?').get(PIN_KEY)?.value ?? null

function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(pin, salt, 32).toString('hex')}`
}

function pinMatches(pin, stored) {
  const [salt, hash] = stored.split(':')
  const expected = Buffer.from(hash, 'hex')
  const actual = crypto.scryptSync(pin, salt, 32)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function newSession() {
  const now = Date.now()
  for (const [token, expires] of sessions) if (expires < now) sessions.delete(token)
  const token = crypto.randomBytes(24).toString('hex')
  sessions.set(token, now + SESSION_MS)
  return token
}

function hasSession(request) {
  const token = String(request.headers['x-parent-token'] ?? '')
  const expires = sessions.get(token)
  return Boolean(expires && expires > Date.now())
}

async function requireParent(request, reply) {
  if (!storedPin()) {
    return reply.code(403).send({ error: 'Primero crea un PIN en la zona de Padres', code: 'pin-required' })
  }
  if (!hasSession(request)) {
    return reply.code(401).send({ error: 'Entra a la zona de Padres con tu PIN', code: 'pin-login' })
  }
}

const parentOnly = { preHandler: requireParent }

const MISTAKE_KINDS = new Set(['letter', 'syllable', 'sight', 'word-hear', 'word-read', 'sentence', 'vowel'])

function cleanMistakes(list) {
  if (!Array.isArray(list)) return []
  return list
    .slice(0, 40)
    .map((m) => ({
      kind: String(m?.kind ?? ''),
      item: String(m?.item ?? '').slice(0, 120),
      chosen: String(m?.chosen ?? '').slice(0, 120)
    }))
    .filter((m) => MISTAKE_KINDS.has(m.kind) && m.item)
}

function saveMistakes(profileId, lessonId, list, now) {
  const insert = db.prepare(
    'INSERT INTO mistakes (profile_id, lesson_id, kind, item, chosen, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  for (const m of list) insert.run(profileId, lessonId, m.kind, m.item, m.chosen, now)
}

// Lo que todavía no ha resuelto, lo más repetido primero.
function getTrouble(profileId, limit = 12) {
  return db
    .prepare(
      `SELECT kind, item, COUNT(*) AS count, MAX(created_at) AS last FROM mistakes
       WHERE profile_id = ? AND resolved = 0
       GROUP BY kind, item ORDER BY count DESC, last DESC LIMIT ?`
    )
    .all(profileId, limit)
}

// Para Padres: qué confundió con qué en los últimos 30 días.
function getConfusions(profileId, limit = 10) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  return db
    .prepare(
      `SELECT kind, item, chosen, COUNT(*) AS count, MIN(resolved) = 1 AS resolved FROM mistakes
       WHERE profile_id = ? AND created_at >= ?
       GROUP BY kind, item, chosen ORDER BY count DESC, MAX(created_at) DESC LIMIT ?`
    )
    .all(profileId, since, limit)
    .map((row) => ({ ...row, resolved: Boolean(row.resolved) }))
}

function getProfile(profileId) {
  return db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId)
}

function awardBadges(profileId, summary) {
  const earned = new Set(
    db
      .prepare('SELECT code FROM badges WHERE profile_id = ?')
      .all(profileId)
      .map((row) => row.code)
  )
  const candidates = []
  const add = (code, condition) => {
    if (condition && !earned.has(code)) candidates.push(code)
  }

  add('primer-paso', summary.lessonsCompleted >= 1)
  add('cinco-lecciones', summary.lessonsCompleted >= 5)
  add('diez-lecciones', summary.lessonsCompleted >= 10)
  add('veinte-lecciones', summary.lessonsCompleted >= 20)
  add('monedas-100', (getProfile(profileId)?.coins ?? 0) >= 100)

  const perfect = db
    .prepare('SELECT COUNT(*) AS c FROM progress WHERE profile_id = ? AND stars = 3')
    .get(profileId)
  add('perfecto', perfect.c >= 1)
  add('tres-dias', summary.streak >= 3)

  const worlds = db.prepare('SELECT id FROM worlds').all()
  const worldComplete = worlds.some((world) => {
    const total = db
      .prepare('SELECT COUNT(*) AS c FROM lessons WHERE world_id = ?')
      .get(world.id).c
    const done = db
      .prepare(
        `SELECT COUNT(*) AS c FROM progress p
         JOIN lessons l ON l.id = p.lesson_id
         WHERE p.profile_id = ? AND l.world_id = ? AND p.stars > 0`
      )
      .get(profileId, world.id).c
    return total > 0 && done >= total
  })
  add('primer-mundo', worldComplete)

  const insert = db.prepare(
    'INSERT OR IGNORE INTO badges (profile_id, code, earned_at) VALUES (?, ?, ?)'
  )
  const now = new Date().toISOString()
  candidates.forEach((code) => insert.run(profileId, code, now))
  return candidates.map((code) => ({ code, ...BADGES[code] }))
}

const app = Fastify({ logger: true, trustProxy: true })

app.get('/api/health', async () => ({ ok: true, service: 'chispa', time: new Date().toISOString() }))

app.get('/api/content', async () => readContent(db))

app.get('/api/rewards', async () => REWARDS)

app.get('/api/profiles', async () =>
  db.prepare('SELECT id, name, avatar, coins, created_at FROM profiles ORDER BY id').all()
)

app.post('/api/profiles', async (request, reply) => {
  const body = request.body ?? {}
  const name = String(body.name ?? '').trim().slice(0, 24)
  const avatar = String(body.avatar ?? '⚡').slice(0, 8)
  if (!name) return reply.code(400).send({ error: 'El nombre es obligatorio' })
  const now = new Date().toISOString()
  const info = db
    .prepare('INSERT INTO profiles (name, avatar, coins, created_at) VALUES (?, ?, 0, ?)')
    .run(name, avatar, now)
  const profile = getProfile(Number(info.lastInsertRowid))
  return { ...profile, settings: JSON.parse(profile.settings) }
})

app.get('/api/progress/:profileId', async (request, reply) => {
  const profileId = Number(request.params.profileId)
  const profile = getProfile(profileId)
  if (!profile) return reply.code(404).send({ error: 'Perfil no encontrado' })

  const progress = {}
  db.prepare('SELECT * FROM progress WHERE profile_id = ?')
    .all(profileId)
    .forEach((row) => {
      progress[row.lesson_id] = {
        stars: row.stars,
        bestCorrect: row.best_correct,
        bestTotal: row.best_total,
        attempts: row.attempts,
        completedAt: row.completed_at
      }
    })

  const badges = db
    .prepare('SELECT code, earned_at FROM badges WHERE profile_id = ?')
    .all(profileId)
    .map((row) => ({ code: row.code, earnedAt: row.earned_at, ...BADGES[row.code] }))

  const unlocks = db
    .prepare('SELECT item_id, unlocked_at FROM unlocks WHERE profile_id = ?')
    .all(profileId)
    .map((row) => row.item_id)

  return {
    profile: { ...profile, settings: JSON.parse(profile.settings) },
    progress,
    badges,
    unlocks,
    trouble: getTrouble(profileId),
    ...getSummary(profileId)
  }
})

app.post('/api/lessons/:lessonId/complete', async (request, reply) => {
  const { lessonId } = request.params
  const body = request.body ?? {}
  const profileId = Number(body.profileId)
  const stars = Math.max(1, Math.min(3, Math.round(Number(body.stars) || 1)))
  const correct = Math.max(0, Math.round(Number(body.correct) || 0))
  const total = Math.max(0, Math.round(Number(body.total) || 0))
  const seconds = Math.max(0, Math.min(3600, Math.round(Number(body.seconds) || 0)))
  const mistakes = cleanMistakes(body.mistakes)
  const requestId = cleanRequestId(body.requestId)

  if (!getProfile(profileId)) return reply.code(404).send({ error: 'Perfil no encontrado' })
  const replayed = replayRequest(requestId, profileId)
  if (replayed) return replayed
  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId)
  if (!lesson) return reply.code(404).send({ error: 'Lección no encontrada' })

  const existing = db
    .prepare('SELECT * FROM progress WHERE profile_id = ? AND lesson_id = ?')
    .get(profileId, lessonId)
  const firstTime = !existing
  const coinsEarned = stars * 5 + (firstTime ? 5 : 0)
  const now = new Date().toISOString()

  db.exec('BEGIN')
  try {
    claimRequest(requestId, now)
    db.prepare(
      `INSERT INTO progress (profile_id, lesson_id, stars, best_correct, best_total, attempts, completed_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(profile_id, lesson_id) DO UPDATE SET
         stars = MAX(progress.stars, excluded.stars),
         best_correct = MAX(progress.best_correct, excluded.best_correct),
         best_total = MAX(progress.best_total, excluded.best_total),
         attempts = progress.attempts + 1,
         completed_at = excluded.completed_at`
    ).run(profileId, lessonId, stars, correct, total, now)

    db.prepare('UPDATE profiles SET coins = coins + ? WHERE id = ?').run(coinsEarned, profileId)
    db.prepare(
      `INSERT INTO daily (profile_id, day, seconds, coins) VALUES (?, ?, ?, ?)
       ON CONFLICT(profile_id, day) DO UPDATE SET
         seconds = daily.seconds + excluded.seconds,
         coins = daily.coins + excluded.coins`
    ).run(profileId, todayStr(), seconds, coinsEarned)
    db.prepare(
      'INSERT INTO attempts (profile_id, lesson_id, stars, correct, total, seconds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(profileId, lessonId, stars, correct, total, seconds, now)
    saveMistakes(profileId, lessonId, mistakes, now)

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    request.log.error(error)
    return reply.code(500).send({ error: 'No se pudo guardar el progreso' })
  }

  const summary = getSummary(profileId)
  const newBadges = awardBadges(profileId, summary)
  const profile = getProfile(profileId)

  return storeResponse(requestId, {
    ok: true,
    coinsEarned,
    totalCoins: profile.coins,
    newBadges,
    ...getSummary(profileId)
  })
})

// Repaso de hoy: marca como resuelto lo que respondió bien a la primera y guarda lo que volvió a fallar.
app.post('/api/review/complete', async (request, reply) => {
  const body = request.body ?? {}
  const profileId = Number(body.profileId)
  if (!getProfile(profileId)) return reply.code(404).send({ error: 'Perfil no encontrado' })
  const seconds = Math.max(0, Math.min(3600, Math.round(Number(body.seconds) || 0)))
  const mistakes = cleanMistakes(body.mistakes)
  const solved = cleanMistakes(body.solved)
  const requestId = cleanRequestId(body.requestId)
  const replayed = replayRequest(requestId, profileId)
  if (replayed) return replayed
  const coinsEarned = 5
  const now = new Date().toISOString()

  db.exec('BEGIN')
  try {
    claimRequest(requestId, now)
    const resolve = db.prepare(
      'UPDATE mistakes SET resolved = 1 WHERE profile_id = ? AND kind = ? AND item = ? AND resolved = 0'
    )
    for (const m of solved) resolve.run(profileId, m.kind, m.item)
    saveMistakes(profileId, 'repaso', mistakes, now)
    db.prepare('UPDATE profiles SET coins = coins + ? WHERE id = ?').run(coinsEarned, profileId)
    db.prepare(
      `INSERT INTO daily (profile_id, day, seconds, coins) VALUES (?, ?, ?, ?)
       ON CONFLICT(profile_id, day) DO UPDATE SET
         seconds = daily.seconds + excluded.seconds,
         coins = daily.coins + excluded.coins`
    ).run(profileId, todayStr(), seconds, coinsEarned)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    request.log.error(error)
    return reply.code(500).send({ error: 'No se pudo guardar el repaso' })
  }

  return storeResponse(requestId, {
    ok: true,
    coinsEarned,
    totalCoins: getProfile(profileId).coins,
    newBadges: [],
    ...getSummary(profileId)
  })
})

// ---------- Voces grabadas ----------
app.addContentTypeParser(/^(audio|video)\//, { parseAs: 'buffer', bodyLimit: 2 * 1024 * 1024 }, (request, body, done) =>
  done(null, body)
)

const audioKey = (raw) => String(raw ?? '').toLowerCase().normalize('NFC').trim().slice(0, 160)

app.get('/api/audio', async () =>
  db.prepare('SELECT key, updated_at AS updatedAt FROM audio ORDER BY key').all()
)

app.get('/api/audio/:key', async (request, reply) => {
  const row = db.prepare('SELECT mime, data FROM audio WHERE key = ?').get(audioKey(request.params.key))
  if (!row) return reply.code(404).send({ error: 'Sin grabación' })
  reply.header('Cache-Control', 'public, max-age=31536000, immutable')
  reply.type(row.mime)
  return reply.send(Buffer.from(row.data))
})

app.put('/api/audio/:key', parentOnly, async (request, reply) => {
  const key = audioKey(request.params.key)
  const body = request.body
  if (!key || !Buffer.isBuffer(body) || body.length < 200) {
    return reply.code(400).send({ error: 'Grabación vacía' })
  }
  const mime = String(request.headers['content-type'] ?? 'audio/webm').slice(0, 80)
  const updatedAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO audio (key, mime, data, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET mime = excluded.mime, data = excluded.data, updated_at = excluded.updated_at`
  ).run(key, mime, body, updatedAt)
  return { ok: true, key, updatedAt }
})

app.delete('/api/audio/:key', parentOnly, async (request) => {
  db.prepare('DELETE FROM audio WHERE key = ?').run(audioKey(request.params.key))
  return { ok: true }
})

app.post('/api/rewards/unlock', async (request, reply) => {
  const body = request.body ?? {}
  const profileId = Number(body.profileId)
  const itemId = String(body.itemId ?? '')
  const item = REWARDS.find((reward) => reward.id === itemId)
  if (!item) return reply.code(404).send({ error: 'Recompensa no encontrada' })
  const profile = getProfile(profileId)
  if (!profile) return reply.code(404).send({ error: 'Perfil no encontrado' })

  const already = db
    .prepare('SELECT 1 FROM unlocks WHERE profile_id = ? AND item_id = ?')
    .get(profileId, itemId)
  if (already) return reply.code(400).send({ error: 'Ya lo tienes' })
  if (profile.coins < item.cost) return reply.code(400).send({ error: 'Faltan monedas' })

  db.exec('BEGIN')
  try {
    db.prepare('UPDATE profiles SET coins = coins - ? WHERE id = ?').run(item.cost, profileId)
    db.prepare('INSERT INTO unlocks (profile_id, item_id, unlocked_at) VALUES (?, ?, ?)').run(
      profileId,
      itemId,
      new Date().toISOString()
    )
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    return reply.code(500).send({ error: 'No se pudo desbloquear' })
  }

  return { ok: true, coins: getProfile(profileId).coins, item }
})

app.get('/api/parents/status', async (request) => ({
  hasPin: Boolean(storedPin()),
  authed: Boolean(storedPin()) && hasSession(request)
}))

// Crea el PIN (si no hay) o lo cambia (con sesión abierta).
app.post('/api/parents/pin', async (request, reply) => {
  const pin = String(request.body?.pin ?? '')
  if (!validPin(pin)) return reply.code(400).send({ error: 'El PIN debe tener de 4 a 8 números' })
  if (storedPin() && !hasSession(request)) {
    return reply.code(401).send({ error: 'Entra a la zona de Padres con tu PIN', code: 'pin-login' })
  }
  db.prepare(
    'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(PIN_KEY, hashPin(pin))
  sessions.clear()
  return { ok: true, token: newSession() }
})

app.post('/api/parents/login', async (request, reply) => {
  const stored = storedPin()
  if (!stored) return reply.code(403).send({ error: 'Primero crea un PIN', code: 'pin-required' })
  const wait = Math.ceil((lockedUntil - Date.now()) / 1000)
  if (wait > 0) return reply.code(429).send({ error: `Demasiados intentos. Espera ${wait} segundos.` })
  const pin = String(request.body?.pin ?? '')
  if (!validPin(pin) || !pinMatches(pin, stored)) {
    pinFails += 1
    if (pinFails >= MAX_PIN_FAILS) {
      pinFails = 0
      lockedUntil = Date.now() + LOCK_MS
    }
    return reply.code(401).send({ error: 'PIN incorrecto', code: 'pin-wrong' })
  }
  pinFails = 0
  return { ok: true, token: newSession() }
})

app.get('/api/parents/summary', parentOnly, async () => {
  const profiles = db.prepare('SELECT id, name, avatar, coins, created_at FROM profiles ORDER BY id').all()
  return profiles.map((profile) => {
    const summary = getSummary(profile.id)
    const last = db
      .prepare('SELECT MAX(completed_at) AS last FROM progress WHERE profile_id = ?')
      .get(profile.id)
    return { ...profile, ...summary, lastPlayed: last?.last ?? null, confusions: getConfusions(profile.id) }
  })
})

app.delete('/api/profiles/:profileId/progress', parentOnly, async (request, reply) => {
  const profileId = Number(request.params.profileId)
  if (!getProfile(profileId)) return reply.code(404).send({ error: 'Perfil no encontrado' })
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM progress WHERE profile_id = ?').run(profileId)
    db.prepare('DELETE FROM attempts WHERE profile_id = ?').run(profileId)
    db.prepare('DELETE FROM badges WHERE profile_id = ?').run(profileId)
    db.prepare('DELETE FROM unlocks WHERE profile_id = ?').run(profileId)
    db.prepare('DELETE FROM daily WHERE profile_id = ?').run(profileId)
    db.prepare('DELETE FROM mistakes WHERE profile_id = ?').run(profileId)
    db.prepare('UPDATE profiles SET coins = 0 WHERE id = ?').run(profileId)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    return reply.code(500).send({ error: 'No se pudo reiniciar' })
  }
  return { ok: true }
})

app.get('/api/backup', parentOnly, async (request, reply) => {
  const temp = path.join(BACKUP_DIR, `.descarga-${crypto.randomBytes(6).toString('hex')}.db`)
  let data
  try {
    snapshotTo(temp)
    data = fs.readFileSync(temp)
  } finally {
    fs.rmSync(temp, { force: true })
  }
  reply.header('Content-Disposition', `attachment; filename="chispa-${todayStr()}.db"`)
  reply.type('application/octet-stream')
  return reply.send(data)
})

if (fs.existsSync(WEB_DIST)) {
  await app.register(fastifyStatic, { root: WEB_DIST, prefix: '/' })
  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith('/api/')) {
      return reply.code(404).send({ error: 'No encontrado' })
    }
    return reply.sendFile('index.html')
  })
} else {
  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({ error: 'La interfaz no está compilada. Ejecuta npm run build en web/.' })
  })
}

app.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  reply.code(error.statusCode || 500).send({ error: error.message || 'Error interno' })
})

async function start() {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Chispa escuchando en http://localhost:${PORT}`)
    console.log(`Base de datos: ${DB_PATH}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()

autoBackup()
setInterval(autoBackup, 60 * 60 * 1000).unref()

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    try {
      db.close()
    } finally {
      process.exit(0)
    }
  })
}
