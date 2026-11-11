import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActivityView } from '../components/Activities'
import { IconButton, Modal, ProgressBar, Stars } from '../components/Chrome'
import { Pikachu } from '../components/Pikachu'
import { sfx } from '../lib/sfx'
import { speak, stopSpeaking } from '../lib/speech'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import type { CompleteResult } from '../types'

export function LessonPage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const content = useStore((state) => state.content)
  const profile = useStore((state) => state.profile)
  const completeLesson = useStore((state) => state.completeLesson)

  const world = content.find((item) => item.lessons.some((lesson) => lesson.id === lessonId))
  const lesson = world?.lessons.find((item) => item.id === lessonId)
  const lessonIndex = world && lesson ? world.lessons.indexOf(lesson) : -1

  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState<CompleteResult | null>(null)
  const [earnedStars, setEarnedStars] = useState(0)
  const [saving, setSaving] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const errorsRef = useRef(0)
  const startRef = useRef(Date.now())
  const finishedRef = useRef(false)

  useEffect(() => {
    setIndex(0)
    setFinished(false)
    setResult(null)
    setEarnedStars(0)
    setSaving(false)
    errorsRef.current = 0
    startRef.current = Date.now()
    finishedRef.current = false
  }, [lessonId])

  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  if (!lesson || !world) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
        <Pikachu size={140} mood="sad" />
        <h1 className="font-display text-2xl">No encontramos esa lección</h1>
        <button type="button" onClick={() => navigate('/mapa')} className="btn btn-primary h-14 px-6">
          Volver al mapa
        </button>
      </div>
    )
  }

  const activity = lesson.activities[index]
  const total = lesson.activities.length
  const nextLesson = lessonIndex >= 0 ? world.lessons[lessonIndex + 1] : undefined

  const finish = async (totalErrors: number) => {
    if (finishedRef.current) return
    finishedRef.current = true
    setSaving(true)
    const stars = totalErrors === 0 ? 3 : totalErrors <= 2 ? 2 : 1
    setEarnedStars(stars)
    const seconds = Math.round((Date.now() - startRef.current) / 1000)
    const correct = Math.max(0, total - totalErrors)
    try {
      const response = await completeLesson(lesson.id, stars, correct, total, seconds)
      setResult(response)
      setFinished(true)
      sfx.win()
      speak(`¡Ganaste ${stars} ${stars === 1 ? 'estrella' : 'estrellas'}!`)
    } finally {
      setSaving(false)
    }
  }

  const handleDone = (perfect: boolean) => {
    stopSpeaking()
    if (!perfect) errorsRef.current += 1
    if (index + 1 < total) {
      setIndex((current) => current + 1)
    } else {
      void finish(errorsRef.current)
    }
  }

  if (saving && !finished) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <Pikachu size={150} mood="cheer" bounce />
        <h1 className="font-display text-2xl">Guardando tus estrellas...</h1>
      </div>
    )
  }

  if (finished && result) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-5 px-5 py-8 text-center">
        <Pikachu size={170} mood="cheer" bounce />
        <h1 className="font-display text-3xl">¡Muy bien, {profile?.name}!</h1>
        <Stars value={earnedStars} size="lg" animate />
        <div className="card w-full max-w-sm border-4 border-white p-5">
          <p className="font-display text-xl">Ganaste 🪙 {result.coinsEarned} monedas</p>
          <p className="mt-1 text-sm font-bold text-ink/55">
            Ahora tienes {result.totalCoins} monedas
          </p>
          {result.newBadges.length > 0 && (
            <div className="mt-3 rounded-2xl bg-pika/25 p-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-ink/50">
                Nueva medalla
              </p>
              {result.newBadges.map((badge) => (
                <p key={badge.code} className="font-display text-lg">
                  {badge.emoji} {badge.name}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2">
          {nextLesson && (
            <button
              type="button"
              onClick={() => {
                sfx.click()
                navigate(`/leccion/${nextLesson.id}`)
              }}
              className="btn btn-primary h-16 text-lg"
            >
              Siguiente lección ➡️
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              sfx.click()
              navigate(`/mundo/${world.id}`)
            }}
            className="btn btn-white h-14 text-base"
          >
            Volver al mundo
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.click()
              navigate('/mapa')
            }}
            className="btn h-12 text-sm font-bold text-ink/45"
          >
            Ir al mapa 🗺️
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-4">
        <IconButton onClick={() => setConfirmExit(true)} label="Salir de la lección">
          ✖️
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h1 className="truncate font-display text-lg leading-tight">{lesson.title}</h1>
            <span className="shrink-0 text-xs font-extrabold text-ink/45">
              {index + 1} / {total}
            </span>
          </div>
          <ProgressBar
            value={index / total}
            className="mt-1.5 h-3 bg-white/70"
            barClassName="bg-mint"
          />
        </div>
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 sm:flex">
          <Pikachu size={34} mood="happy" />
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 pb-8 pt-3">
        <div key={`${lesson.id}-${index}`} className="animate-pop flex flex-1 flex-col">
          <ActivityView activity={activity} onDone={handleDone} />
        </div>
      </main>

      <Modal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="¿Salir de la lección?"
      >
        <p className="text-center text-sm font-bold text-ink/60">
          Si sales ahora no se guardarán las estrellas de esta lección.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setConfirmExit(false)}
            className={cn('btn btn-mint h-14 flex-1 text-base')}
          >
            Seguir jugando
          </button>
          <button
            type="button"
            onClick={() => {
              stopSpeaking()
              navigate(`/mundo/${world.id}`)
            }}
            className="btn btn-white h-14 flex-1 text-base"
          >
            Salir
          </button>
        </div>
      </Modal>
    </div>
  )
}
