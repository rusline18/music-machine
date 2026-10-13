import type { TrackSpec } from '~/core/pattern'
import type { CountingVoice, SpokenWord } from '~/core/resolve'
import { countingFigure } from '~/core/resolve'
import timing from './voice-timing.json'

/** A recorded word with its timing, measured by `npm run samples`. */
function word(url: string): SpokenWord {
  const measured = (timing as Record<string, { lead: number, length: number }>)[url]
  return { url, lead: measured?.lead ?? 0, length: measured?.length ?? 0.8 }
}

/**
 * The counting voice shared by every genre: "1 … 8" and "and", in each UI
 * language. Paths point into /public/audio/voice, built by `npm run samples`
 * from audio-sources/voice/<locale>/ (see scripts/speak-counts.py).
 * Russian dancers count «раз, два, три…». Each word comes with where its
 * vowel lands and how long it's heard (voice-timing.json, written by the
 * same script), so the voice can say it on the beat.
 */
export const countingVoice: CountingVoice = {
  en: {
    counts: [
      word('/audio/voice/en/1.wav'), word('/audio/voice/en/2.wav'), word('/audio/voice/en/3.wav'), word('/audio/voice/en/4.wav'),
      word('/audio/voice/en/5.wav'), word('/audio/voice/en/6.wav'), word('/audio/voice/en/7.wav'), word('/audio/voice/en/8.wav'),
    ],
    and: word('/audio/voice/en/and.wav'),
  },
  ru: {
    counts: [
      word('/audio/voice/ru/1.wav'), word('/audio/voice/ru/2.wav'), word('/audio/voice/ru/3.wav'), word('/audio/voice/ru/4.wav'),
      word('/audio/voice/ru/5.wav'), word('/audio/voice/ru/6.wav'), word('/audio/voice/ru/7.wav'), word('/audio/voice/ru/8.wav'),
    ],
    and: word('/audio/voice/ru/and.wav'),
  },
}

/**
 * Voice track for presets: silent until the voice button turns the
 * counting on ("1 2 3 … 8", then with "and"). Presets that are about the
 * count, like on2's "2 … 6", write their own.
 */
export const voiceTrack: TrackSpec = { instrument: 'voice', figure: countingFigure('off', 2), volume: 0.8 }
