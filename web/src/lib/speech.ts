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

export function speak(text: string, rate = 0.88) {
  if (!supported() || !enabled || !text.trim()) return
  queueToken += 1
  window.speechSynthesis.cancel()
  const utterance = makeUtterance(text, rate)
  window.speechSynthesis.speak(utterance)
}

export function speakQueue(texts: string[], rate = 0.88) {
  if (!supported() || !enabled) return
  queueToken += 1
  const token = queueToken
  window.speechSynthesis.cancel()
  let index = 0

  const next = () => {
    if (token !== queueToken || index >= texts.length) return
    const text = texts[index]
    index += 1
    if (!text?.trim()) {
      next()
      return
    }
    const utterance = makeUtterance(text, rate)
    utterance.onend = () => window.setTimeout(next, 160)
    utterance.onerror = () => window.setTimeout(next, 160)
    window.speechSynthesis.speak(utterance)
  }

  next()
}

export function stopSpeaking() {
  if (!supported()) return
  queueToken += 1
  window.speechSynthesis.cancel()
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
