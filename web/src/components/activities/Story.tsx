import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Story } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak, speakQueue } from '../../lib/speech'
import { cn, ENCOURAGE, normalize, pick, PRAISE } from '../../lib/utils'
import { TapText, PraiseBubble } from './shared'

export function StoryActivity({ a, onDone }: { a: Story; onDone: (perfect: boolean) => void }) {
  const [mode, setMode] = useState<'read' | 'quiz'>('read')
  const [page, setPage] = useState(0)
  const [question, setQuestion] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<string | null>(null)
  const [right, setRight] = useState<string | null>(null)
  const [praise, setPraise] = useState<string | null>(null)
  const doneRef = useRef(false)
  const currentPage = a.pages[page]
  const currentQuestion = a.questions[question]

  useEffect(() => {
    if (mode === 'quiz' && currentQuestion) {
      const timer = window.setTimeout(
        () => speakQueue([currentQuestion.q, ...currentQuestion.options]),
        450
      )
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [mode, page, question, currentPage, currentQuestion])

  const nextPage = () => {
    if (page < a.pages.length - 1) {
      setPage(page + 1)
    } else {
      setMode('quiz')
      setQuestion(0)
    }
  }

  const answer = (option: string) => {
    if (right) return
    if (normalize(option) === normalize(currentQuestion.answer)) {
      setRight(option)
      sfx.correct()
      const text = pick(PRAISE)
      setPraise(text)
      speak(text)
      window.setTimeout(() => {
        setRight(null)
        setPraise(null)
        if (question < a.questions.length - 1) {
          setQuestion(question + 1)
        } else if (!doneRef.current) {
          doneRef.current = true
          sfx.win()
          speak('¡Terminaste el cuento!')
          window.setTimeout(() => onDone(mistakes === 0), 1200)
        }
      }, 1200)
    } else {
      setWrong(option)
      setMistakes((value) => value + 1)
      sfx.wrong()
      speak(pick(ENCOURAGE))
      window.setTimeout(() => setWrong(null), 750)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5">
      {mode === 'read' ? (
        <>
          <div className="flex items-center gap-2 text-sm font-bold text-ink/50">
            {a.pages.map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  index === page ? 'bg-pika-dark' : 'bg-ink/15'
                )}
              />
            ))}
          </div>
          <div className="card flex w-full max-w-2xl flex-col items-center gap-3 border-4 border-white px-6 py-7 text-center">
            <span className="text-7xl">{currentPage.emoji}</span>
            <TapText text={currentPage.text} />
            <button
              type="button"
              onClick={() => {
                sfx.click()
                speak(currentPage.text, 0.82)
              }}
              className="btn btn-white h-11 gap-2 px-4 text-sm"
            >
              🔊 Escuchar
            </button>
          </div>
          <button type="button" onClick={nextPage} className="btn btn-primary h-16 px-8 text-lg">
            {page < a.pages.length - 1 ? 'Siguiente ➡️' : '¡Preguntas! 🧠'}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm font-bold text-ink/50">
            Pregunta {question + 1} de {a.questions.length}
          </div>
          <div className="card w-full max-w-2xl border-4 border-white px-6 py-6 text-center">
            <h2 className="font-display text-2xl sm:text-3xl">{currentQuestion.q}</h2>
          </div>
          <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
            {currentQuestion.options.map((option) => (
              <motion.button
                key={option}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => answer(option)}
                className={cn(
                  'card border-4 border-white px-4 py-5 font-display text-xl transition',
                  right === option && 'bg-mint/25 ring-4 ring-mint',
                  wrong === option && 'animate-shake bg-coral/10 ring-4 ring-coral'
                )}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </>
      )}
      <PraiseBubble text={praise} />
    </div>
  )
}
