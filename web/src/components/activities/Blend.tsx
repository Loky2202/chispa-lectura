import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Blend } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak } from '../../lib/speech'
import { cn, pick, PRAISE } from '../../lib/utils'
import { useSpeakOnMount, SYLLABLE_COLORS, PraiseBubble } from './shared'

/** Unir sílabas: toca cada sílaba en orden y se juntan en la palabra. No hay errores. */
export function BlendActivity({ a, onDone }: { a: Blend; onDone: (perfect: boolean) => void }) {
  const [count, setCount] = useState(0)
  const [joined, setJoined] = useState(false)
  const [praise, setPraise] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  useSpeakOnMount(['Toca las sílabas y júntalas.'])

  useEffect(() => {
    return () => timers.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const tap = (index: number) => {
    if (joined) return
    sfx.pop()
    speak(a.parts[index], 0.72)
    if (index !== count) return
    const next = count + 1
    setCount(next)
    if (next === a.parts.length) {
      timers.current.push(
        window.setTimeout(() => {
          setJoined(true)
          sfx.correct()
          speak(a.word, 0.8)
        }, 800)
      )
      timers.current.push(
        window.setTimeout(() => {
          const text = pick(PRAISE)
          setPraise(text)
          speak(text)
        }, 2300)
      )
      timers.current.push(window.setTimeout(() => onDone(true), 3600))
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <h2 className="text-center font-display text-2xl">Une las sílabas</h2>
      <div className="flex h-24 items-center justify-center">
        {joined && a.emoji ? (
          <span className="animate-pop text-8xl">{a.emoji}</span>
        ) : (
          <span className="text-6xl opacity-30">{a.emoji ? '❓' : '🔤'}</span>
        )}
      </div>
      <motion.div layout className={cn('flex flex-wrap items-center justify-center', joined ? 'gap-0' : 'gap-3')}>
        {a.parts.map((part, index) => (
          <motion.button
            layout
            key={`${part}-${index}`}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => tap(index)}
            className={cn(
              'flex h-24 items-center justify-center font-display text-6xl transition',
              SYLLABLE_COLORS[index % 2],
              joined
                ? 'px-0'
                : cn(
                    'card min-w-24 border-4 border-white px-5',
                    index < count && 'bg-mint/25 ring-4 ring-mint',
                    index === count && 'animate-glow'
                  )
            )}
          >
            {part}
          </motion.button>
        ))}
      </motion.div>
      <p className="text-center text-sm font-bold text-ink/60">
        {joined ? '¡Así se lee!' : '👆 Toca cada sílaba, en orden'}
      </p>
      <PraiseBubble text={praise} />
    </div>
  )
}
