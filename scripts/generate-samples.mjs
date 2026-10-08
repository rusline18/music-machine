/**
 * Builds every one-shot in public/audio/** as a 16-bit mono WAV.
 *
 * Each sample comes from a real recording when its source file is present
 * in audio-sources/ (see `recordings` below — all CC0), trimmed to a single
 * hit (or, for pitched notes, one note tuned to exact pitch) and
 * peak-normalized. Otherwise it falls back to a synthesized
 * placeholder (see `generators`), so the app always has a full set.
 *
 * Usage: npm run samples
 *
 * The list of files to write is every '/audio/….wav' path quoted in
 * any .ts file under app/genres/, and the script fails if a path there has no
 * generator below — keeps the two in sync.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SAMPLE_RATE = 44100

// --- Deterministic noise (mulberry32) so re-runs produce identical files ---

function createRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- Primitives ---

const buffer = (seconds) => new Float32Array(Math.round(seconds * SAMPLE_RATE))

/** Exponential decay envelope with a short linear attack (avoids clicks). */
function envelope(i, decay, attack = 0.001) {
  const t = i / SAMPLE_RATE
  const a = t < attack ? t / attack : 1
  return a * Math.exp(-t / decay)
}

/** Sine with an exponential pitch glide from `startFreq` down to `endFreq`. */
function drumTone(out, { startFreq, endFreq = startFreq, glide = 0.03, decay, gain = 1 }) {
  let phase = 0
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE
    const freq = endFreq + (startFreq - endFreq) * Math.exp(-t / glide)
    phase += (2 * Math.PI * freq) / SAMPLE_RATE
    out[i] += gain * Math.sin(phase) * envelope(i, decay)
  }
}

/** RBJ biquad band-pass, applied in place. */
function bandpass(signal, freq, q) {
  const w0 = (2 * Math.PI * freq) / SAMPLE_RATE
  const alpha = Math.sin(w0) / (2 * q)
  const a0 = 1 + alpha
  const b0 = alpha / a0
  const b2 = -alpha / a0
  const a1 = (-2 * Math.cos(w0)) / a0
  const a2 = (1 - alpha) / a0
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < signal.length; i++) {
    const x = signal[i]
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1
    x1 = x
    y2 = y1
    y1 = y
    signal[i] = y
  }
  return signal
}

/** One-pole high-pass, applied in place. */
function highpass(signal, freq) {
  const rc = 1 / (2 * Math.PI * freq)
  const alpha = rc / (rc + 1 / SAMPLE_RATE)
  let prevX = 0, prevY = 0
  for (let i = 0; i < signal.length; i++) {
    const y = alpha * (prevY + signal[i] - prevX)
    prevX = signal[i]
    prevY = y
    signal[i] = y
  }
  return signal
}

/** White noise shaped by `shape(i)`, added into `out` through a band-pass. */
function noiseBurst(out, { seed, freq, q, shape, gain = 1, hp }) {
  const random = createRandom(seed)
  const noise = new Float32Array(out.length)
  for (let i = 0; i < noise.length; i++) noise[i] = (random() * 2 - 1) * shape(i)
  if (freq) bandpass(noise, freq, q)
  if (hp) highpass(noise, hp)
  for (let i = 0; i < out.length; i++) out[i] += gain * noise[i]
}

/** Karplus–Strong plucked string, added into `out`. */
function pluck(out, { freq, seed, damping = 0.996, brightness = 0.5, offset = 0, gain = 1 }) {
  const random = createRandom(seed)
  const period = Math.round(SAMPLE_RATE / freq)
  const line = new Float32Array(period)
  for (let i = 0; i < period; i++) line[i] = random() * 2 - 1
  // Pre-smooth the excitation: lower brightness = darker, rounder attack.
  for (let pass = 0; pass < Math.round((1 - brightness) * 6); pass++) {
    for (let i = 1; i < period; i++) line[i] = 0.5 * (line[i] + line[i - 1])
  }
  const start = Math.round(offset * SAMPLE_RATE)
  let idx = 0
  for (let i = start; i < out.length; i++) {
    const next = (idx + 1) % period
    const value = line[idx]
    line[idx] = damping * 0.5 * (line[idx] + line[next])
    out[i] += gain * value
    idx = next
  }
}

/** Scrape: noise gated by a train of short pulses (güiro / güira strokes). */
function scrape(out, { seed, rate, freq, q, hp, decay, gain = 1 }) {
  noiseBurst(out, {
    seed,
    freq,
    q,
    hp,
    gain,
    shape: (i) => {
      const t = i / SAMPLE_RATE
      const pulse = Math.pow(Math.max(0, Math.sin(Math.PI * rate * t)), 6)
      return (0.25 + 0.75 * pulse) * envelope(i, decay, 0.004)
    },
  })
}

// --- Instruments ---

const clave = () => {
  const out = buffer(0.25)
  drumTone(out, { startFreq: 2450, decay: 0.045 })
  drumTone(out, { startFreq: 5300, decay: 0.012, gain: 0.25 })
  noiseBurst(out, { seed: 1, freq: 3000, q: 2, gain: 0.4, shape: (i) => envelope(i, 0.003) })
  return out
}

const handDrum = ({ freq, decay, slap = 0, seed }) => () => {
  const out = buffer(Math.max(0.25, decay * 5))
  drumTone(out, { startFreq: freq * 1.35, endFreq: freq, glide: 0.012, decay })
  drumTone(out, { startFreq: freq * 2.3, decay: decay * 0.35, gain: 0.2 })
  // Skin contact: a tiny bit for open tones, a lot for slaps.
  noiseBurst(out, {
    seed,
    freq: 1800 + slap * 1500,
    q: 1.2,
    gain: 0.15 + slap * 0.9,
    shape: (i) => envelope(i, 0.004 + slap * 0.012),
  })
  return out
}

const timbale = ({ freq, decay, seed }) => () => {
  const out = buffer(0.8)
  // Thin metal shell = inharmonic ring on top of the head tone.
  drumTone(out, { startFreq: freq * 1.15, endFreq: freq, glide: 0.01, decay })
  for (const [ratio, gain] of [[1.59, 0.35], [2.14, 0.25], [2.65, 0.18], [3.9, 0.1]]) {
    drumTone(out, { startFreq: freq * ratio, decay: decay * 0.8, gain })
  }
  noiseBurst(out, { seed, freq: 2500, q: 1, gain: 0.35, shape: (i) => envelope(i, 0.006) })
  return out
}

const timbaleRim = () => {
  const out = buffer(0.2)
  drumTone(out, { startFreq: 1750, decay: 0.03, gain: 0.7 })
  drumTone(out, { startFreq: 3100, decay: 0.015, gain: 0.3 })
  noiseBurst(out, { seed: 31, freq: 3500, q: 2.5, gain: 0.9, shape: (i) => envelope(i, 0.008) })
  return out
}

const cowbell = () => {
  // Classic two-oscillator cowbell: detuned squares through a band-pass.
  const out = buffer(0.5)
  for (const freq of [562, 845]) {
    for (let i = 0; i < out.length; i++) {
      const square = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) >= 0 ? 1 : -1
      out[i] += 0.5 * square * (0.6 * envelope(i, 0.02) + 0.4 * envelope(i, 0.15))
    }
  }
  return bandpass(out, 900, 1.6)
}

/** A cowbell struck near the neck: same tone, choked short. */
const cowbellNeck = () => fadeOut(cowbell().slice(0, Math.round(0.08 * SAMPLE_RATE)), 0.03)

const maracas = () => {
  const out = buffer(0.15)
  noiseBurst(out, { seed: 41, hp: 4000, shape: (i) => envelope(i, 0.035, 0.006) })
  return out
}

const guiro = ({ seconds, rate, seed }) => () => {
  const out = buffer(seconds)
  scrape(out, { seed, rate, freq: 2600, q: 1.5, decay: seconds * 0.6 })
  return fadeOut(out, 0.03)
}

const guira = ({ seconds, rate, seed }) => () => {
  const out = buffer(seconds)
  // Metal güira is brighter and hissier than a gourd güiro.
  scrape(out, { seed, rate, hp: 5000, decay: seconds * 0.5 })
  return fadeOut(out, 0.02)
}

const bass = () => {
  const out = buffer(0.9)
  const freq = 110 // A2, the pitch the app's bass zone assumes
  drumTone(out, { startFreq: freq, decay: 0.35 })
  drumTone(out, { startFreq: freq * 2, decay: 0.2, gain: 0.35 })
  drumTone(out, { startFreq: freq * 3, decay: 0.1, gain: 0.12 })
  pluck(out, { freq: freq * 2, seed: 51, damping: 0.99, brightness: 0.2, gain: 0.2 })
  return out
}

// Single guitar notes; the app pitch-shifts them, so they must sit exactly
// on the pitch named in app/genres/bachata/samples.ts.
const guitarNote = ({ freq, seed }) => () => {
  const out = buffer(1.2)
  pluck(out, { freq, seed, damping: 0.997, brightness: 0.75 })
  return out
}

// Stand-in for a spoken count when there's no recording: a short beep,
// higher on "1" and lowest on "and", so the counting still reads by ear.
const countBeep = (freq) => () => {
  const out = buffer(0.15)
  drumTone(out, { startFreq: freq, decay: 0.05 })
  return out
}
const VOICE_LOCALES = ['en', 'ru']
const VOICE_WORDS = ['1', '2', '3', '4', '5', '6', '7', '8', 'and']
const voicePaths = (each) => Object.fromEntries(VOICE_LOCALES.flatMap((locale) =>
  VOICE_WORDS.map((word) => [`/audio/voice/${locale}/${word}.wav`, each(locale, word)])))

const generators = {
  ...voicePaths((_locale, word) => countBeep(word === '1' ? 1320 : word === 'and' ? 660 : 880)),
  '/audio/salsa/clave/hit.wav': clave,
  '/audio/salsa/congas/low.wav': handDrum({ freq: 165, decay: 0.16, seed: 11 }),
  '/audio/salsa/congas/open.wav': handDrum({ freq: 225, decay: 0.12, seed: 12 }),
  '/audio/salsa/congas/slap.wav': handDrum({ freq: 330, decay: 0.035, slap: 1, seed: 13 }),
  '/audio/salsa/bongos/low.wav': handDrum({ freq: 340, decay: 0.07, seed: 21 }),
  '/audio/salsa/bongos/high.wav': handDrum({ freq: 495, decay: 0.06, seed: 22 }),
  '/audio/salsa/bongos/slap.wav': handDrum({ freq: 520, decay: 0.025, slap: 1, seed: 23 }),
  '/audio/salsa/bongos/low-2.wav': handDrum({ freq: 338, decay: 0.07, seed: 27 }),
  '/audio/salsa/bongos/high-2.wav': handDrum({ freq: 492, decay: 0.06, seed: 28 }),
  '/audio/salsa/bongos/slap-2.wav': handDrum({ freq: 517, decay: 0.025, slap: 1, seed: 29 }),
  '/audio/salsa/timbales/low.wav': timbale({ freq: 260, decay: 0.14, seed: 32 }),
  '/audio/salsa/timbales/high.wav': timbale({ freq: 385, decay: 0.11, seed: 33 }),
  '/audio/salsa/timbales/rim.wav': timbaleRim,
  '/audio/salsa/cowbell/hit.wav': cowbell,
  '/audio/salsa/maracas/hit.wav': maracas,
  '/audio/salsa/guiro/short.wav': guiro({ seconds: 0.12, rate: 45, seed: 42 }),
  '/audio/salsa/guiro/long.wav': guiro({ seconds: 0.4, rate: 38, seed: 43 }),
  '/audio/bachata/guira/short.wav': guira({ seconds: 0.08, rate: 60, seed: 44 }),
  '/audio/bachata/guira/long.wav': guira({ seconds: 0.28, rate: 50, seed: 45 }),
  '/audio/bachata/guira/short-2.wav': guira({ seconds: 0.08, rate: 58, seed: 46 }),
  '/audio/bachata/guira/short-3.wav': guira({ seconds: 0.08, rate: 62, seed: 47 }),
  '/audio/bachata/guira/long-2.wav': guira({ seconds: 0.28, rate: 48, seed: 48 }),
  '/audio/bachata/guira/long-3.wav': guira({ seconds: 0.28, rate: 52, seed: 49 }),
  '/audio/bachata/bongos/low.wav': handDrum({ freq: 340, decay: 0.07, seed: 24 }),
  '/audio/bachata/bongos/high.wav': handDrum({ freq: 495, decay: 0.06, seed: 25 }),
  '/audio/bachata/bongos/slap.wav': handDrum({ freq: 520, decay: 0.025, slap: 1, seed: 26 }),
  '/audio/bachata/bongos/low-2.wav': handDrum({ freq: 338, decay: 0.07, seed: 34 }),
  '/audio/bachata/bongos/high-2.wav': handDrum({ freq: 492, decay: 0.06, seed: 35 }),
  '/audio/bachata/bongos/slap-2.wav': handDrum({ freq: 517, decay: 0.025, slap: 1, seed: 36 }),
  '/audio/bachata/campana/open.wav': cowbell,
  '/audio/bachata/campana/neck.wav': cowbellNeck,
  '/audio/bachata/bass/a2.wav': bass,
  '/audio/bachata/guitar/e2.wav': guitarNote({ freq: 82.41, seed: 61 }),
  '/audio/bachata/guitar/g2.wav': guitarNote({ freq: 98, seed: 62 }),
  '/audio/bachata/guitar/bb2.wav': guitarNote({ freq: 116.54, seed: 63 }),
  '/audio/bachata/guitar/db3.wav': guitarNote({ freq: 138.59, seed: 64 }),
  '/audio/bachata/guitar/e3.wav': guitarNote({ freq: 164.81, seed: 65 }),
  '/audio/bachata/guitar/g3.wav': guitarNote({ freq: 196, seed: 66 }),
  '/audio/bachata/guitar/bb3.wav': guitarNote({ freq: 233.08, seed: 67 }),
  '/audio/bachata/guitar/db4.wav': guitarNote({ freq: 277.18, seed: 68 }),
  '/audio/bachata/guitar/e4.wav': guitarNote({ freq: 329.63, seed: 69 }),
  '/audio/bachata/guitar/g4.wav': guitarNote({ freq: 392, seed: 70 }),
  '/audio/bachata/guitar/bb4.wav': guitarNote({ freq: 466.16, seed: 71 }),
  '/audio/bachata/guitar/c5.wav': guitarNote({ freq: 523.25, seed: 72 }),
  '/audio/bachata/guitar/e5.wav': guitarNote({ freq: 659.26, seed: 73 }),
}

// --- Recordings (all CC0 / public domain) ---
//
// `vcsl`: file in audio-sources/vcsl, from the Versilian Community Sample
//   Library (https://github.com/sgossner/VCSL).
// `wikimedia`: file in audio-sources/wikimedia (Wikimedia Commons).
// `voice`: file in audio-sources/voice, one spoken word per file, used
//   whole (see scripts/speak-counts.py).
// `uiowa`: file in audio-sources/uiowa, from the University of Iowa Musical
//   Instrument Samples (free to use without restrictions, not formally CC0).
// `midi`: for pitched sources, the note to cut out; it's tuned to exactly
//   this pitch, so the app can treat it as a perfect zone.
// `freesound`: sound ID; the file downloaded from freesound.org keeps its
//   default name (`<id>__<user>__<title>.wav`) in audio-sources/freesound.
// `onset`: which detected hit to take (for sources with several hits).
// `maxLength`: seconds; the tail is also cut once it decays to -45 dB.

const recordings = {
  ...voicePaths((locale, word) => ({ voice: `${locale}/${word}.wav`, maxLength: 0.5 })),
  '/audio/salsa/clave/hit.wav': { vcsl: 'Claves1_Hit_v2_rr1_Mid.wav', maxLength: 0.4 },
  '/audio/salsa/congas/low.wav': { vcsl: 'Tumba_HitN_v3_rr1_Sum.wav', maxLength: 0.7 },
  '/audio/salsa/congas/open.wav': { vcsl: 'Conga_HitN_v2_rr1_Sum.wav', maxLength: 0.6 },
  '/audio/salsa/congas/slap.wav': { vcsl: 'Quinto_HitFM1_v2_rr1_Sum.wav', maxLength: 0.35 },
  '/audio/salsa/bongos/low.wav': { vcsl: 'BongoL_Hit1_v2_rr1_Mid.wav', maxLength: 0.5 },
  '/audio/salsa/bongos/high.wav': { vcsl: 'BongoH_Hit1_v2_rr1_Mid.wav', maxLength: 0.45 },
  '/audio/salsa/bongos/slap.wav': { vcsl: 'BongoH_HitMuted1_v3_rr1_Mid.wav', maxLength: 0.3 },
  '/audio/salsa/bongos/low-2.wav': { vcsl: 'BongoL_Hit1_v2_rr2_Mid.wav', maxLength: 0.5 },
  '/audio/salsa/bongos/high-2.wav': { vcsl: 'BongoH_Hit1_v2_rr2_Mid.wav', maxLength: 0.45 },
  '/audio/salsa/bongos/slap-2.wav': { vcsl: 'BongoH_HitMuted1_v3_rr2_Mid.wav', maxLength: 0.3 },
  '/audio/salsa/timbales/low.wav': { freesound: 533094, maxLength: 0.9 },
  '/audio/salsa/timbales/high.wav': { freesound: 533095, maxLength: 0.8 },
  '/audio/salsa/timbales/rim.wav': { freesound: 533089, maxLength: 0.5 },
  '/audio/salsa/cowbell/hit.wav': { vcsl: 'Cowbell1_Hit_v3_rr1_Mid.wav', maxLength: 0.5 },
  '/audio/salsa/maracas/hit.wav': { vcsl: 'Mid_ShakerHighFaster_Down_rr1.wav', maxLength: 0.2 },
  '/audio/salsa/guiro/short.wav': { vcsl: 'Guiro_Hit_rr1_Mid.wav', maxLength: 0.25 },
  '/audio/salsa/guiro/long.wav': { vcsl: 'Guiro_Fast_rr1_Mid.wav', maxLength: 0.6 },
  '/audio/bachata/guira/short.wav': { wikimedia: 'Guira_Tim_Ross.wav', onset: 1, maxLength: 0.12 },
  '/audio/bachata/guira/long.wav': { wikimedia: 'Guira_Tim_Ross.wav', onset: 0, maxLength: 0.35 },
  // The recording repeats long-short-short three times: hits 0, 3 and 6 are long.
  '/audio/bachata/guira/short-2.wav': { wikimedia: 'Guira_Tim_Ross.wav', onset: 4, maxLength: 0.12 },
  '/audio/bachata/guira/short-3.wav': { wikimedia: 'Guira_Tim_Ross.wav', onset: 7, maxLength: 0.12 },
  '/audio/bachata/guira/long-2.wav': { wikimedia: 'Guira_Tim_Ross.wav', onset: 3, maxLength: 0.35 },
  '/audio/bachata/guira/long-3.wav': { wikimedia: 'Guira_Tim_Ross.wav', onset: 6, maxLength: 0.35 },
  '/audio/bachata/bongos/low.wav': { vcsl: 'BongoL_Hit1_v2_rr2_Mid.wav', maxLength: 0.5 },
  '/audio/bachata/bongos/high.wav': { vcsl: 'BongoH_Hit1_v2_rr2_Mid.wav', maxLength: 0.45 },
  '/audio/bachata/bongos/slap.wav': { vcsl: 'BongoH_HitMuted1_v3_rr2_Mid.wav', maxLength: 0.3 },
  '/audio/bachata/bongos/low-2.wav': { vcsl: 'BongoL_Hit1_v2_rr1_Mid.wav', maxLength: 0.5 },
  '/audio/bachata/bongos/high-2.wav': { vcsl: 'BongoH_Hit1_v2_rr1_Mid.wav', maxLength: 0.45 },
  '/audio/bachata/bongos/slap-2.wav': { vcsl: 'BongoH_HitMuted1_v3_rr1_Mid.wav', maxLength: 0.3 },
  // Same VCSL cowbell as salsa; the neck stroke is the hit choked after 80 ms.
  '/audio/bachata/campana/open.wav': { vcsl: 'Cowbell1_Hit_v3_rr1_Mid.wav', maxLength: 0.5 },
  '/audio/bachata/campana/neck.wav': { vcsl: 'Cowbell1_Hit_v3_rr1_Mid.wav', maxLength: 0.08 },
  '/audio/bachata/bass/a2.wav': { freesound: 43938, maxLength: 0.9 },
  // Each Iowa file is a chromatic run up one string; `midi` picks the note.
  '/audio/bachata/guitar/e2.wav': { uiowa: 'Guitar.mf.sulE.E2B2.mono.aif', midi: 40, maxLength: 1.2 },
  '/audio/bachata/guitar/g2.wav': { uiowa: 'Guitar.mf.sulE.E2B2.mono.aif', midi: 43, maxLength: 1.2 },
  '/audio/bachata/guitar/bb2.wav': { uiowa: 'Guitar.mf.sulE.E2B2.mono.aif', midi: 46, maxLength: 1.2 },
  '/audio/bachata/guitar/db3.wav': { uiowa: 'Guitar.mf.sulA.C3B3.mono.aif', midi: 49, maxLength: 1.2 },
  '/audio/bachata/guitar/e3.wav': { uiowa: 'Guitar.mf.sulA.C3B3.mono.aif', midi: 52, maxLength: 1.2 },
  '/audio/bachata/guitar/g3.wav': { uiowa: 'Guitar.mf.sulG.G3B3.mono.aif', midi: 55, maxLength: 1.2 },
  '/audio/bachata/guitar/bb3.wav': { uiowa: 'Guitar.mf.sulG.G3B3.mono.aif', midi: 58, maxLength: 1.2 },
  '/audio/bachata/guitar/db4.wav': { uiowa: 'Guitar.mf.sulB.C4B4.mono.aif', midi: 61, maxLength: 1.2 },
  '/audio/bachata/guitar/e4.wav': { uiowa: 'Guitar.mf.sulB.C4B4.mono.aif', midi: 64, maxLength: 1.2 },
  '/audio/bachata/guitar/g4.wav': { uiowa: 'Guitar.mf.sulB.C4B4.mono.aif', midi: 67, maxLength: 1.2 },
  '/audio/bachata/guitar/bb4.wav': { uiowa: 'Guitar.mf.sulB.C4B4.mono.aif', midi: 70, maxLength: 1.2 },
  '/audio/bachata/guitar/c5.wav': { uiowa: 'Guitar.mf.sul_E.C5B5.mono.aif', midi: 72, maxLength: 1.2 },
  '/audio/bachata/guitar/e5.wav': { uiowa: 'Guitar.mf.sul_E.C5B5.mono.aif', midi: 76, maxLength: 1.2 },
}

const SOURCES = join(ROOT, 'audio-sources')

function findRecording({ vcsl, wikimedia, uiowa, voice, freesound }) {
  const named = (vcsl && ['vcsl', vcsl]) || (wikimedia && ['wikimedia', wikimedia]) || (uiowa && ['uiowa', uiowa])
    || (voice && ['voice', voice])
  if (named) {
    const file = join(SOURCES, ...named)
    return existsSync(file) ? file : null
  }
  const dir = join(SOURCES, 'freesound')
  const match = existsSync(dir) && readdirSync(dir).find((name) => name.startsWith(`${freesound}__`))
  return match ? join(dir, match) : null
}

/** Decodes PCM WAV/AIFF to { rate, mono } (channels averaged). */
function decodeAudio(file) {
  const bytes = readFileSync(file)
  const riff = bytes.toString('ascii', 0, 4)
  if (riff !== 'RIFF' && riff !== 'FORM') throw new Error(`${file}: not a WAV or AIFF file`)
  const isAiff = riff === 'FORM'
  const u16 = (o) => (isAiff ? bytes.readUInt16BE(o) : bytes.readUInt16LE(o))
  const u32 = (o) => (isAiff ? bytes.readUInt32BE(o) : bytes.readUInt32LE(o))

  let channels, rate, bits, float = false, littleEndian = !isAiff, dataStart, dataLength
  for (let o = 12; o + 8 <= bytes.length;) {
    const id = bytes.toString('ascii', o, o + 4)
    const size = u32(o + 4)
    const body = o + 8
    if (id === 'fmt ') {
      const format = u16(body) === 0xfffe ? u16(body + 24) : u16(body)
      channels = u16(body + 2)
      rate = u32(body + 4)
      bits = u16(body + 14)
      float = format === 3
    } else if (id === 'COMM') {
      channels = u16(body)
      bits = u16(body + 6)
      // 80-bit extended float sample rate.
      const exponent = (u16(body + 8) & 0x7fff) - 16383
      rate = Math.round(u32(body + 10) * Math.pow(2, exponent - 31))
      if (size > 18 && bytes.toString('ascii', body + 18, body + 22) === 'sowt') littleEndian = true
    } else if (id === 'data') {
      dataStart = body
      dataLength = size
    } else if (id === 'SSND') {
      dataStart = body + 8 + u32(body)
      dataLength = size - 8
    }
    o = body + size + (size & 1)
  }
  if (!channels || !dataStart) throw new Error(`${file}: missing format or data chunk`)

  const width = bits / 8
  const frames = Math.floor(Math.min(dataLength, bytes.length - dataStart) / (width * channels))
  const read = (o) => {
    if (float) return bits === 32 ? bytes.readFloatLE(o) : bytes.readDoubleLE(o)
    if (bits === 8) return (bytes[o] - 128) / 128
    const max = 2 ** (bits - 1)
    return (littleEndian ? bytes.readIntLE(o, width) : bytes.readIntBE(o, width)) / max
  }
  const mono = new Float32Array(frames)
  for (let f = 0; f < frames; f++) {
    let sum = 0
    for (let c = 0; c < channels; c++) sum += read(dataStart + (f * channels + c) * width)
    mono[f] = sum / channels
  }
  return { rate, mono }
}

/** Block-peak envelope, ~6 ms per block at 44.1 kHz. */
const BLOCK = 256
function blockPeaks(signal) {
  const peaks = new Float32Array(Math.ceil(signal.length / BLOCK))
  for (let i = 0; i < signal.length; i++) {
    const b = (i / BLOCK) | 0
    peaks[b] = Math.max(peaks[b], Math.abs(signal[i]))
  }
  return peaks
}

/**
 * Start blocks of hits: rises above -20 dB of the peak after >= ~25 ms of
 * quiet (below -26 dB, so a drum's decay wobbling around -20 dB doesn't
 * retrigger). The first rise always counts, so recordings with a noise floor
 * above -26 dB still register their first hit.
 */
function detectOnsets(peaks) {
  const loudest = Math.max(...peaks)
  const threshold = loudest * 0.1
  const onsets = []
  let quiet = Infinity
  for (let b = 0; b < peaks.length; b++) {
    if (peaks[b] >= threshold && (quiet >= 4 || onsets.length === 0)) onsets.push(b)
    quiet = peaks[b] < threshold * 0.5 ? quiet + 1 : 0
  }
  return onsets
}

/** Cuts one hit out of a recording: onset → decay to -45 dB / next hit / maxLength. */
function sliceRecording(file, { onset = 0, maxLength }) {
  const { rate, mono } = decodeAudio(file)
  const peaks = blockPeaks(mono)
  const onsets = detectOnsets(peaks)
  if (onset >= onsets.length) throw new Error(`${file}: only ${onsets.length} hit(s), wanted #${onset}`)

  // Back up a couple of ms so the attack transient is kept whole.
  const start = Math.max(0, onsets[onset] * BLOCK - Math.round(0.002 * rate))
  const nextHit = onset + 1 < onsets.length ? onsets[onset + 1] * BLOCK : mono.length
  const hardEnd = Math.min(nextHit, start + Math.round(maxLength * rate), mono.length)

  const hitPeak = Math.max(...peaks.slice(start / BLOCK | 0, Math.ceil(hardEnd / BLOCK)))
  let lastLoudBlock = start / BLOCK | 0
  for (let b = lastLoudBlock; b < Math.ceil(hardEnd / BLOCK); b++) {
    if (peaks[b] > hitPeak * 0.0056) lastLoudBlock = b // -45 dB
  }
  const end = Math.min(hardEnd, (lastLoudBlock + 1) * BLOCK)

  const out = mono.slice(start, end)
  return { rate, signal: fadeOut(out, Math.min(0.03, out.length / rate / 4)) }
}

// --- Pitched notes ---

/**
 * Onsets as sudden rises (a block at least twice as loud as the ~20 ms
 * before it), at least 2 s apart. Suits slow runs of ringing notes, where
 * detectOnsets misses notes that start while the last one still sounds.
 */
function risingOnsets(peaks, rate) {
  const loudest = Math.max(...peaks)
  const minGap = Math.round((2 * rate) / BLOCK)
  const onsets = []
  for (let b = 0; b < peaks.length; b++) {
    let recent = 0
    for (let k = Math.max(0, b - 8); k < b; k++) recent = Math.max(recent, peaks[k])
    const last = onsets.at(-1)
    if (peaks[b] > loudest * 0.01 && peaks[b] > recent * 2 && (last === undefined || b - last > minGap)) onsets.push(b)
  }
  return onsets
}

/** Pitch (fractional MIDI) by autocorrelation over 250–500 ms after `start`, or NaN. */
function measurePitch(signal, rate, start) {
  const from = start + Math.round(0.25 * rate)
  const length = Math.round(0.25 * rate)
  const minLag = Math.round(rate / 1200)
  const maxLag = Math.round(rate / 60)
  if (from + length + maxLag >= signal.length) return NaN
  const r = []
  let best = 0
  for (let lag = minLag; lag < maxLag; lag++) {
    let sum = 0, e1 = 0, e2 = 0
    for (let i = from; i < from + length; i += 2) {
      sum += signal[i] * signal[i + lag]
      e1 += signal[i] ** 2
      e2 += signal[i + lag] ** 2
    }
    r[lag] = sum / Math.sqrt(e1 * e2 || 1)
    best = Math.max(best, r[lag])
  }
  // First strong peak, not the strongest: later peaks are period multiples.
  const lag = r.findIndex((v, l) => l > minLag && l < maxLag - 1 && v > 0.9 * best && v >= r[l - 1] && v >= r[l + 1])
  if (lag < 0) return NaN
  const [a, b, c] = [r[lag - 1], r[lag], r[lag + 1]]
  const exactLag = lag + (a - c) / (2 * (a - 2 * b + c))
  return 69 + 12 * Math.log2(rate / exactLag / 440)
}

/** RBJ biquad low-pass, applied in place. */
function lowpass(signal, freq, rate, q = 0.707) {
  const w0 = (2 * Math.PI * freq) / rate
  const alpha = Math.sin(w0) / (2 * q)
  const a0 = 1 + alpha
  const b1 = (1 - Math.cos(w0)) / a0
  const b0 = b1 / 2
  const a1 = (-2 * Math.cos(w0)) / a0
  const a2 = (1 - alpha) / a0
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < signal.length; i++) {
    const x = signal[i]
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2
    x2 = x1
    x1 = x
    y2 = y1
    y1 = y
    signal[i] = y
  }
  return signal
}

/**
 * Cuts the note nearest `midi` out of a run of notes, then resamples it to
 * SAMPLE_RATE and to exactly `midi` in one go (fixing the player's tuning).
 */
function sliceNote(file, { midi, maxLength }) {
  const { rate, mono } = decodeAudio(file)
  const onsets = risingOnsets(blockPeaks(mono), rate)
  const notes = onsets.map((block, i) => ({ start: block * BLOCK, next: onsets[i + 1], pitch: measurePitch(mono, rate, block * BLOCK) }))
  const note = notes.filter((n) => Math.abs(n.pitch - midi) < 0.5).sort((a, b) => Math.abs(a.pitch - midi) - Math.abs(b.pitch - midi))[0]
  if (!note) throw new Error(`${file}: no note near MIDI ${midi} (found ${notes.map((n) => n.pitch.toFixed(1)).join(', ')})`)

  // The rise detector can fire on finger noise just before the pluck; start
  // where the note reaches a quarter of its peak so it isn't late in the app.
  const window = Math.round(0.15 * rate)
  let peak = 0
  for (let i = note.start; i < note.start + window; i++) peak = Math.max(peak, Math.abs(mono[i]))
  let attack = note.start
  while (attack < note.start + window && Math.abs(mono[attack]) < peak / 4) attack++
  const start = Math.max(0, attack - Math.round(0.002 * rate))
  const end = Math.min(mono.length, note.next ? note.next * BLOCK : mono.length, start + Math.ceil(maxLength * rate * 1.1))
  const source = lowpass(mono.slice(start, end), Math.min(18000, rate * 0.4), rate)

  // Reading the source this much faster than real time lands on SAMPLE_RATE
  // and raises the pitch by (midi - note.pitch) semitones.
  const step = (rate / SAMPLE_RATE) * 2 ** ((midi - note.pitch) / 12)
  const out = new Float32Array(Math.min(Math.floor((source.length - 1) / step), Math.round(maxLength * SAMPLE_RATE)))
  for (let i = 0; i < out.length; i++) {
    const pos = i * step
    const j = Math.floor(pos)
    out[i] = source[j] + (source[j + 1] - source[j]) * (pos - j)
  }
  return { rate: SAMPLE_RATE, signal: fadeOut(out, 0.08), tuning: midi - note.pitch }
}

/** A whole spoken word: just the silence around it trimmed off. */
function sliceWord(file, { maxLength }) {
  const { rate, mono } = decodeAudio(file)
  let peak = 0
  for (const v of mono) peak = Math.max(peak, Math.abs(v))
  const loud = (v) => Math.abs(v) > peak * 0.01 // -40 dB
  const first = mono.findIndex(loud)
  const last = mono.findLastIndex(loud)
  const start = Math.max(0, first - Math.round(0.005 * rate))
  const end = Math.min(mono.length, last + Math.round(0.02 * rate), start + Math.round(maxLength * rate))
  return { rate, signal: fadeOut(mono.slice(start, end), 0.02) }
}

// --- Output ---

function fadeOut(signal, seconds) {
  const n = Math.min(signal.length, Math.round(seconds * SAMPLE_RATE))
  for (let i = 0; i < n; i++) signal[signal.length - 1 - i] *= i / n
  return signal
}

/** Peak-normalize to -1 dBFS and add short edge fades so nothing clicks. */
function finalize(signal) {
  // Plucks start mid-waveform; ramp the first millisecond in.
  const fadeInLength = Math.round(0.001 * SAMPLE_RATE)
  for (let i = 0; i < fadeInLength; i++) signal[i] *= i / fadeInLength
  fadeOut(signal, 0.005)
  let peak = 0
  for (const v of signal) peak = Math.max(peak, Math.abs(v))
  const scale = peak > 0 ? 0.891 / peak : 0
  return signal.map((v) => v * scale)
}

function encodeWav(signal, rate = SAMPLE_RATE) {
  const dataSize = signal.length * 2
  const out = Buffer.alloc(44 + dataSize)
  out.write('RIFF', 0)
  out.writeUInt32LE(36 + dataSize, 4)
  out.write('WAVE', 8)
  out.write('fmt ', 12)
  out.writeUInt32LE(16, 16)
  out.writeUInt16LE(1, 20) // PCM
  out.writeUInt16LE(1, 22) // mono
  out.writeUInt32LE(rate, 24)
  out.writeUInt32LE(rate * 2, 28)
  out.writeUInt16LE(2, 32)
  out.writeUInt16LE(16, 34)
  out.write('data', 36)
  out.writeUInt32LE(dataSize, 40)
  signal.forEach((v, i) => out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2))
  return out
}

function referencedSamplePaths() {
  const paths = new Set()
  const genresDir = join(ROOT, 'app', 'genres')
  for (const file of readdirSync(genresDir, { recursive: true })) {
    if (!file.endsWith('.ts')) continue
    const source = readFileSync(join(genresDir, file), 'utf8')
    for (const [, path] of source.matchAll(/'(\/audio\/[^']+\.wav)'/g)) paths.add(path)
  }
  return paths
}

const referenced = referencedSamplePaths()
const missing = [...referenced].filter((path) => !generators[path])
if (missing.length > 0) {
  console.error(`No generator for: ${missing.join(', ')}`)
  process.exit(1)
}

let totalBytes = 0
const synthesized = []
for (const path of referenced) {
  const recording = recordings[path]
  const source = recording && findRecording(recording)
  let wav
  let detail = ''
  if (source) {
    const slice = recording.voice ? sliceWord : recording.midi ? sliceNote : sliceRecording
    const { rate, signal, tuning } = slice(source, recording)
    wav = encodeWav(finalize(signal), rate)
    if (tuning !== undefined) detail = `  retuned ${tuning >= 0 ? '+' : ''}${Math.round(tuning * 100)} cents`
  } else {
    wav = encodeWav(finalize(generators[path]()))
    synthesized.push(path)
  }
  const target = join(ROOT, 'public', path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, wav)
  totalBytes += wav.length
  console.log(`${path}  ${source ? 'recording' : 'synth    '}  ${(wav.length / 1024).toFixed(1)} KB${detail}`)
}
console.log(`\n${referenced.size} samples, ${(totalBytes / 1024).toFixed(0)} KB total`)

const missingDownloads = [...new Set(synthesized.map((path) => recordings[path]?.freesound).filter(Boolean))]
if (missingDownloads.length > 0) {
  console.log('\nStill synthesized — download these (CC0) into audio-sources/freesound/ and re-run:')
  for (const id of missingDownloads) console.log(`  https://freesound.org/s/${id}/`)
}
