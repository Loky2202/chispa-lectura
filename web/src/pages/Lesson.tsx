import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActivityView, mistakeSink } from '../components/Activities'
import { Chispa } from '../components/Chispa'
import { IconButton, Modal, ProgressBar, Stars } from '../components/Chrome'
import {
  buildReview,
  clearResume,
  createActiveClock,
  reachedDailyLimit,
  readResume,
  saveResume,
  type ReviewItem
} from '../lib/session'
import { sfx } from '../lib/sfx'
import { speak, stopSpeaking } from '../lib/speech'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import type { Activity, CompleteResult, Mistake } from '../types'

// Lo que se falla vuelve una vez al final de la lección; si ahí sale bien, ya no cuenta como error.
const RETRY_TYPES = new Set<Activity['type']>([
  'listen_tap',
  'word_picture',
  'sentence_picture',
  'missing_letter',
  'count_syllables',
  'odd_one_out'
])
const MAX_RETRIES = 4
const RETRY_SUFFIX = '-r'

const baseId = (id: string) => (id.endsWith(RETRY_SUFFIX) ? id.slice(0, -RETRY_SUFFIX.length) : id)

export function LessonPage({ review = false }: { review?: boolean }) {
  const params = useParams()
  const lessonId = review ? 'repaso' : params.lessonId
  const navigate = useNavigate()
  const content = useStore((state) => state.content)
  const profile = useStore((state) => state.profile)
  const completeLesson = useStore((state) => state.completeLesson)
  const completeReview = useStore((state) => state.completeReview)

  // El repaso se arma una sola vez al entrar, con lo que todavía le cuesta.
  const [reviewItems] = useState<ReviewItem[]>(() =>
    review ? buildReview(useStore.getState().content, useStore.getState().data?.trouble ?? []) : []
  )

  const world = review
    ? undefined
    : content.find((item) => item.lessons.some((lesson) => lesson.id === lessonId))
  const found = world?.lessons.find((item) => item.id === lessonId)
  const lesson = review
    ? { id: 'repaso', title: 'Repaso de hoy', activities: reviewItems.map((item) => item.activity) }
    : found
  const lessonIndex = world && found ? world.lessons.indexOf(found) : -1
  const baseActivities = lesson?.activities ?? []
  const baseTotal = baseActivities.length

  const [queue, setQueue] = useState<Activity[]>(baseActivities)
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState<CompleteResult | null>(null)
  const [earnedStars, setEarnedStars] = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [fixedCount, setFixedCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const failedRef = useRef<Set<string>>(new Set())
  const everFailedRef = useRef<Set<string>>(new Set())
  const retriesRef = useRef<string[]>([])
  const fixedRef = useRef(0)
  const mistakesRef = useRef<Mistake[]>([])
  const [clock] = useState(createActiveClock)
  const finishedRef = useRef(false)

  useEffect(() => {
    const activities = lesson?.activities ?? []
    const saved = !review && profile && lessonId ? readResume(profile.id, lessonId) : null
    const retries = saved
      ? saved.retries
          .map((id) => activities.find((activity) => activity.id === id))
          .filter((activity): activity is Activity => Boolean(activity))
          .map((activity) => ({ ...activity, id: activity.id + RETRY_SUFFIX }))
      : []
    const restored = saved && saved.index < activities.length + retries.length ? saved : null

    setQueue(restored ? [...activities, ...retries] : activities)
    setIndex(restored?.index ?? 0)
    setFinished(false)
    setResult(null)
    setEarnedStars(0)
    setNewRecord(false)
    setFixedCount(0)
    setSaving(false)
    failedRef.current = new Set(restored?.failed ?? [])
    everFailedRef.current = new Set(restored?.failed ?? [])
    retriesRef.current = restored ? [...restored.retries] : []
    fixedRef.current = restored?.fixed ?? 0
    mistakesRef.current = restored ? [...restored.mistakes] : []
    clock.reset(restored?.elapsed ?? 0)
    finishedRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  useEffect(() => {
    mistakeSink.current = (mistake) => {
      if (mistakesRef.current.length < 40) mistakesRef.current.push(mistake)
    }
    clock.start()
    return () => {
      mistakeSink.current = null
      clock.stop()
      stopSpeaking()
    }
  }, [clock])

  if (!lesson || (!review && !world) || baseTotal === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
        <Chispa size={140} mood={review ? 'happy' : 'sad'} />
        <h1 className="font-display text-2xl">
          {review ? '¡No hay nada que repasar hoy!' : 'No encontramos esa lección'}
        </h1>
        <button type="button" onClick={() => navigate('/mapa')} className="btn btn-primary h-14 px-6">
          Volver al mapa
        </button>
      </div>
    )
  }

  const activity = queue[index] ?? queue[queue.length - 1]
  const total = queue.length
  const isRetry = Boolean(activity?.id.endsWith(RETRY_SUFFIX))
  const nextLesson = world && lessonIndex >= 0 ? world.lessons[lessonIndex + 1] : undefined
  const backTo = review || !world ? '/mapa' : `/mundo/${world.id}`
  const elapsed = () => clock.seconds()

  const finish = async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    setSaving(true)
    const errors = failedRef.current.size
    const stars = errors === 0 ? 3 : errors <= 2 ? 2 : 1
    const seconds = elapsed()
    const previous = useStore.getState().data?.progress[lesson.id]?.stars ?? 0
    setEarnedStars(stars)
    setFixedCount(fixedRef.current)
    setNewRecord(!review && previous > 0 && stars > previous)
    if (profile) clearResume(profile.id)
    try {
      const response = review
        ? await completeReview(
            seconds,
            mistakesRef.current,
            reviewItems
              .filter((item) => !everFailedRef.current.has(item.activity.id))
              .map((item) => ({ kind: item.kind, item: item.item, chosen: '' }))
          )
        : await completeLesson(
            lesson.id,
            stars,
            Math.max(0, baseTotal - errors),
            baseTotal,
            seconds,
            mistakesRef.current
          )
      setResult(response)
      setFinished(true)
      sfx.win()
      const rest = reachedDailyLimit(response.todaySeconds)
      const cheer = review
        ? '¡Terminaste el repaso!'
        : `¡Ganaste ${stars} ${stars === 1 ? 'estrella' : 'estrellas'}!`
      speak(rest ? `${cheer} Hoy leíste mucho. Nos vemos mañana.` : cheer)
    } finally {
      setSaving(false)
    }
  }

  const handleDone = (perfect: boolean) => {
    stopSpeaking()
    const id = baseId(activity.id)
    let nextQueue = queue
    if (!perfect && !isRetry) {
      failedRef.current.add(id)
      everFailedRef.current.add(id)
      if (RETRY_TYPES.has(activity.type) && retriesRef.current.length < MAX_RETRIES) {
        retriesRef.current.push(id)
        nextQueue = [...queue, { ...activity, id: id + RETRY_SUFFIX }]
        setQueue(nextQueue)
      }
    } else if (perfect && isRetry && failedRef.current.delete(id)) {
      fixedRef.current += 1
    }

    if (index + 1 < nextQueue.length) {
      setIndex(index + 1)
      if (!review && profile) {
        saveResume(profile.id, {
          lessonId: lesson.id,
          index: index + 1,
          failed: [...failedRef.current],
          retries: [...retriesRef.current],
          fixed: fixedRef.current,
          mistakes: mistakesRef.current,
          elapsed: elapsed(),
          savedAt: Date.now()
        })
      }
    } else {
      void finish()
    }
  }

  if (saving && !finished) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <Chispa size={150} mood="cheer" bounce />
        <h1 className="font-display text-2xl">Guardando tus estrellas...</h1>
      </div>
    )
  }

  if (finished && result) {
    const rest = reachedDailyLimit(result.todaySeconds)
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-5 px-5 py-8 text-center">
        <Chispa size={170} mood="cheer" bounce />
        <h1 className="font-display text-3xl">
          {review ? `¡Repaso terminado, ${profile?.name}!` : `¡Muy bien, ${profile?.name}!`}
        </h1>
        {!review && <Stars value={earnedStars} size="lg" animate />}
        <div className="card w-full max-w-sm border-4 border-white p-5">
          {newRecord && <p className="font-display text-xl text-pika-dark">🏆 ¡Nueva marca!</p>}
          {fixedCount > 0 && (
            <p className="font-display text-lg">
              💪 Arreglaste {fixedCount} {fixedCount === 1 ? 'que te costaba' : 'que te costaban'}
            </p>
          )}
          <p className="font-display text-xl">Ganaste 🪙 {result.coinsEarned} monedas</p>
          <p className="mt-1 text-sm font-bold text-ink/55">Ahora tienes {result.totalCoins} monedas</p>
          {result.newBadges.length > 0 && (
            <div className="mt-3 rounded-2xl bg-pika/25 p-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-ink/50">Nueva medalla</p>
              {result.newBadges.map((badge) => (
                <p key={badge.code} className="font-display text-lg">
                  {badge.emoji} {badge.name}
                </p>
              ))}
            </div>
          )}
        </div>

        {rest && (
          <div className="card w-full max-w-sm border-4 border-white bg-sky/20 p-4">
            <p className="font-display text-xl">😴 ¡Hoy leíste mucho!</p>
            <p className="mt-1 text-sm font-bold text-ink/60">Chispa va a descansar. Nos vemos mañana.</p>
          </div>
        )}

        <div className="flex w-full max-w-sm flex-col gap-2">
          {nextLesson && !rest && (
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
              navigate(rest ? '/mapa' : backTo)
            }}
            className={cn('btn text-base', rest ? 'btn-primary h-16 text-lg' : 'btn-white h-14')}
          >
            {rest || review ? 'Volver al mapa 🗺️' : 'Volver al mundo'}
          </button>
          {nextLesson && rest && (
            <button
              type="button"
              onClick={() => {
                sfx.click()
                navigate(`/leccion/${nextLesson.id}`)
              }}
              className="btn h-12 text-sm font-bold text-ink/45"
            >
              Seguir un poco más
            </button>
          )}
          {!rest && !review && (
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
          )}
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
            <span className="flex shrink-0 items-center gap-2 text-xs font-extrabold text-ink/45">
              {isRetry && <span className="rounded-full bg-pika px-2 py-0.5 text-ink">🔁 Otra oportunidad</span>}
              {index + 1} / {total}
            </span>
          </div>
          <ProgressBar value={index / total} className="mt-1.5 h-3 bg-white/70" barClassName="bg-mint" />
        </div>
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 sm:flex">
          <Chispa size={34} mood="happy" />
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
        title={review ? '¿Salir del repaso?' : '¿Descansamos?'}
      >
        <p className="text-center text-sm font-bold text-ink/60">
          {review
            ? 'Puedes hacer el repaso más tarde.'
            : 'Tu avance queda guardado: cuando vuelvas, sigues donde te quedaste.'}
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
              navigate(backTo)
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
