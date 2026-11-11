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
  audio?: string
  options: Option[]
  answer: string
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
}

export interface SentencePicture {
  id: string
  type: 'sentence_picture'
  sentence: string
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
}
