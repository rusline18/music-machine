import type { TrackSpec } from '~/core/pattern'
import type { CountingVoice } from '~/core/resolve'
import { countingFigure } from '~/core/resolve'

/**
 * The counting voice shared by every genre: "1 … 8" and "and", in each UI
 * language. Paths point into /public/audio/voice, built by `npm run samples`
 * from audio-sources/voice/<locale>/ (see scripts/speak-counts.py).
 * Russian dancers count «раз, два, три…».
 */
export const countingVoice: CountingVoice = {
  en: {
    counts: [
      '/audio/voice/en/1.wav', '/audio/voice/en/2.wav', '/audio/voice/en/3.wav', '/audio/voice/en/4.wav',
      '/audio/voice/en/5.wav', '/audio/voice/en/6.wav', '/audio/voice/en/7.wav', '/audio/voice/en/8.wav',
    ],
    and: '/audio/voice/en/and.wav',
  },
  ru: {
    counts: [
      '/audio/voice/ru/1.wav', '/audio/voice/ru/2.wav', '/audio/voice/ru/3.wav', '/audio/voice/ru/4.wav',
      '/audio/voice/ru/5.wav', '/audio/voice/ru/6.wav', '/audio/voice/ru/7.wav', '/audio/voice/ru/8.wav',
    ],
    and: '/audio/voice/ru/and.wav',
  },
}

/**
 * Voice track for presets: silent until the voice button turns the
 * counting on ("1 2 3 … 8", then with "and"). Presets that are about the
 * count, like on2's "2 … 6", write their own.
 */
export const voiceTrack: TrackSpec = { instrument: 'voice', figure: countingFigure('off', 2), volume: 0.8 }
