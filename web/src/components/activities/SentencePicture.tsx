import type { SentencePicture } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak } from '../../lib/speech'
import { useAnswer, TapText, PraiseBubble, PictureChoices } from './shared'

export function SentencePictureActivity({
  a,
  onDone
}: {
  a: SentencePicture
  onDone: (perfect: boolean) => void
}) {
  // La voz solo dice la instrucción: el niño lee la frase y escucha solo si lo pide
  // (toda la frase con el botón, o una palabra tocándola).
  const { locked, praise, succeed, fail, reveal } = useAnswer(
    a.question ? ['Lee la frase.', a.question] : ['Lee la frase y toca el dibujo.'],
    onDone,
    { kind: 'sentence', item: a.sentence }
  )
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="card max-w-2xl border-4 border-white px-6 py-5 text-center">
        <TapText text={a.sentence} />
        <button
          type="button"
          onClick={() => {
            sfx.click()
            speak(a.sentence, 0.82)
          }}
          className="btn btn-white mt-3 h-11 gap-2 px-4 text-sm"
        >
          🔊 Escuchar
        </button>
      </div>
      {a.question ? (
        <button
          type="button"
          onClick={() => {
            sfx.click()
            speak(a.question ?? '')
          }}
          className="flex items-center gap-2 rounded-full bg-white/80 px-5 py-2 font-display text-xl"
        >
          🔊 {a.question}
        </button>
      ) : (
        <p className="text-sm font-bold text-ink/60">¿De qué habla la frase?</p>
      )}
      <PictureChoices
        options={a.options}
        answer={a.answer}
        disabled={locked}
        onCorrect={succeed}
        onWrong={(label) => fail(undefined, label)}
        showLabels={!a.hideLabels}
        reveal={reveal}
      />
      <PraiseBubble text={praise} />
    </div>
  )
}
