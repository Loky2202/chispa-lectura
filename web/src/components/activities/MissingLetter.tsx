import { motion } from 'framer-motion'
import { useState } from 'react'
import type { MissingLetter } from '../../types'
import { cn, normalize } from '../../lib/utils'
import { useAnswer, REVEAL_CLASS, PraiseBubble } from './shared'

export function MissingLetterActivity({ a, onDone }: { a: MissingLetter; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail, reveal } = useAnswer(['¿Qué vocal falta?', a.word], onDone, {
    kind: 'vowel',
    item: a.word
  })
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)

  const choose = (option: string) => {
    if (locked || right) return
    if (normalize(option) === normalize(a.answer)) {
      setRight(option)
      succeed()
    } else {
      setWrong(option)
      fail(a.word, option)
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <span className="text-7xl">{a.emoji}</span>
      <div className="flex gap-2">
        {a.display.split('').map((letter, index) => (
          <div
            key={`${letter}-${index}`}
            className={cn(
              'flex h-20 w-16 items-center justify-center rounded-2xl border-4 font-display text-4xl',
              letter === '_'
                ? right
                  ? 'animate-pop border-mint bg-mint/20'
                  : 'border-dashed border-ink/25 bg-white/60'
                : 'border-white bg-white'
            )}
          >
            {letter === '_' ? (right ?? '') : letter}
          </div>
        ))}
      </div>
      <h2 className="font-display text-xl">¿Qué vocal falta?</h2>
      <div className="flex gap-3">
        {a.options.map((option) => (
          <motion.button
            key={option}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => choose(option)}
            className={cn(
              'card flex h-20 w-20 items-center justify-center border-4 border-white font-display text-4xl',
              right === option && 'bg-mint/25 ring-4 ring-mint',
              wrong === option && 'animate-shake bg-coral/10 ring-4 ring-coral',
              reveal && !right && wrong !== option && normalize(option) === normalize(a.answer) && REVEAL_CLASS
            )}
          >
            {option}
          </motion.button>
        ))}
      </div>
      <PraiseBubble text={praise} />
    </div>
  )
}
