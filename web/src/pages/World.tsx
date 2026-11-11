import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { ProgressBar, Stars, TopBar } from '../components/Chrome'
import { Pikachu } from '../components/Pikachu'
import { sfx } from '../lib/sfx'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'

export function WorldPage() {
  const navigate = useNavigate()
  const { worldId } = useParams()
  const content = useStore((state) => state.content)
  const data = useStore((state) => state.data)

  const worldIndex = content.findIndex((item) => item.id === worldId)
  const world = content[worldIndex]

  if (!world) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
        <Pikachu size={140} mood="sad" />
        <h1 className="font-display text-2xl">No encontramos ese mundo</h1>
        <button type="button" onClick={() => navigate('/mapa')} className="btn btn-primary h-14 px-6">
          Volver al mapa
        </button>
      </div>
    )
  }

  const previous = worldIndex > 0 ? content[worldIndex - 1] : null
  const previousCompleted = previous
    ? previous.lessons.filter((lesson) => (data?.progress[lesson.id]?.stars ?? 0) > 0).length
    : 0
  const previousNeeded = previous ? Math.ceil(previous.lessons.length * 0.7) : 0
  const worldUnlocked = !previous || previousCompleted >= previousNeeded

  const completed = world.lessons.filter(
    (lesson) => (data?.progress[lesson.id]?.stars ?? 0) > 0
  ).length
  const earnedStars = world.lessons.reduce(
    (sum, lesson) => sum + (data?.progress[lesson.id]?.stars ?? 0),
    0
  )

  if (!worldUnlocked) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col pb-8">
        <TopBar title={world.title} onBack={() => navigate('/mapa')} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="text-7xl">🔒</span>
          <h2 className="font-display text-2xl">Este mundo todavía está cerrado</h2>
          <p className="max-w-sm text-sm font-bold text-ink/55">
            Completa {previousNeeded} lecciones de “{previous?.title}” para abrirlo.
          </p>
          {previous && (
            <div className="w-full max-w-xs">
              <ProgressBar value={previousCompleted / previous.lessons.length} />
              <p className="mt-2 text-xs font-bold text-ink/50">
                {previousCompleted} de {previous.lessons.length} lecciones
              </p>
            </div>
          )}
          <button type="button" onClick={() => navigate('/mapa')} className="btn btn-primary mt-2 h-14 px-6">
            Volver al mapa
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col pb-10">
      <TopBar title={world.title} subtitle={world.subtitle} onBack={() => navigate('/mapa')} />

      <div className="mx-4 mt-1 flex items-center gap-3 rounded-[2rem] bg-white/80 p-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-pika/40 text-4xl">
          {world.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs font-extrabold text-ink/50">
            <span>
              {completed} de {world.lessons.length} lecciones
            </span>
            <span>{earnedStars} ⭐</span>
          </div>
          <ProgressBar
            value={world.lessons.length ? completed / world.lessons.length : 0}
            className="mt-1.5 h-3 bg-ink/10"
            barClassName="bg-pika-dark"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 px-4">
        {world.lessons.map((lesson, index) => {
          const stars = data?.progress[lesson.id]?.stars ?? 0
          const done = stars > 0
          const previousLesson = index > 0 ? world.lessons[index - 1] : null
          const previousDone = previousLesson
            ? (data?.progress[previousLesson.id]?.stars ?? 0) > 0
            : true
          const unlocked = done || previousDone

          return (
            <motion.button
              key={lesson.id}
              type="button"
              disabled={!unlocked}
              onClick={() => {
                if (!unlocked) return
                sfx.click()
                navigate(`/leccion/${lesson.id}`)
              }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.04 }}
              className={cn(
                'card flex items-center gap-3 border-4 border-white p-3.5 text-left transition',
                !unlocked && 'opacity-55 grayscale',
                unlocked && 'hover:bg-white'
              )}
            >
              <span
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl',
                  done ? 'bg-mint/25' : unlocked ? 'bg-pika/40' : 'bg-ink/5'
                )}
              >
                {unlocked ? lesson.emoji : '🔒'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-display text-lg leading-tight">{lesson.title}</span>
                  {done && <span className="shrink-0 text-xs">✅</span>}
                </span>
                <span className="block truncate text-xs font-bold text-ink/45">{lesson.goal}</span>
                <span className="mt-1 flex items-center gap-2">
                  <Stars value={stars} size="sm" />
                  <span className="text-[10px] font-bold text-ink/35">
                    {lesson.activities.length} juegos
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-xl">{done ? '🔁' : unlocked ? '▶️' : '🔒'}</span>
            </motion.button>
          )
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={() => navigate('/mapa')} className="btn btn-white h-14 px-6">
          🗺️ Volver al mapa
        </button>
      </div>
    </div>
  )
}
