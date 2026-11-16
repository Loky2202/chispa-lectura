let voices: SpeechSynthesisVoice[] = []
let queueToken = 0
let enabled = true

function supported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function refreshVoices() {
  if (!supported()) return
  voices = window.speechSynthesis.getVoices()
}

if (supported()) {
  refreshVoices()
  window.speechSynthesis.onvoiceschanged = refreshVoices
}

function chooseVoice(): SpeechSynthesisVoice | undefined {
  if (!voices.length) refreshVoices()
  return (
    voices.find((voice) => /es[-_]MX/i.test(voice.lang)) ||
    voices.find((voice) => /es[-_]419/i.test(voice.lang)) ||
    voices.find((voice) => /es[-_]US/i.test(voice.lang)) ||
    voices.find((voice) => /^es/i.test(voice.lang)) ||
    voices.find((voice) => /spanish|español/i.test(voice.name))
  )
}

export function setSpeechEnabled(value: boolean) {
  enabled = value
  if (!value) stopSpeaking()
}

export function isSpeechEnabled(): boolean {
  return enabled
}

export function makeUtterance(text: string, rate = 0.88): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = chooseVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  } else {
    utterance.lang = 'es-MX'
  }
  utterance.rate = rate
  utterance.pitch = 1.12
  utterance.volume = 1
  return utterance
}

// ---------- Voces grabadas por la familia ----------
// Si existe una grabación para el texto, se usa en lugar de la voz del navegador.
const recorded = new Map<string, string>()
let currentAudio: HTMLAudioElement | null = null

/** Clave de una grabación: el texto en minúsculas y sin signos. */
export function audioKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[¿?¡!.,;:"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function loadRecordedAudio(): Promise<void> {
  try {
    const response = await fetch('/api/audio')
    if (!response.ok) return
    const rows = (await response.json()) as { key: string; updatedAt: string }[]
    recorded.clear()
    rows.forEach((row) => recorded.set(row.key, row.updatedAt))
  } catch {
    /* sin conexión: se usa la voz del navegador */
  }
}

export function hasRecording(text: string): boolean {
  return recorded.has(audioKey(text))
}

export function recordingUrl(text: string): string | null {
  const key = audioKey(text)
  const version = recorded.get(key)
  return version ? `/api/audio/${encodeURIComponent(key)}?v=${encodeURIComponent(version)}` : null
}

function stopAudio() {
  if (currentAudio) {
    currentAudio.onended = null
    currentAudio.onerror = null
    currentAudio.pause()
    currentAudio = null
  }
}

/** Dice un texto (grabación si existe; si no, voz del navegador) y avisa al terminar. */
function sayOne(text: string, rate: number, done: () => void) {
  const url = recordingUrl(text)
  const viaTts = () => {
    if (!supported()) {
      done()
      return
    }
    const utterance = makeUtterance(text, rate)
    utterance.onend = done
    utterance.onerror = done
    window.speechSynthesis.speak(utterance)
  }
  if (!url) {
    viaTts()
    return
  }
  const audio = new Audio(url)
  currentAudio = audio
  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null
    done()
  }
  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null
    viaTts()
  }
  audio.play().catch(() => {
    if (currentAudio === audio) currentAudio = null
    viaTts()
  })
}

export function speak(text: string, rate = 0.88) {
  if (!enabled || !text.trim()) return
  stopSpeaking()
  sayOne(text, rate, () => undefined)
}

/** Dice varios textos seguidos. `onItem` avisa cuál empieza (y -1 al terminar). */
export function speakQueue(texts: string[], rate = 0.88, onItem?: (index: number) => void) {
  if (!enabled) return
  stopSpeaking()
  const token = queueToken
  let index = 0

  const next = () => {
    if (token !== queueToken) return
    if (index >= texts.length) {
      onItem?.(-1)
      return
    }
    const current = index
    const text = texts[index]
    index += 1
    if (!text?.trim()) {
      next()
      return
    }
    onItem?.(current)
    sayOne(text, rate, () => window.setTimeout(next, 160))
  }

  next()
}

export function stopSpeaking() {
  queueToken += 1
  stopAudio()
  if (supported()) window.speechSynthesis.cancel()
}

export function speechAvailable(): boolean {
  return supported()
}

export function speechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false
  const candidate = window as unknown as {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
  return Boolean(candidate.SpeechRecognition || candidate.webkitSpeechRecognition)
}

export interface RecognitionHandle {
  stop: () => void
}

interface RecognitionAlternative {
  transcript: string
}

interface RecognitionResult {
  length: number
  [index: number]: RecognitionAlternative
}

interface RecognitionEvent {
  results: {
    length: number
    [index: number]: RecognitionResult
  }
}

interface RecognitionErrorEvent {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export function listenOnce(
  onResult: (transcript: string) => void,
  onError: (error: string) => void,
  onEnd?: () => void
): RecognitionHandle | null {
  if (typeof window === 'undefined') return null
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  const Ctor = candidate.SpeechRecognition || candidate.webkitSpeechRecognition
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = 'es-MX'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 3

  recognition.onresult = (event: RecognitionEvent) => {
    const first = event.results[0]
    const alternatives: string[] = []
    if (first) {
      for (let index = 0; index < first.length; index += 1) {
        alternatives.push(first[index]?.transcript ?? '')
      }
    }
    onResult(alternatives.join(' '))
  }
  recognition.onerror = (event: RecognitionErrorEvent) => {
    onError(event.error || 'error')
  }
  recognition.onend = () => {
    onEnd?.()
  }

  try {
    recognition.start()
  } catch {
    onError('start-failed')
    return null
  }

  return {
    stop: () => {
      try {
        recognition.stop()
      } catch {
        /* noop */
      }
    }
  }
}
