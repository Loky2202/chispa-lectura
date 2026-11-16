import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Learn } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak, speakQueue } from '../../lib/speech'
import { cn } from '../../lib/utils'
import { useSpeakOnMount } from './shared'

/** Presentación de una letra: el niño toca cada sílaba para escucharla. No hay errores. */
export function LearnActivity({ a, onDone }: { a: Learn; onDone: (perfect: boolean) => void }) {
  const [heard, setHeard] = useState<Set<string>>(new Set())
  const allHeard = heard.size >= a.syllables.length
  const single = a.syllables.length === 1
  const hint = single ? 'Toca la letra para escucharla.' : 'Toca cada sílaba para escucharla.'
  const intro = [a.say, a.note, hint].filter((text): text is string => Boolean(text))

  useSpeakOnMount(intro, 600)

  const tap = (syllable: string) => {
    sfx.pop()
    speak(syllable, 0.72)
    setHeard((current) => new Set(current).add(syllable))
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="card flex w-full max-w-xl flex-col items-center gap-3 border-4 border-white px-6 py-6 text-center">
        <span className="rounded-full bg-pika/40 px-4 py-1 text-xs font-extrabold uppercase tracking-wide text-ink/60">
          {a.letter ? 'Letra nueva' : 'Sílabas nuevas'}
        </span>
        <div className="flex items-center justify-center gap-6">
          {a.letter && (
            <span className="font-display text-7xl leading-none text-blue-600 sm:text-8xl">
              {a.upper && a.upper !== a.letter ? `${a.upper} ${a.letter}` : a.letter}
            </span>
          )}
          {a.keyword && (
            <button
              type="button"
              onClick={() => {
                sfx.click()
                speakQueue(intro.slice(0, -1).length ? intro.slice(0, -1) : [a.keyword ?? ''])
              }}
              className="flex flex-col items-center gap-1 rounded-3xl px-3 py-2 transition active:bg-pika/30"
              aria-label="Escuchar otra vez"
            >
              <span className="text-6xl sm:text-7xl">{a.emoji}</span>
              <span className="font-display text-3xl">
                {(a.parts?.length ? a.parts : [a.keyword]).map((part, index) => (
                  <span key={`${part}-${index}`} className={part === a.focus ? 'text-rose-500' : 'text-ink'}>
                    {part}
                  </span>
                ))}
              </span>
            </button>
          )}
        </div>
        {a.note && <p className="text-sm font-bold text-ink/60">{a.note}</p>}
      </div>

      <p className="text-center text-sm font-bold text-ink/60">👆 {hint.replace('.', '')}</p>
      <div className="flex max-w-xl flex-wrap justify-center gap-3">
        {a.syllables.map((syllable) => (
          <motion.button
            key={syllable}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => tap(syllable)}
            className={cn(
              'card flex h-24 min-w-24 items-center justify-center border-4 border-white px-4 font-display text-5xl transition',
              heard.has(syllable) ? 'bg-mint/25 ring-4 ring-mint' : 'animate-glow'
            )}
          >
            {syllable}
          </motion.button>
        ))}
      </div>

      <button
        type="button"
        disabled={!allHeard}
        onClick={() => {
          sfx.correct()
          onDone(true)
        }}
        className={cn('btn btn-primary h-16 px-10 text-lg', allHeard && 'animate-pop')}
      >
        ¡Listo! ➡️
      </button>
    </div>
  )
}
