import { motion } from 'framer-motion'
import { useState } from 'react'
import type { ListenTap } from '../../types'
import { listenKind } from '../../lib/session'
import { speak } from '../../lib/speech'
import { cn, normalize } from '../../lib/utils'
import { useAnswer, REVEAL_CLASS, PraiseBubble, Prompt } from './shared'

export function ListenTapActivity({ a, onDone }: { a: ListenTap; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail, reveal } = useAnswer([a.prompt, a.audio], onDone, {
    kind: listenKind(a),
    item: a.answer
  })
  // Sílabas y letras: fichas cuadradas. Palabras: fichas anchas, una debajo de otra.
  const longest = Math.max(...a.options.map((option) => option.length))
  const wordy = longest > 3
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)

  const choose = (option: string) => {
    if (locked || right) return
    if (normalize(option) === normalize(a.answer)) {
      setRight(option)
      succeed()
    } else {
      setWrong(option)
      fail(a.audio, option)
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <Prompt text={a.prompt} onSpeak={() => speak(a.audio, 0.8)} />
      <div className={cn('grid w-full gap-3', wordy ? 'max-w-md grid-cols-1' : 'max-w-lg grid-cols-3')}>
        {a.options.map((option) => (
          <motion.button
            key={option}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => choose(option)}
            className={cn(
              'card flex items-center justify-center border-4 border-white font-display transition',
              wordy ? (longest > 7 ? 'h-20 px-4 text-4xl' : 'h-20 px-4 text-5xl') : 'aspect-square text-5xl sm:text-6xl',
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
