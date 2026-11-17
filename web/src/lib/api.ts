import type {
  CompleteResult,
  Mistake,
  ParentSummary,
  Profile,
  ProgressData,
  Reward,
  Settings,
  World
} from '../types'

/** El servidor respondió con un error (a diferencia de un fallo de red, que lanza otro tipo). */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** ¿El servidor rechazó el envío de forma definitiva? Reintentarlo no sirve. */
export function isPermanent(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  )
}

// ---------- Sesión de la zona de Padres ----------
// El token lo entrega el servidor al escribir el PIN y dura lo que dure la pestaña.
const PARENT_TOKEN_KEY = 'chispa.parentToken'

function parentToken(): string {
  try {
    return sessionStorage.getItem(PARENT_TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

function setParentToken(token: string) {
  try {
    if (token) sessionStorage.setItem(PARENT_TOKEN_KEY, token)
    else sessionStorage.removeItem(PARENT_TOKEN_KEY)
  } catch {
    /* noop */
  }
}

export function parentHeaders(): Record<string, string> {
  const token = parentToken()
  return token ? { 'x-parent-token': token } : {}
}

async function failure(response: Response): Promise<ApiError> {
  let message = 'No se pudo conectar'
  try {
    const body = (await response.json()) as { error?: string }
    if (body?.error) message = body.error
  } catch {
    /* noop */
  }
  return new ApiError(message, response.status)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...parentHeaders(), ...init?.headers }
  })
  if (!response.ok) throw await failure(response)
  return (await response.json()) as T
}

/** Identificador de un envío: el servidor lo usa para no guardar dos veces lo mismo. */
export function newRequestId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
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
    body: {
      profileId: number
      stars: number
      correct: number
      total: number
      seconds: number
      mistakes?: Mistake[]
      requestId?: string
    }
  ) =>
    request<CompleteResult>(`/api/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  completeReview: (body: {
    profileId: number
    seconds: number
    mistakes: Mistake[]
    solved: Mistake[]
    requestId?: string
  }) =>
    request<CompleteResult>('/api/review/complete', {
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
  settings: () => request<Settings>('/api/settings'),
  saveSettings: (dailyMinutes: number) =>
    request<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify({ dailyMinutes }) }),
  audioManifest: () => request<{ id: string; text: string }[]>('/api/audio-manifest'),
  parentStatus: () => request<{ hasPin: boolean; authed: boolean }>('/api/parents/status'),
  parentLogin: async (pin: string) => {
    const result = await request<{ token: string }>('/api/parents/login', {
      method: 'POST',
      body: JSON.stringify({ pin })
    })
    setParentToken(result.token)
  },
  parentSetPin: async (pin: string) => {
    const result = await request<{ token: string }>('/api/parents/pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    })
    setParentToken(result.token)
  },
  parentLogout: () => setParentToken(''),
  /** Descarga la copia de seguridad (necesita la sesión de Padres, por eso no es un enlace). */
  downloadBackup: async () => {
    const response = await fetch('/api/backup', { headers: parentHeaders() })
    if (!response.ok) throw await failure(response)
    const blob = await response.blob()
    const name = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1]
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name ?? 'chispa.db'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
}
