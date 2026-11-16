import type { OddOneOut } from '../../types'
import { speak } from '../../lib/speech'
import { useAnswer, PraiseBubble, Prompt, PictureChoices } from './shared'

export function OddOneOutActivity({ a, onDone }: { a: OddOneOut; onDone: (perfect: boolean) => void }) {
  const { locked, praise, succeed, fail, reveal } = useAnswer([a.prompt], onDone)
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <Prompt text={a.prompt} onSpeak={() => speak(a.prompt)} />
      <PictureChoices
        options={a.options}
        answer={a.answer}
        disabled={locked}
        onCorrect={succeed}
        onWrong={() => fail()}
        reveal={reveal}
      />
      <PraiseBubble text={praise} />
    </div>
  )
}
