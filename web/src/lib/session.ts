import type { Activity, ListenTap, Mistake, MistakeKind, Trouble, World } from '../types'

// ---------- Retomar una lección a medias ----------

export interface ResumeState {
  lessonId: string
  index: number
  /** Actividades falladas que todavía no se arreglan. */
  failed: string[]
  /** Actividades que se repiten al final (en orden). */
  retries: string[]
  fixed: number
  mistakes: Mistake[]
  elapsed: number
  savedAt: number
}

const resumeKey = (profileId: number) => `chispa.resume.${profileId}`
const RESUME_MAX_AGE = 24 * 60 * 60 * 1000

export function readResume(profileId: number, lessonId: string): ResumeState | null {
  try {
    const raw = localStorage.getItem(resumeKey(profileId))
    if (!raw) return null
    const state = JSON.parse(raw) as ResumeState
    if (state.lessonId !== lessonId || !state.index) return null
    if (Date.now() - state.savedAt > RESUME_MAX_AGE) return null
    return state
  } catch {
    return null
  }
}

export function saveResume(profileId: number, state: ResumeState) {
  try {
    localStorage.setItem(resumeKey(profileId), JSON.stringify(state))
  } catch {
    /* noop */
  }
}

export function clearResume(profileId: number) {
  try {
    localStorage.removeItem(resumeKey(profileId))
  } catch {
    /* noop */
  }
}

// ---------- Tiempo activo ----------

const IDLE_MS = 60 * 1000

export interface ActiveClock {
  start: () => void
  stop: () => void
  reset: (seconds?: number) => void
  seconds: () => number
}

/**
 * Cuenta solo el tiempo en que el niño está de verdad en la lección: se detiene con la
 * pantalla apagada o la app en segundo plano, y cada pausa sin tocar nada cuenta 1 minuto como máximo.
 */
export function createActiveClock(): ActiveClock {
  let total = 0
  let last = Date.now()
  let visible = true
  const tick = () => {
    const now = Date.now()
    if (visible) total += Math.min(now - last, IDLE_MS)
    last = now
  }
  const onVisibility = () => {
    tick()
    visible = document.visibilityState === 'visible'
  }
  return {
    start() {
      visible = document.visibilityState === 'visible'
      last = Date.now()
      document.addEventListener('visibilitychange', onVisibility)
      window.addEventListener('pointerdown', tick, true)
      window.addEventListener('keydown', tick, true)
    },
    stop() {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointerdown', tick, true)
      window.removeEventListener('keydown', tick, true)
    },
    reset(seconds = 0) {
      total = seconds * 1000
      last = Date.now()
    },
    seconds() {
      tick()
      return Math.round(total / 1000)
    }
  }
}

// ---------- Tiempo diario sugerido ----------

const LIMIT_KEY = 'chispa.dailyMinutes'
export const DAILY_OPTIONS = [10, 15, 20, 0] // 0 = sin límite

export function getDailyLimit(): number {
  try {
    const raw = localStorage.getItem(LIMIT_KEY)
    const value = raw === null ? 15 : Number(raw)
    return DAILY_OPTIONS.includes(value) ? value : 15
  } catch {
    return 15
  }
}

export function setDailyLimit(minutes: number) {
  try {
    localStorage.setItem(LIMIT_KEY, String(minutes))
  } catch {
    /* noop */
  }
}

/** ¿Ya leyó hoy lo sugerido? La app invita a descansar, no bloquea. */
export function reachedDailyLimit(todaySeconds: number): boolean {
  const limit = getDailyLimit()
  return limit > 0 && todaySeconds >= limit * 60
}

// ---------- Repaso de hoy ----------

/** Qué se practica en un “escucha y toca”: letra, sílaba, palabra o palabra mágica. */
export function listenKind(activity: ListenTap): MistakeKind {
  if (activity.prompt.startsWith('Palabra mágica')) return 'sight'
  if (activity.answer.length === 1) return 'letter'
  if (activity.prompt.includes('palabra')) return 'word-hear'
  return 'syllable'
}

export interface ReviewItem {
  activity: Activity
  kind: MistakeKind
  item: string
}

function matches(activity: Activity, trouble: Trouble): boolean {
  switch (trouble.kind) {
    case 'word-read':
      return activity.type === 'word_picture' && activity.audio === '' && activity.answer === trouble.item
    case 'sentence':
      return activity.type === 'sentence_picture' && activity.sentence === trouble.item
    case 'vowel':
      return activity.type === 'missing_letter' && activity.word === trouble.item
    default:
      return (
        activity.type === 'listen_tap' &&
        activity.answer === trouble.item &&
        listenKind(activity) === trouble.kind
      )
  }
}

export const REVIEW_MIN = 3
const REVIEW_MAX = 6

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Misma actividad con las opciones en otro orden, para que no se aprenda la posición. */
function reshuffled(activity: Activity): Activity {
  switch (activity.type) {
    case 'listen_tap':
    case 'missing_letter':
      return { ...activity, options: shuffle(activity.options) }
    case 'word_picture':
    case 'sentence_picture':
      return { ...activity, options: shuffle(activity.options) }
    default:
      return activity
  }
}

/**
 * Arma una sesión corta con lo que el niño ha fallado y todavía no resuelve.
 * Si hay varias actividades para lo mismo se elige una al azar, y las opciones se mezclan.
 */
export function buildReview(content: World[], trouble: Trouble[]): ReviewItem[] {
  const activities = content.flatMap((world) => world.lessons.flatMap((lesson) => lesson.activities))
  const items: ReviewItem[] = []
  for (const entry of trouble) {
    const found = activities.filter((activity) => matches(activity, entry))
    if (found.length) {
      const pick = found[Math.floor(Math.random() * found.length)]
      items.push({
        activity: { ...reshuffled(pick), id: `r${items.length + 1}` },
        kind: entry.kind,
        item: entry.item
      })
    }
    if (items.length >= REVIEW_MAX) break
  }
  return items
}

/** Textos que conviene grabar con la voz de la familia, de lo más útil a lo menos. */
export function recordingList(content: World[]): { title: string; items: string[] }[] {
  const syllables = new Set<string>()
  const words = new Set<string>()
  for (const world of content) {
    for (const lesson of world.lessons) {
      for (const activity of lesson.activities) {
        if (activity.type === 'learn') {
          activity.syllables.forEach((item) => syllables.add(item))
          if (activity.keyword) words.add(activity.keyword)
        } else if (activity.type === 'listen_tap') {
          const kind = listenKind(activity)
          const short = activity.audio === activity.answer && (kind === 'syllable' || kind === 'letter')
          if (short) syllables.add(activity.audio)
          else words.add(activity.audio)
        } else if (activity.type === 'blend') {
          activity.parts.forEach((item) => syllables.add(item))
          words.add(activity.word)
        } else if (activity.type === 'build_word') {
          activity.parts?.forEach((item) => syllables.add(item))
        }
      }
    }
  }
  const vowels = ['a', 'e', 'i', 'o', 'u']
  vowels.forEach((vowel) => syllables.delete(vowel))
  return [
    { title: 'Vocales', items: vowels },
    { title: 'Sílabas', items: [...syllables].filter((item) => item.length <= 4) },
    { title: 'Palabras', items: [...words].filter((item) => !item.includes(' ')) }
  ]
}
