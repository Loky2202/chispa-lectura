import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { BuildWord } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak } from '../../lib/speech'
import { cn, normalize, shuffle } from '../../lib/utils'
import { useAnswer, REVEAL_CLASS, SYLLABLE_COLORS, PraiseBubble } from './shared'

export function BuildWordActivity({ a, onDone }: { a: BuildWord; onDone: (perfect: boolean) => void }) {
  // Mientras aprende sílabas, la palabra se arma con fichas de sílaba (más una que sobra).
  const bySyllable = Boolean(a.parts?.length)
  const { locked, praise, succeed, fail, reveal } = useAnswer(
    bySyllable ? ['Arma la palabra.', a.word] : [a.word],
    onDone
  )
  const expected = useMemo(() => (a.parts?.length ? a.parts : a.word.split('')), [a.parts, a.word])
  const tiles = useMemo(
    () =>
      shuffle(
        [...expected, ...(a.parts?.length ? (a.extra ?? []) : [])].map((text, index) => ({ text, index }))
      ),
    [expected, a.parts, a.extra]
  )
  const [placed, setPlaced] = useState<number[]>([])
  const [wrongTile, setWrongTile] = useState<number | null>(null)
  // Tras dos errores brilla la ficha que sigue.
  const nextTile = reveal
    ? tiles.find(
        (tile) =>
          !placed.includes(tile.index) &&
          normalize(tile.text) === normalize(expected[placed.length] ?? '')
      )?.index
    : undefined

  const tap = (tile: { text: string; index: number }) => {
    if (locked || placed.includes(tile.index)) return
    if (normalize(tile.text) === normalize(expected[placed.length])) {
      const next = [...placed, tile.index]
      setPlaced(next)
      sfx.pop()
      if (next.length === expected.length) succeed(undefined, a.word)
      else if (bySyllable) speak(expected[placed.length], 0.75)
    } else {
      setWrongTile(tile.index)
      fail()
      window.setTimeout(() => setWrongTile(null), 650)
    }
  }

  const box = bySyllable ? 'h-20 min-w-20 px-3 text-4xl' : 'h-16 w-14 text-3xl'

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <span className="text-7xl">{a.emoji}</span>
      <button
        type="button"
        onClick={() => {
          sfx.click()
          speak(a.word, 0.78)
        }}
        className="btn btn-white h-11 gap-2 px-4 text-sm"
      >
        🔊 Escuchar la palabra
      </button>

      <div className="flex flex-wrap justify-center gap-2">
        {expected.map((text, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center justify-center rounded-2xl border-4 font-display',
              box,
              index < placed.length
                ? cn('border-mint bg-mint/20', bySyllable && SYLLABLE_COLORS[index % 2])
                : 'border-dashed border-ink/25 bg-white/60'
            )}
          >
            {index < placed.length ? text : ''}
          </div>
        ))}
      </div>

      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {tiles.map((tile) => {
          const used = placed.includes(tile.index)
          return (
            <motion.button
              key={tile.index}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => tap(tile)}
              disabled={used}
              className={cn(
                'card flex items-center justify-center border-4 border-white font-display transition',
                box,
                used && 'opacity-25',
                nextTile === tile.index && wrongTile !== tile.index && REVEAL_CLASS,
                wrongTile === tile.index && 'animate-shake bg-coral/15 ring-4 ring-coral'
              )}
            >
              {tile.text}
            </motion.button>
          )
        })}
      </div>
      <PraiseBubble text={praise} />
    </div>
  )
}
