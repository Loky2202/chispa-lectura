import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { IconButton, ProgressBar, Stars, TopBar } from '../components/Chrome'
import { Pikachu } from '../components/Pikachu'
import { sfx } from '../lib/sfx'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'

export function MapPage() {
  const navigate = useNavigate()
  const content = useStore((state) => state.content)
  const profile = useStore((state) => state.profile)
  const data = useStore((state) => state.data)

  const completedLessons = (worldId: string) => {
    const world = content.find((item) => item.id === worldId)
    if (!world || !data) return 0
    return world.lessons.filter((lesson) => (data.progress[lesson.id]?.stars ?? 0) > 0).length
  }

  const isUnlocked = (index: number) => {
    if (index === 0) return true
    const previous = content[index - 1]
    if (!previous) return false
    const needed = Math.ceil(previous.lessons.length * 0.7)
    return completedLessons(previous.id) >= needed
  }

  const currentIndex = content.findIndex(
    (world, index) =>
      isUnlocked(index) && completedLessons(world.id) < world.lessons.length
  )

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col pb-8">
      <TopBar
        title="Mapa de aventuras"
        right={
          <>
            <IconButton label="Garaje" onClick={() => navigate('/garaje')}>
              🚗
            </IconButton>
            <IconButton label="Zona de padres" onClick={() => navigate('/padres')}>
              ⚙️
            </IconButton>
          </>
        }
      />

      <motion.div
        className="mx-4 mt-2 flex items-center gap-3 rounded-[2rem] bg-white/80 p-4 shadow-[0_8px_0_rgba(45,49,66,0.06)]"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Pikachu size={84} mood="cheer" bounce />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-2xl">¡Hola, {profile?.name}!</h2>
          <p className="text-sm font-bold text-ink/55">
            ⚡ Energía {data?.energy ?? 1} de 10 · ⭐ {data?.totalStars ?? 0} estrellas
          </p>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 10 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  'text-sm transition',
                  index < (data?.energy ?? 1) ? 'opacity-100' : 'opacity-20 grayscale'
                )}
              >
                ⚡
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="relative mx-4 mt-5 flex flex-col gap-4">
        <div className="absolute bottom-8 left-[38px] top-8 w-1 rounded-full bg-ink/10" />
        {content.map((world, index) => {
          const unlocked = isUnlocked(index)
          const completed = completedLessons(world.id)
          const total = world.lessons.length
          const earnedStars = data
            ? world.lessons.reduce((sum, lesson) => sum + (data.progress[lesson.id]?.stars ?? 0), 0)
            : 0
          const isCurrent = index === currentIndex

          return (
            <motion.button
              key={world.id}
              type="button"
              disabled={!unlocked}
              onClick={() => {
                if (!unlocked) return
                sfx.click()
                navigate(`/mundo/${world.id}`)
              }}
              initial={{ x: index % 2 === 0 ? -14 : 14, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'relative flex items-center gap-3 text-left transition',
                !unlocked && 'opacity-55 grayscale'
              )}
            >
              <div
                className={cn(
                  'z-10 flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[1.6rem] border-4 border-white text-4xl shadow-[0_6px_0_rgba(45,49,66,0.08)]',
                  unlocked ? 'bg-pika/70' : 'bg-white'
                )}
              >
                {unlocked ? world.emoji : '🔒'}
              </div>
              <div
                className={cn(
                  'card min-w-0 flex-1 border-4 border-white p-3.5',
                  isCurrent && 'ring-4 ring-pika/70'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-xl leading-tight">{world.title}</h3>
                    <p className="truncate text-xs font-bold text-ink/50">
                      {unlocked ? world.subtitle : 'Completa el mundo anterior'}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="shrink-0 rounded-full bg-pika px-2 py-1 text-[10px] font-extrabold text-ink">
                      ¡AQUÍ!
                    </span>
                  )}
                </div>
                {unlocked && (
                  <>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar
                        value={total ? completed / total : 0}
                        className="h-3 bg-ink/10"
                        barClassName="bg-pika-dark"
                      />
                      <span className="shrink-0 text-[11px] font-extrabold text-ink/50">
                        {completed}/{total}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <Stars value={total ? Math.round(earnedStars / total) : 0} size="sm" />
                      <span className="text-[11px] font-bold text-ink/40">
                        {earnedStars} de {total * 3} ⭐
                      </span>
                    </div>
                  </>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      <div className="mt-6 flex justify-center gap-3 px-4">
        <button type="button" onClick={() => navigate('/garaje')} className="btn btn-white h-14 flex-1 text-base">
          🚗 Garaje
        </button>
        <button type="button" onClick={() => navigate('/padres')} className="btn btn-white h-14 flex-1 text-base">
          ⚙️ Padres
        </button>
      </div>
    </div>
  )
}
