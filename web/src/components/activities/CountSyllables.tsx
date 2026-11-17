import { motion } from 'framer-motion'
import { useState } from 'react'
import type { CountSyllables } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak } from '../../lib/speech'
import { cn } from '../../lib/utils'
import { useAnswer, REVEAL_CLASS, PraiseBubble } from './shared'

export function CountSyllablesActivity({ a, onDone }: { a: CountSyllables; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail, reveal } = useAnswer(
    [a.word, '¿Cuántas sílabas tiene?'],
    onDone
  )
  const [wrong, setWrong] = useState<number | null>(null)
  const [right, setRight] = useState<number | null>(null)

  const choose = (option: number) => {
    if (locked || right !== null) return
    if (option === a.answer) {
      setRight(option)
      succeed()
    } else {
      setWrong(option)
      fail()
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-7xl">{a.emoji}</span>
        <span className="font-display text-3xl">{a.word}</span>
        <button
          type="button"
          onClick={() => {
            sfx.click()
            speak(a.word, 0.78)
          }}
          className="btn btn-white h-11 gap-2 px-4 text-sm"
        >
          🔊 Escuchar
        </button>
      </div>
      <h2 className="text-center font-display text-xl">¿Cuántas sílabas tiene?</h2>
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
              reveal && right === null && wrong !== option && option === a.answer && REVEAL_CLASS
            )}
          >
            {option}
          </motion.button>
        ))}
      </div>
      {right !== null && (
        <div className="animate-pop flex gap-2 text-3xl">
          {Array.from({ length: a.answer }).map((_, index) => (
            <span key={index}>👏</span>
          ))}
        </div>
      )}
      <PraiseBubble text={praise} />
    </div>
  )
}
