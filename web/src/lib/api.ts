import type {
  CompleteResult,
  ParentSummary,
  Profile,
  ProgressData,
  Reward,
  World
} from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
  if (!response.ok) {
    let message = 'No se pudo conectar'
    try {
      const body = (await response.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      /* noop */
    }
    throw new Error(message)
  }
  return (await response.json()) as T
}

export const api = {
  content: () => request<{ worlds: World[] }>('/api/content'),
  profiles: () => request<Profile[]>('/api/profiles'),
  createProfile: (name: string, avatar: string) =>
    request<Profile>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, avatar })
    }),
  progress: (profileId: number) => request<ProgressData>(`/api/progress/${profileId}`),
  completeLesson: (
    lessonId: string,
    body: { profileId: number; stars: number; correct: number; total: number; seconds: number }
  ) =>
    request<CompleteResult>(`/api/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  rewards: () => request<Reward[]>('/api/rewards'),
  unlock: (profileId: number, itemId: string) =>
    request<{ ok: boolean; coins: number; item: Reward }>('/api/rewards/unlock', {
      method: 'POST',
      body: JSON.stringify({ profileId, itemId })
    }),
  parents: () => request<ParentSummary[]>('/api/parents/summary'),
  resetProgress: (profileId: number) =>
    request<{ ok: boolean }>(`/api/profiles/${profileId}/progress`, { method: 'DELETE' }),
  backupUrl: '/api/backup'
}
