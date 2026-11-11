import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
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

  if (!getProfile(profileId)) return reply.code(404).send({ error: 'Perfil no encontrado' })
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

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    request.log.error(error)
    return reply.code(500).send({ error: 'No se pudo guardar el progreso' })
  }

  const summary = getSummary(profileId)
  const newBadges = awardBadges(profileId, summary)
  const profile = getProfile(profileId)

  return {
    ok: true,
    coinsEarned,
    totalCoins: profile.coins,
    newBadges,
    ...getSummary(profileId)
  }
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

app.get('/api/parents/summary', async () => {
  const profiles = db.prepare('SELECT id, name, avatar, coins, created_at FROM profiles ORDER BY id').all()
  return profiles.map((profile) => {
    const summary = getSummary(profile.id)
    const last = db
      .prepare('SELECT MAX(completed_at) AS last FROM progress WHERE profile_id = ?')
      .get(profile.id)
    return { ...profile, ...summary, lastPlayed: last?.last ?? null }
  })
})

app.delete('/api/profiles/:profileId/progress', async (request, reply) => {
  const profileId = Number(request.params.profileId)
  if (!getProfile(profileId)) return reply.code(404).send({ error: 'Perfil no encontrado' })
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM progress WHERE profile_id = ?').run(profileId)
    db.prepare('DELETE FROM attempts WHERE profile_id = ?').run(profileId)
    db.prepare('DELETE FROM badges WHERE profile_id = ?').run(profileId)
    db.prepare('DELETE FROM unlocks WHERE profile_id = ?').run(profileId)
    db.prepare('DELETE FROM daily WHERE profile_id = ?').run(profileId)
    db.prepare('UPDATE profiles SET coins = 0 WHERE id = ?').run(profileId)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    return reply.code(500).send({ error: 'No se pudo reiniciar' })
  }
  return { ok: true }
})

app.get('/api/backup', async (request, reply) => {
  db.exec('PRAGMA wal_checkpoint(FULL);')
  reply.header('Content-Disposition', `attachment; filename="chispa-${todayStr()}.db"`)
  reply.type('application/octet-stream')
  return reply.send(fs.createReadStream(DB_PATH))
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

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    try {
      db.close()
    } finally {
      process.exit(0)
    }
  })
}
