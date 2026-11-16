import type { Activity } from '../types'
import { ListenTapActivity } from './activities/ListenTap'
import { WordPictureActivity } from './activities/WordPicture'
import { CountSyllablesActivity } from './activities/CountSyllables'
import { MissingLetterActivity } from './activities/MissingLetter'
import { BuildWordActivity } from './activities/BuildWord'
import { SentencePictureActivity } from './activities/SentencePicture'
import { ReadAloudActivity } from './activities/ReadAloud'
import { MemoryActivity } from './activities/Memory'
import { SequenceActivity } from './activities/Sequence'
import { StoryActivity } from './activities/Story'
import { OddOneOutActivity } from './activities/OddOneOut'
import { LearnActivity } from './activities/Learn'
import { BlendActivity } from './activities/Blend'
import { TraceActivity } from './activities/Trace'

export { mistakeSink } from './activities/shared'

// Un archivo por tipo en ./activities; lo común (useAnswer, Prompt, PictureChoices…) vive en shared.tsx.
export function ActivityView({
  activity,
  onDone
}: {
  activity: Activity
  onDone: (perfect: boolean) => void
}) {
  switch (activity.type) {
    case 'listen_tap':
      return <ListenTapActivity a={activity} onDone={onDone} />
    case 'word_picture':
      return <WordPictureActivity a={activity} onDone={onDone} />
    case 'count_syllables':
      return <CountSyllablesActivity a={activity} onDone={onDone} />
    case 'missing_letter':
      return <MissingLetterActivity a={activity} onDone={onDone} />
    case 'build_word':
      return <BuildWordActivity a={activity} onDone={onDone} />
    case 'sentence_picture':
      return <SentencePictureActivity a={activity} onDone={onDone} />
    case 'read_aloud':
      return <ReadAloudActivity a={activity} onDone={onDone} />
    case 'memory':
      return <MemoryActivity a={activity} onDone={onDone} />
    case 'sequence':
      return <SequenceActivity a={activity} onDone={onDone} />
    case 'story':
      return <StoryActivity a={activity} onDone={onDone} />
    case 'odd_one_out':
      return <OddOneOutActivity a={activity} onDone={onDone} />
    case 'learn':
      return <LearnActivity a={activity} onDone={onDone} />
    case 'blend':
      return <BlendActivity a={activity} onDone={onDone} />
    case 'trace':
      return <TraceActivity a={activity} onDone={onDone} />
    default:
      return <div className="p-6 text-center">Actividad no disponible</div>
  }
}
