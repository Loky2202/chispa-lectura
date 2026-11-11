import { motion } from 'framer-motion'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingScreen } from '../components/Chrome'
import { Pikachu } from '../components/Pikachu'
import { sfx } from '../lib/sfx'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'

const AVATARS = ['⚡', '🐭', '🚗', '🦆', '🐱', '🦖', '🦄', '🐸', '🚀', '⚽', '🐉', '🌟']

export function ProfilesPage() {
  const navigate = useNavigate()
  const profiles = useStore((state) => state.profiles)
  const loading = useStore((state) => state.loading)
  const ready = useStore((state) => state.ready)
  const error = useStore((state) => state.error)
  const selectProfile = useStore((state) => state.selectProfile)
  const createProfile = useStore((state) => state.createProfile)

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('⚡')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (!ready || loading) return <LoadingScreen />

  const showForm = creating || profiles.length === 0

  const play = async (id: number) => {
    sfx.click()
    await selectProfile(id)
    navigate('/mapa')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setFormError('Escribe un nombre')
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await createProfile(name.trim(), avatar)
      sfx.unlock()
      navigate('/mapa')
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'No se pudo crear')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-8">
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 16 }}
        >
          <Pikachu size={170} mood="cheer" bounce />
        </motion.div>
        <motion.h1
          className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          La Aventura de <span className="text-pika-dark">Chispa</span>
        </motion.h1>
        <motion.p
          className="mt-2 max-w-md text-base font-semibold text-ink/60"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18 }}
        >
          Aprende a leer jugando, con sonidos, estrellas y muchos carros.
        </motion.p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-bold text-ink/60">
          <span className="rounded-full bg-white/80 px-3 py-1.5">🎧 Escucha</span>
          <span className="rounded-full bg-white/80 px-3 py-1.5">👆 Toca</span>
          <span className="rounded-full bg-white/80 px-3 py-1.5">⭐ Gana estrellas</span>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl bg-pika-light px-4 py-3 text-center text-sm font-bold text-ink/70">
          {error}
        </div>
      )}

      {!showForm && (
        <div className="mt-8">
          <h2 className="mb-3 text-center font-display text-2xl">¿Quién va a jugar?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {profiles.map((profile) => (
              <motion.button
                key={profile.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => play(profile.id)}
                className="card flex items-center gap-4 border-4 border-white p-4 text-left transition hover:bg-white"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-pika/40 text-4xl">
                  {profile.avatar}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-2xl">{profile.name}</span>
                  <span className="text-sm font-bold text-ink/50">🪙 {profile.coins} monedas</span>
                </span>
                <span className="text-2xl">▶️</span>
              </motion.button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.click()
              setCreating(true)
            }}
            className="btn btn-white mt-4 h-14 w-full text-base"
          >
            ➕ Nuevo jugador
          </button>
        </div>
      )}

      {showForm && (
        <motion.form
          onSubmit={submit}
          className="card mx-auto mt-8 w-full max-w-md border-4 border-white p-5"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h2 className="text-center font-display text-2xl">Crea tu jugador</h2>
          <label className="mt-4 block text-sm font-bold text-ink/60" htmlFor="name">
            ¿Cómo te llamas?
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={16}
            placeholder="Tu nombre"
            autoComplete="off"
            className="mt-1 w-full rounded-2xl border-4 border-pika/60 bg-white px-4 py-3 font-display text-2xl outline-none focus:border-pika-dark"
          />
          <p className="mt-4 text-sm font-bold text-ink/60">Elige tu avatar</p>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {AVATARS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  sfx.pop()
                  setAvatar(option)
                }}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-2xl border-4 bg-white text-3xl transition',
                  avatar === option ? 'scale-105 border-pika-dark bg-pika/30' : 'border-transparent'
                )}
                aria-label={`Avatar ${option}`}
              >
                {option}
              </button>
            ))}
          </div>
          {formError && <p className="mt-3 text-center text-sm font-bold text-coral">{formError}</p>}
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary mt-5 h-16 w-full text-xl"
          >
            {busy ? 'Creando...' : '¡Empezar! ⚡'}
          </button>
          {profiles.length > 0 && (
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="btn mt-2 h-12 w-full text-sm font-bold text-ink/50"
            >
              Cancelar
            </button>
          )}
        </motion.form>
      )}

      <div className="mt-auto flex flex-col items-center gap-2 pt-10">
        <button
          type="button"
          onClick={() => navigate('/padres')}
          className="btn btn-white h-12 px-5 text-sm"
        >
          ⚙️ Para papás y mamás
        </button>
        <p className="text-center text-[11px] font-semibold text-ink/35">
          Hecho con cariño para aprender a leer · Funciona sin internet
        </p>
      </div>
    </div>
  )
}
