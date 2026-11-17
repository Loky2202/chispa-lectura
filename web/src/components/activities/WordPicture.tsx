import { useState } from 'react'
import type { WordPicture } from '../../types'
import { sfx } from '../../lib/sfx'
import { speak, speakQueue } from '../../lib/speech'
import { useAnswer, SyllableWord, PraiseBubble, Prompt, PictureChoices } from './shared'

export function WordPictureActivity({ a, onDone }: { a: WordPicture; onDone: (perfect: boolean) => void }) {
  // audio === '' → el niño debe leer; el audio solo aparece como ayuda tras un error.
  const silent = a.audio === ''
  // La voz solo dice la instrucción (el niño todavía no puede leerla); la palabra la lee él.
  const { locked, praise, succeed, fail, reveal } = useAnswer(
    silent ? ['Lee la palabra y toca su dibujo.'] : [a.audio ?? a.prompt],
    onDone,
    silent ? { kind: 'word-read', item: a.answer } : undefined
  )
  const [hint, setHint] = useState(false)
  const parts = a.parts?.length ? a.parts : [a.answer]
  // Ayuda: la palabra sílaba por sílaba y después completa (modela cómo se unen).
  const help = () => speakQueue(parts.length > 1 ? [...parts, a.answer] : [a.answer], 0.75)
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      {silent ? (
        <div className="flex flex-col items-center gap-3">
          <div className="card border-4 border-white px-8 py-5">
            <SyllableWord parts={parts} className="text-6xl sm:text-7xl" />
          </div>
          {hint && (
            <button
              type="button"
              onClick={() => {
                sfx.click()
                help()
              }}
              className="btn btn-white animate-pop h-12 gap-2 px-5 text-sm"
            >
              🔊 Ayuda
            </button>
          )}
        </div>
      ) : (
        <Prompt text={a.prompt} onSpeak={() => speak(a.audio ?? a.prompt)} />
      )}
      <PictureChoices
        options={a.options}
        answer={a.answer}
        disabled={locked}
        onCorrect={succeed}
        onWrong={(label) => {
          setHint(true)
          fail(undefined, label)
        }}
        showLabels={!a.hideLabels}
        reveal={reveal}
      />
      <PraiseBubble text={praise} />
    </div>
  )
}
