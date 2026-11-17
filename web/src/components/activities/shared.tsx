// Piezas que comparten las actividades: voz al entrar, manejo de aciertos y errores, y componentes base.
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Mistake } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak, speakQueue } from '../../lib/speech'
import { cn, ENCOURAGE, normalize, pick, PRAISE } from '../../lib/utils'

export function useSpeakOnMount(texts: string[], delay = 500) {
  const key = texts.join('||')
  useEffect(() => {
    const timer = window.setTimeout(() => speakQueue(texts), delay)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay])
}

/** La lección se suscribe aquí para saber qué falló el niño (y qué eligió). */
export const mistakeSink: { current: ((mistake: Mistake) => void) | null } = { current: null }

export const PAUSE_AFTER_ERROR = 1100

export function useAnswer(
  texts: string[],
  onDone: (perfect: boolean) => void,
  track?: Pick<Mistake, 'kind' | 'item'>
) {
  const [done, setDone] = useState(false)
  const [paused, setPaused] = useState(false)
  const [praise, setPraise] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const mistakesRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const pauseRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useSpeakOnMount(texts)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (pauseRef.current) window.clearTimeout(pauseRef.current)
    }
  }, [])

  // `before`: algo que se dice antes del elogio (la palabra recién armada).
  const succeed = (message?: string, before?: string) => {
    if (done || !mountedRef.current) return
    setDone(true)
    const text = message ?? pick(PRAISE)
    setPraise(text)
    sfx.correct()
    speakQueue(before ? [before, text] : [text])
    timerRef.current = window.setTimeout(
      () => {
        if (mountedRef.current) onDone(mistakesRef.current === 0)
      },
      before ? 2300 : 1300
    )
  }

  // `again`: lo que se repite después del ánimo (el sonido que había que encontrar).
  // `chosen`: lo que tocó, para saber qué confunde con qué.
  const fail = (again?: string, chosen?: string) => {
    if (done || !mountedRef.current) return
    mistakesRef.current += 1
    setMistakes(mistakesRef.current)
    if (track) mistakeSink.current?.({ ...track, chosen: chosen ?? '' })
    sfx.wrong()
    speakQueue(again ? [pick(ENCOURAGE), again] : [pick(ENCOURAGE)])
    // Pausa corta sin castigo: evita avanzar tocando al azar y da tiempo de escuchar.
    setPaused(true)
    if (pauseRef.current) window.clearTimeout(pauseRef.current)
    pauseRef.current = window.setTimeout(() => {
      if (mountedRef.current) setPaused(false)
    }, PAUSE_AFTER_ERROR)
  }

  // Al segundo error la respuesta correcta brilla: el niño siempre termina con éxito.
  return { locked: done || paused, praise, succeed, fail, reveal: mistakes >= REVEAL_AFTER }
}

export const REVEAL_AFTER = 2
export const REVEAL_CLASS = 'animate-glow ring-4 ring-pika-dark'
export const SYLLABLE_COLORS = ['text-blue-600', 'text-rose-500']

/** Palabra con las sílabas en dos colores: ayuda a ver dónde se parte. */
export function SyllableWord({ parts, className }: { parts: string[]; className?: string }) {
  return (
    <span className={cn('font-display', className)}>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className={SYLLABLE_COLORS[index % 2]}>
          {part}
        </span>
      ))}
    </span>
  )
}

/** Texto en el que cada palabra se puede tocar para escucharla. */
export function TapText({ text, className, active }: { text: string; className?: string; active?: number }) {
  return (
    <p className={cn('font-display text-3xl leading-snug sm:text-4xl', className)}>
      {text.split(' ').map((word, index) => (
        <button
          key={`${word}-${index}`}
          type="button"
          onClick={() => {
            sfx.click()
            speak(word.replace(/[.,!?¡¿]/g, ''), 0.78)
          }}
          className={cn(
            'mr-1 rounded-lg px-1 transition hover:bg-pika/30 active:bg-pika/50',
            active === index && 'bg-pika/60'
          )}
        >
          {word}
        </button>
      ))}
    </p>
  )
}

export function PraiseBubble({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="rounded-[2rem] bg-white px-8 py-5 font-display text-3xl text-ink shadow-2xl"
            initial={{ scale: 0.6, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            {text} 🎉
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Prompt({ text, onSpeak }: { text: string; onSpeak?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h2 className="max-w-xl font-display text-2xl leading-snug sm:text-3xl">{text}</h2>
      {onSpeak && (
        <button
          type="button"
          onClick={() => {
            sfx.click()
            onSpeak()
          }}
          className="btn btn-white h-12 gap-2 px-5 text-sm"
          aria-label="Escuchar otra vez"
        >
          🔊 Escuchar
        </button>
      )}
    </div>
  )
}

export function PictureChoices({
  options,
  answer,
  disabled,
  onCorrect,
  onWrong,
  showLabels = true,
  reveal = false
}: {
  options: { emoji: string; label: string }[]
  answer: string
  disabled: boolean
  onCorrect: () => void
  onWrong: (label: string) => void
  showLabels?: boolean
  reveal?: boolean
}) {
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)

  const choose = (label: string) => {
    if (disabled || right) return
    if (normalize(label) === normalize(answer)) {
      setRight(label)
      onCorrect()
    } else {
      setWrong(label)
      onWrong(label)
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((option) => (
        <motion.button
          key={option.label}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => choose(option.label)}
          aria-label={option.label}
          className={cn(
            'card flex flex-col items-center gap-1 border-4 border-white p-3 pt-4 transition',
            right === option.label && 'bg-mint/20 ring-4 ring-mint',
            wrong === option.label && 'animate-shake bg-coral/10 ring-4 ring-coral',
            reveal && !right && wrong !== option.label && normalize(option.label) === normalize(answer) && REVEAL_CLASS
          )}
        >
          <span className="text-5xl sm:text-6xl">{option.emoji}</span>
          {showLabels && <span className="text-sm font-bold text-ink/70">{option.label}</span>}
        </motion.button>
      ))}
    </div>
  )
}
