import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '⚡',
  coins INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🌍',
  theme TEXT NOT NULL DEFAULT 'sky',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '📖',
  sort INTEGER NOT NULL DEFAULT 0,
  activities TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS progress (
  profile_id INTEGER NOT NULL,
  lesson_id TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0,
  best_correct INTEGER NOT NULL DEFAULT 0,
  best_total INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY (profile_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  lesson_id TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  seconds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS badges (
  profile_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  PRIMARY KEY (profile_id, code)
);

CREATE TABLE IF NOT EXISTS unlocks (
  profile_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY (profile_id, item_id)
);

CREATE TABLE IF NOT EXISTS daily (
  profile_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, day)
);

CREATE INDEX IF NOT EXISTS idx_progress_profile ON progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_attempts_profile ON attempts(profile_id);
CREATE INDEX IF NOT EXISTS idx_daily_profile ON daily(profile_id);
`

export function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA synchronous = NORMAL;')
  db.exec('PRAGMA busy_timeout = 5000;')
  db.exec(SCHEMA)
  return db
}

export function seedContent(db, content) {
  const insertWorld = db.prepare(
    'INSERT INTO worlds (id, title, subtitle, emoji, theme, sort) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const insertLesson = db.prepare(
    'INSERT INTO lessons (id, world_id, title, goal, emoji, sort, activities) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM lessons')
    db.exec('DELETE FROM worlds')
    content.worlds.forEach((world, wi) => {
      insertWorld.run(
        world.id,
        world.title,
        world.subtitle ?? '',
        world.emoji ?? '🌍',
        world.theme ?? 'sky',
        wi
      )
      world.lessons.forEach((lesson, li) => {
        insertLesson.run(
          lesson.id,
          world.id,
          lesson.title,
          lesson.goal ?? '',
          lesson.emoji ?? '📖',
          li,
          JSON.stringify(lesson.activities ?? [])
        )
      })
    })
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function readContent(db) {
  const worlds = db.prepare('SELECT * FROM worlds ORDER BY sort').all()
  const lessons = db.prepare('SELECT * FROM lessons ORDER BY sort').all()
  return {
    worlds: worlds.map((world) => ({
      ...world,
      lessons: lessons
        .filter((lesson) => lesson.world_id === world.id)
        .map((lesson) => ({ ...lesson, activities: JSON.parse(lesson.activities) }))
    }))
  }
}
