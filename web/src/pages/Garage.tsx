import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Toast, TopBar } from '../components/Chrome'
import { Pikachu } from '../components/Pikachu'
import { sfx } from '../lib/sfx'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import type { Reward } from '../types'

export function GaragePage() {
  const navigate = useNavigate()
  const rewards = useStore((state) => state.rewards)
  const profile = useStore((state) => state.profile)
  const data = useStore((state) => state.data)
  const unlock = useStore((state) => state.unlock)

  const [tab, setTab] = useState<'car' | 'sticker'>('car')
  const [selected, setSelected] = useState<Reward | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const cars = rewards.filter((reward) => reward.type === 'car')
  const stickers = rewards.filter((reward) => reward.type === 'sticker')
  const items = tab === 'car' ? cars : stickers
  const owned = (id: string) => data?.unlocks.includes(id) ?? false
  const ownedCars = cars.filter((reward) => owned(reward.id)).length
  const ownedStickers = stickers.filter((reward) => owned(reward.id)).length
  const coins = profile?.coins ?? 0

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  const buy = async () => {
    if (!selected) return
    setBusy(true)
    const response = await unlock(selected.id)
    setBusy(false)
    if (response.ok) {
      sfx.unlock()
      showToast(`¡Desbloqueaste ${selected.name}!`)
      setSelected(null)
    } else {
      showToast(response.error ?? 'No se pudo comprar')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col pb-10">
      <TopBar title="Garaje de Chispa" subtitle="Gana monedas y desbloquea premios" onBack={() => navigate('/mapa')} />

      <div className="mx-4 mt-1 flex items-center gap-3 rounded-[2rem] bg-white/80 p-4">
        <Pikachu size={78} mood="happy" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl">Tu colección</p>
          <p className="text-sm font-bold text-ink/55">
            🚗 {ownedCars} de {cars.length} coches · ✨ {ownedStickers} de {stickers.length} stickers
          </p>
          <p className="text-xs font-bold text-ink/40">Toca un premio para verlo o comprarlo</p>
        </div>
      </div>

      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            sfx.click()
            setTab('car')
          }}
          className={cn(
            'btn h-12 text-base',
            tab === 'car' ? 'btn-primary' : 'btn-white'
          )}
        >
          🚗 Coches
        </button>
        <button
          type="button"
          onClick={() => {
            sfx.click()
            setTab('sticker')
          }}
          className={cn(
            'btn h-12 text-base',
            tab === 'sticker' ? 'btn-primary' : 'btn-white'
          )}
        >
          ✨ Stickers
        </button>
      </div>

      <div className="mx-4 mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((reward) => {
          const isOwned = owned(reward.id)
          return (
            <button
              key={reward.id}
              type="button"
              onClick={() => {
                sfx.click()
                setSelected(reward)
              }}
              className={cn(
                'card relative flex flex-col items-center gap-1 border-4 border-white p-3 transition hover:bg-white',
                isOwned && 'bg-mint/10'
              )}
            >
              <span className={cn('text-5xl', !isOwned && 'opacity-80')}>{reward.emoji}</span>
              <span className="text-center text-xs font-bold leading-tight text-ink/70">
                {reward.name}
              </span>
              {isOwned ? (
                <span className="rounded-full bg-mint/30 px-2 py-0.5 text-[10px] font-extrabold text-ink/70">
                  ✅ Tuyo
                </span>
              ) : (
                <span className="rounded-full bg-pika/40 px-2 py-0.5 text-[10px] font-extrabold">
                  🪙 {reward.cost}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={() => navigate('/mapa')} className="btn btn-white h-14 px-6">
          🗺️ Volver al mapa
        </button>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          if (!busy) setSelected(null)
        }}
        title={selected?.name}
      >
        {selected && (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-7xl">{selected.emoji}</span>
            {owned(selected.id) ? (
              <>
                <p className="font-display text-xl text-mint">¡Ya es tuyo!</p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="btn btn-primary h-14 w-full text-base"
                >
                  ¡Genial!
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-ink/60">
                  ¿Quieres comprarlo por 🪙 {selected.cost} monedas?
                </p>
                <p className="text-xs font-bold text-ink/40">Tienes {coins} monedas</p>
                {coins < selected.cost && (
                  <p className="rounded-2xl bg-coral/10 px-4 py-2 text-sm font-bold text-coral">
                    Te faltan {selected.cost - coins} monedas. ¡Sigue jugando!
                  </p>
                )}
                <div className="mt-1 flex w-full gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="btn btn-white h-14 flex-1 text-base"
                  >
                    Ahora no
                  </button>
                  <button
                    type="button"
                    disabled={busy || coins < selected.cost}
                    onClick={buy}
                    className="btn btn-primary h-14 flex-1 text-base"
                  >
                    {busy ? 'Comprando...' : 'Comprar'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Toast message={toast} />
    </div>
  )
}
