import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Memory } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak } from '../../lib/speech'
import { cn, pick, PRAISE, shuffle } from '../../lib/utils'
import { useSpeakOnMount, PraiseBubble } from './shared'

export function MemoryActivity({ a, onDone }: { a: Memory; onDone: (perfect: boolean) => void }) {
  // Con `pairs` se juntan dos cartas distintas (M con m); sin él, dos cartas iguales.
  const cards = useMemo(
    () =>
      shuffle(
        a.pairs?.length
          ? a.pairs.flatMap((pair, index) => pair.map((item) => ({ item, pair: index })))
          : a.items.flatMap((item, index) => [
              { item, pair: index },
              { item, pair: index }
            ])
      ).map((card, index) => ({ ...card, id: index })),
    [a.items, a.pairs]
  )
  const instruction = a.pairs?.length ? 'Junta la mayúscula con su minúscula.' : 'Encuentra las parejas iguales'
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [praise, setPraise] = useState<string | null>(null)
  const mistakesRef = useRef(0)
  const finishedRef = useRef(false)

  useSpeakOnMount([instruction])

  useEffect(() => {
    if (cards.length > 0 && matched.size === cards.length && !finishedRef.current) {
      finishedRef.current = true
      sfx.win()
      const text = pick(PRAISE)
      setPraise(text)
      speak(text)
      window.setTimeout(() => onDone(mistakesRef.current === 0), 1200)
    }
  }, [matched, cards.length, onDone])

  const tap = (id: number) => {
    if (busy || flipped.includes(id) || matched.has(id)) return
    const next = [...flipped, id]
    setFlipped(next)
    sfx.pop()
    if (next.length < 2) return

    const [first, second] = next
    const firstCard = cards.find((card) => card.id === first)
    const secondCard = cards.find((card) => card.id === second)
    setBusy(true)

    if (firstCard && secondCard && firstCard.pair === secondCard.pair) {
      window.setTimeout(() => {
        setMatched((current) => {
          const copy = new Set(current)
          copy.add(first)
          copy.add(second)
          return copy
        })
        setFlipped([])
        setBusy(false)
        sfx.correct()
      }, 420)
    } else {
      mistakesRef.current += 1
      window.setTimeout(() => {
        setFlipped([])
        setBusy(false)
        sfx.wrong()
      }, 900)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5">
      <h2 className="text-center font-display text-2xl">
        {a.pairs?.length ? 'Junta la mayúscula con su minúscula' : 'Encuentra las parejas'}
      </h2>
      <div className="grid w-full max-w-lg grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card) => {
          const open = flipped.includes(card.id) || matched.has(card.id)
          return (
            <motion.button
              key={card.id}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => tap(card.id)}
              className={cn(
                'flex aspect-square items-center justify-center rounded-2xl border-4 text-3xl font-display transition sm:text-4xl',
                open
                  ? 'border-white bg-white shadow-[0_6px_0_rgba(45,49,66,0.08)]'
                  : 'border-pika-dark/40 bg-gradient-to-br from-pika to-pika-dark text-white/80'
              )}
            >
              {open ? card.item : '⚡'}
            </motion.button>
          )
        })}
      </div>
      <PraiseBubble text={praise} />
    </div>
  )
}
