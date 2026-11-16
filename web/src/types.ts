export interface Option {
  emoji: string
  label: string
}

export interface ListenTap {
  id: string
  type: 'listen_tap'
  prompt: string
  audio: string
  options: string[]
  answer: string
}

export interface WordPicture {
  id: string
  type: 'word_picture'
  prompt: string
  /** '' = actividad de lectura silenciosa (sin audio automático). */
  audio?: string
  /** Oculta el texto bajo cada imagen (para no dar la respuesta escrita). */
  hideLabels?: boolean
  /** Sílabas de la palabra a leer (se pintan en dos colores). */
  parts?: string[]
  options: Option[]
  answer: string
}

/** Presentación de una letra o grupo de sílabas: no tiene respuesta incorrecta. */
export interface Learn {
  id: string
  type: 'learn'
  letter?: string
  upper?: string
  keyword?: string
  emoji?: string
  /** Sílaba de la palabra clave que se resalta. */
  focus?: string
  parts?: string[]
  say?: string
  note?: string
  syllables: string[]
}

/** Unir sílabas para formar una palabra: no tiene respuesta incorrecta. */
export interface Blend {
  id: string
  type: 'blend'
  word: string
  parts: string[]
  emoji?: string
}

export interface CountSyllables {
  id: string
  type: 'count_syllables'
  word: string
  emoji: string
  options: number[]
  answer: number
}

export interface MissingLetter {
  id: string
  type: 'missing_letter'
  word: string
  display: string
  emoji: string
  options: string[]
  answer: string
}

export interface BuildWord {
  id: string
  type: 'build_word'
  word: string
  emoji: string
  /** Si viene, la palabra se arma con fichas de sílaba en vez de letra por letra. */
  parts?: string[]
  /** Fichas de sílaba que sobran (distractores). */
  extra?: string[]
}

/** Dibujar la letra con el dedo sobre su silueta: no tiene respuesta incorrecta. */
export interface Trace {
  id: string
  type: 'trace'
  letter: string
}

export interface SentencePicture {
  id: string
  type: 'sentence_picture'
  sentence: string
  /** Pregunta de comprensión que se dice en voz alta (“¿Quién usa la lupa?”). */
  question?: string
  hideLabels?: boolean
  options: Option[]
  answer: string
}

export interface ReadAloud {
  id: string
  type: 'read_aloud'
  text: string
  emoji?: string
}

export interface Memory {
  id: string
  type: 'memory'
  items: string[]
  /** Parejas distintas que van juntas (mayúscula y minúscula). */
  pairs?: [string, string][]
}

export interface Sequence {
  id: string
  type: 'sequence'
  length: number
}

export interface Story {
  id: string
  type: 'story'
  title: string
  pages: { text: string; emoji: string }[]
  questions: { q: string; options: string[]; answer: string }[]
}

export interface OddOneOut {
  id: string
  type: 'odd_one_out'
  prompt: string
  options: Option[]
  answer: string
}

export type Activity =
  | ListenTap
  | WordPicture
  | CountSyllables
  | MissingLetter
  | BuildWord
  | SentencePicture
  | ReadAloud
  | Memory
  | Sequence
  | Story
  | OddOneOut
  | Learn
  | Blend
  | Trace

export type MistakeKind = 'letter' | 'syllable' | 'sight' | 'word-hear' | 'word-read' | 'sentence' | 'vowel'

/** Algo que el niño falló: qué tenía que encontrar y qué eligió. */
export interface Mistake {
  kind: MistakeKind
  item: string
  chosen: string
}

export interface Trouble {
  kind: MistakeKind
  item: string
  count: number
  last: string
}

export interface Confusion {
  kind: MistakeKind
  item: string
  chosen: string
  count: number
  resolved: boolean
  /** Aciertos seguidos en el repaso espaciado (0–3) mientras no está resuelto. */
  stage?: number
}

export interface Lesson {
  id: string
  world_id: string
  title: string
  goal: string
  emoji: string
  sort: number
  activities: Activity[]
}

export interface World {
  id: string
  title: string
  subtitle: string
  emoji: string
  theme: string
  sort: number
  lessons: Lesson[]
}

export interface Profile {
  id: number
  name: string
  avatar: string
  coins: number
  created_at: string
  settings?: Record<string, unknown>
}

export interface ProgressEntry {
  stars: number
  bestCorrect?: number
  bestTotal?: number
  attempts?: number
  completedAt?: string
}

export interface Badge {
  code: string
  name: string
  emoji: string
  earnedAt: string
}

export interface ProgressData {
  profile: Profile
  progress: Record<string, ProgressEntry>
  badges: Badge[]
  unlocks: string[]
  /** Todas las medallas que existen (para mostrar también las que faltan). */
  badgeCatalog?: { code: string; name: string; emoji: string }[]
  trouble?: Trouble[]
  lessonsCompleted: number
  totalStars: number
  totalSeconds: number
  todaySeconds: number
  streak: number
  energy: number
}

export interface Reward {
  id: string
  name: string
  emoji: string
  cost: number
  type: 'car' | 'sticker'
}

export interface CompleteResult {
  ok?: boolean
  coinsEarned: number
  totalCoins: number
  newBadges: { code: string; name: string; emoji: string }[]
  lessonsCompleted: number
  totalStars: number
  totalSeconds: number
  todaySeconds: number
  streak: number
  energy: number
}

export interface Settings {
  /** Minutos diarios sugeridos (0 = sin límite); null = todavía no se eligió en el servidor. */
  dailyMinutes: number | null
}

export interface ParentSummary {
  id: number
  name: string
  avatar: string
  coins: number
  created_at: string
  lessonsCompleted: number
  totalStars: number
  totalSeconds: number
  todaySeconds: number
  streak: number
  energy: number
  lastPlayed: string | null
  confusions?: Confusion[]
  /** Últimos 7 días (el último es hoy). */
  week?: { days: { day: string; seconds: number }[]; lessonsPlayed: number; mistakes: number }
  /** Sílabas practicadas y errores sin resolver por letra. */
  letters?: { letter: string; practiced: number; errors: number }[]
}
