import { create } from 'zustand'
import { api } from './api'
import type {
  CompleteResult,
  Profile,
  ProgressData,
  Reward,
  World
} from '../types'

interface CompleteBody {
  profileId: number
  stars: number
  correct: number
  total: number
  seconds: number
}

interface QueuedCompletion {
  lessonId: string
  body: CompleteBody
}

interface Store {
  content: World[]
  profiles: Profile[]
  profile: Profile | null
  data: ProgressData | null
  rewards: Reward[]
  loading: boolean
  ready: boolean
  error: string | null
  init: () => Promise<void>
  selectProfile: (id: number) => Promise<void>
  createProfile: (name: string, avatar: string) => Promise<Profile>
  refresh: () => Promise<void>
  completeLesson: (
    lessonId: string,
    stars: number,
    correct: number,
    total: number,
    seconds: number
  ) => Promise<CompleteResult>
  unlock: (itemId: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

const CONTENT_KEY = 'chispa.content'
const PROFILES_KEY = 'chispa.profiles'
const PROFILE_KEY = 'chispa.profileId'
const QUEUE_KEY = 'chispa.queue'
const progressKey = (id: number) => `chispa.progress.${id}`

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* noop */
  }
}

function readQueue(): QueuedCompletion[] {
  return readJson<QueuedCompletion[]>(QUEUE_KEY) ?? []
}

function saveQueue(queue: QueuedCompletion[]) {
  writeJson(QUEUE_KEY, queue)
}

async function flushQueue() {
  const queue = readQueue()
  if (!queue.length || !navigator.onLine) return
  const pending: QueuedCompletion[] = []
  for (const item of queue) {
    try {
      await api.completeLesson(item.lessonId, item.body)
    } catch {
      pending.push(item)
    }
  }
  saveQueue(pending)
}

function energyFor(lessons: number, stars: number): number {
  return Math.min(10, 1 + Math.floor((lessons * 10 + stars * 5) / 40))
}

export const useStore = create<Store>((set, get) => ({
  content: [],
  profiles: [],
  profile: null,
  data: null,
  rewards: [],
  loading: true,
  ready: false,
  error: null,

  init: async () => {
    set({ loading: true, error: null })
    try {
      const [content, profiles, rewards] = await Promise.all([
        api.content(),
        api.profiles(),
        api.rewards()
      ])
      writeJson(CONTENT_KEY, content.worlds)
      writeJson(PROFILES_KEY, profiles)
      set({ content: content.worlds, profiles, rewards })
      const saved = Number(localStorage.getItem(PROFILE_KEY))
      if (saved && profiles.some((profile) => profile.id === saved)) {
        await get().selectProfile(saved)
      }
      void flushQueue()
    } catch {
      const cachedContent = readJson<World[]>(CONTENT_KEY)
      const cachedProfiles = readJson<Profile[]>(PROFILES_KEY)
      set({
        content: cachedContent ?? [],
        profiles: cachedProfiles ?? [],
        error: 'Sin conexión. Usando lo guardado en este dispositivo.'
      })
      const saved = Number(localStorage.getItem(PROFILE_KEY))
      if (saved && cachedProfiles?.some((profile) => profile.id === saved)) {
        await get().selectProfile(saved)
      }
    } finally {
      set({ loading: false, ready: true })
    }
  },

  selectProfile: async (id: number) => {
    const profile = get().profiles.find((item) => item.id === id) ?? null
    if (!profile) return
    set({ profile })
    localStorage.setItem(PROFILE_KEY, String(id))
    try {
      const data = await api.progress(id)
      writeJson(progressKey(id), data)
      set({ data, profile: data.profile })
    } catch {
      const cached = readJson<ProgressData>(progressKey(id))
      if (cached) set({ data: cached })
    }
  },

  createProfile: async (name: string, avatar: string) => {
    const profile = await api.createProfile(name, avatar)
    const profiles = [...get().profiles, profile]
    writeJson(PROFILES_KEY, profiles)
    set({ profiles })
    await get().selectProfile(profile.id)
    return profile
  },

  refresh: async () => {
    const profile = get().profile
    if (!profile) return
    try {
      const data = await api.progress(profile.id)
      writeJson(progressKey(profile.id), data)
      set({ data, profile: data.profile })
    } catch {
      /* keep local data */
    }
  },

  completeLesson: async (lessonId, stars, correct, total, seconds) => {
    const { profile, data } = get()
    if (!profile) throw new Error('No hay perfil activo')

    const previous = data?.progress[lessonId]
    const firstTime = !previous
    const coinsEarned = stars * 5 + (firstTime ? 5 : 0)
    const body: CompleteBody = { profileId: profile.id, stars, correct, total, seconds }

    try {
      const result = await api.completeLesson(lessonId, body)
      await get().refresh()
      return result
    } catch {
      const queue = readQueue()
      queue.push({ lessonId, body })
      saveQueue(queue)

      const current = get().data
      if (current) {
        const starsBefore = previous?.stars ?? 0
        const lessonsCompleted = current.lessonsCompleted + (firstTime ? 1 : 0)
        const totalStars = current.totalStars + Math.max(0, stars - starsBefore)
        const nextProfile = { ...current.profile, coins: current.profile.coins + coinsEarned }
        const nextData: ProgressData = {
          ...current,
          profile: nextProfile,
          progress: {
            ...current.progress,
            [lessonId]: {
              stars: Math.max(starsBefore, stars),
              bestCorrect: Math.max(previous?.bestCorrect ?? 0, correct),
              bestTotal: Math.max(previous?.bestTotal ?? 0, total),
              attempts: (previous?.attempts ?? 0) + 1,
              completedAt: new Date().toISOString()
            }
          },
          lessonsCompleted,
          totalStars,
          totalSeconds: current.totalSeconds + seconds,
          todaySeconds: current.todaySeconds + seconds,
          energy: energyFor(lessonsCompleted, totalStars)
        }
        writeJson(progressKey(profile.id), nextData)
        set({ data: nextData, profile: nextProfile })
      }

      return {
        coinsEarned,
        totalCoins: get().data?.profile.coins ?? (profile.coins + coinsEarned),
        newBadges: [],
        lessonsCompleted: get().data?.lessonsCompleted ?? 0,
        totalStars: get().data?.totalStars ?? 0,
        totalSeconds: get().data?.totalSeconds ?? 0,
        todaySeconds: get().data?.todaySeconds ?? 0,
        streak: get().data?.streak ?? 0,
        energy: get().data?.energy ?? 1
      }
    }
  },

  unlock: async (itemId: string) => {
    const profile = get().profile
    if (!profile) return { ok: false, error: 'No hay perfil activo' }
    try {
      await api.unlock(profile.id, itemId)
      await get().refresh()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudo comprar' }
    }
  },

  logout: () => {
    localStorage.removeItem(PROFILE_KEY)
    set({ profile: null, data: null })
  }
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushQueue().then(() => useStore.getState().refresh())
  })
}
