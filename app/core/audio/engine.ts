/** One sample playback, optionally pitch-shifted and shaped. */
export interface Note {
  url: string
  /** Seconds after the scheduled time. */
  delay?: number
  /** Playback speed; 2 = an octave up. */
  rate?: number
  gain?: number
  /** Fade the note out after this many seconds. */
  duration?: number
  /**
   * Starting a note stops the instrument's ringing notes in the same group
   * (a re-plucked string); '*' stops all of them (a palm mute).
   */
  group?: string
}

/**
 * Tone shaping on one instrument's output, for making a recorded
 * instrument sound like a related one: an EQ, plus an exciter that adds
 * the overtones the recording lacks (EQ can only boost what is there).
 */
export interface Tone {
  /** Cut below this frequency, Hz. */
  highpass?: number
  /** Peaking EQ bands; gain in dB. */
  peaks?: { frequency: number, gain: number, q: number }[]
  /** Boost (or cut) everything above `frequency`, in dB. */
  highShelf?: { frequency: number, gain: number }
  /**
   * Distorts the sound above `frequency` and mixes it back in at `mix`:
   * new high harmonics, the brightness of steel strings. `drive` is how
   * hard it's pushed.
   */
  exciter?: { frequency: number, drive: number, mix: number }
  /** Make-up gain for the level the EQ takes away. */
  gain?: number
}

/** Whether this browser plays Opus in WebM; older Safari doesn't. */
function canPlayOpus(): boolean {
  return typeof Audio !== 'undefined' && new Audio().canPlayType('audio/webm; codecs="opus"') !== ''
}

/**
 * Samples are named by their .wav, the lossless master; each has a ~5×
 * smaller Opus copy beside it (scripts/encode-samples.mjs). That's the file
 * to download when the browser can play Opus.
 */
export function playableFile(url: string): string {
  return url.endsWith('.wav') && canPlayOpus() ? `${url.slice(0, -'.wav'.length)}.webm` : url
}

interface RingingVoice {
  source: AudioBufferSourceNode
  gain: GainNode
}

export type AudioEngine = ReturnType<typeof createAudioEngine>

/**
 * A small room: decaying stereo noise that darkens as it fades, the usual
 * cheap stand-in for a recorded impulse response.
 */
function createRoomImpulse(context: AudioContext): AudioBuffer {
  const seconds = 1.6
  const length = Math.round(seconds * context.sampleRate)
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    let smoothed = 0
    for (let i = 0; i < length; i++) {
      const t = i / context.sampleRate
      const brightness = 0.6 * Math.exp(-t / 0.3) + 0.08
      smoothed += brightness * (Math.random() * 2 - 1 - smoothed)
      data[i] = smoothed * Math.exp(-t / 0.4)
    }
  }
  return impulse
}

/**
 * Thin wrapper around the Web Audio API: one AudioContext, a master gain,
 * a per-instrument gain node, and a decoded-buffer cache keyed by sample URL.
 *
 * The AudioContext is created lazily on first use, so creating the engine is
 * safe during SSR; only call its methods from the client (after a user
 * gesture, which browsers require to start audio).
 */
export function createAudioEngine() {
  let ctx: AudioContext | null = null
  let masterGain: GainNode | null = null
  let reverbGain: GainNode | null = null
  const instrumentGains = new Map<string, GainNode>()
  const instrumentTones = new Map<string, Tone>()
  const bufferCache = new Map<string, AudioBuffer>()
  /** instrument → group → voices still sounding, for choking. */
  const ringing = new Map<string, Map<string, RingingVoice[]>>()

  // Volume and mute are tracked separately so unmuting restores the
  // user's volume instead of resetting it, and a volume change while muted
  // doesn't accidentally unmute.
  const instrumentVolumes = new Map<string, number>()
  const mutedInstruments = new Set<string>()

  function getContext(): AudioContext {
    if (!ctx) {
      // Music, not a notification sound: on iOS (Safari 16.4+) it then plays
      // with the side switch on silent too.
      const { audioSession } = navigator as Navigator & { audioSession?: { type: string } }
      if (audioSession) audioSession.type = 'playback'
      ctx = new AudioContext()
      masterGain = ctx.createGain()
      masterGain.connect(ctx.destination)
    }
    return ctx
  }

  /** Wet level of the room reverb on the whole mix, 0–1. */
  function setReverb(amount: number) {
    if (!reverbGain) {
      if (amount <= 0) return
      const context = getContext()
      const convolver = context.createConvolver()
      convolver.buffer = createRoomImpulse(context)
      reverbGain = context.createGain()
      masterGain!.connect(convolver)
      convolver.connect(reverbGain)
      reverbGain.connect(context.destination)
    }
    reverbGain.gain.value = amount
  }

  async function resume() {
    const context = getContext()
    if (context.state === 'suspended') await context.resume()
  }

  function getInstrumentGain(instrument: string): GainNode {
    const context = getContext()
    let gain = instrumentGains.get(instrument)
    if (!gain) {
      gain = context.createGain()
      connectTone(context, gain, instrumentTones.get(instrument))
      instrumentGains.set(instrument, gain)
    }
    return gain
  }

  /** Route an instrument's gain to the master through its tone, if it has one. */
  function connectTone(context: AudioContext, input: GainNode, tone: Tone | undefined) {
    let last: AudioNode = input
    if (tone?.gain !== undefined) {
      const makeUp = context.createGain()
      makeUp.gain.value = tone.gain
      last.connect(makeUp)
      last = makeUp
    }
    const filter = (type: BiquadFilterType, frequency: number, { gain = 0, q = Math.SQRT1_2 } = {}) => {
      const node = context.createBiquadFilter()
      node.type = type
      node.frequency.value = frequency
      node.gain.value = gain
      node.Q.value = q
      last.connect(node)
      last = node
    }
    if (tone?.highpass) filter('highpass', tone.highpass)
    for (const { frequency, gain, q } of tone?.peaks ?? []) filter('peaking', frequency, { gain, q })
    if (tone?.highShelf) filter('highshelf', tone.highShelf.frequency, { gain: tone.highShelf.gain })
    last.connect(masterGain!)

    if (!tone?.exciter) return
    const { frequency, drive, mix } = tone.exciter
    const band = context.createBiquadFilter()
    band.type = 'highpass'
    band.frequency.value = frequency
    const shaper = context.createWaveShaper()
    const curve = new Float32Array(1024)
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(drive * ((i / (curve.length - 1)) * 2 - 1)) / Math.tanh(drive)
    shaper.curve = curve
    shaper.oversample = '2x'
    const wet = context.createGain()
    wet.gain.value = mix
    last.connect(band)
    band.connect(shaper)
    shaper.connect(wet)
    wet.connect(masterGain!)
  }

  /** Shape an instrument's sound; set it before the instrument first plays or changes volume. */
  function setInstrumentTone(instrument: string, tone: Tone) {
    instrumentTones.set(instrument, tone)
  }

  function applyInstrumentGain(instrument: string) {
    const volume = instrumentVolumes.get(instrument) ?? 1
    getInstrumentGain(instrument).gain.value = mutedInstruments.has(instrument) ? 0 : volume
  }

  function setInstrumentVolume(instrument: string, volume: number) {
    instrumentVolumes.set(instrument, volume)
    applyInstrumentGain(instrument)
  }

  function setInstrumentMuted(instrument: string, muted: boolean) {
    if (muted) mutedInstruments.add(instrument)
    else mutedInstruments.delete(instrument)
    applyInstrumentGain(instrument)
  }

  /**
   * Downloaded but not yet decoded bytes, by file URL. Downloading needs no
   * AudioContext, so samples can be fetched before the first click.
   */
  const downloads = new Map<string, Promise<ArrayBuffer>>()
  /** Samples being decoded, so two callers never load the same one twice. */
  const decoding = new Map<string, Promise<AudioBuffer>>()

  function download(file: string): Promise<ArrayBuffer> {
    let bytes = downloads.get(file)
    if (!bytes) {
      bytes = fetch(file).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${file}`)
        return response.arrayBuffer()
      })
      downloads.set(file, bytes)
      // A failed download is retried by the next load instead of sticking.
      bytes.catch(() => downloads.delete(file))
    }
    return bytes
  }

  async function decode(file: string): Promise<AudioBuffer> {
    const bytes = await download(file)
    // decodeAudioData takes over (detaches) the bytes; they can't be decoded twice.
    downloads.delete(file)
    return getContext().decodeAudioData(bytes)
  }

  /** The Opus copy where the browser plays Opus, else (or if it won't decode) the WAV. */
  async function decodeSample(url: string): Promise<AudioBuffer> {
    const file = playableFile(url)
    if (file !== url) {
      try {
        return await decode(file)
      } catch (err) {
        console.warn(`Falling back to WAV for ${url}`, err)
      }
    }
    return decode(url)
  }

  async function loadSample(url: string): Promise<AudioBuffer> {
    const cached = bufferCache.get(url)
    if (cached) return cached

    let pending = decoding.get(url)
    if (!pending) {
      pending = decodeSample(url).finally(() => decoding.delete(url))
      decoding.set(url, pending)
    }
    const audioBuffer = await pending
    bufferCache.set(url, audioBuffer)
    return audioBuffer
  }

  /**
   * Start downloading samples without decoding them; ones already decoded
   * count as done. Calls `onSettled` once per sample when its download
   * finishes or fails (loadSample retries those).
   */
  function prefetchSamples(urls: string[], onSettled?: (url: string, ok: boolean) => void): Promise<void> {
    return Promise.all(urls.map((url) => (bufferCache.has(url) ? Promise.resolve() : download(playableFile(url))).then(
      () => onSettled?.(url, true),
      () => onSettled?.(url, false),
    ))).then(() => {})
  }

  /** Download and decode samples; resolves with the URLs that failed to load. */
  async function preloadSamples(urls: Iterable<string>): Promise<string[]> {
    const failed: string[] = []
    await Promise.all([...urls].map((url) => loadSample(url).catch((err) => {
      console.error(`Failed to load sample: ${url}`, err)
      failed.push(url)
    })))
    return failed
  }

  function fadeOut(voice: RingingVoice, time: number) {
    voice.gain.gain.setTargetAtTime(0, time, 0.008)
    voice.source.stop(time + 0.1)
  }

  function choke(instrument: string, group: string, time: number) {
    const groups = ringing.get(instrument)
    if (!groups) return
    for (const [key, voices] of groups) {
      if (group !== '*' && key !== group) continue
      for (const voice of voices) fadeOut(voice, time)
      groups.delete(key)
    }
  }

  /**
   * Schedule a note to play at a precise AudioContext time (not
   * setTimeout — the scheduler is responsible for lookahead timing).
   */
  function playNote(instrument: string, note: Note, time: number) {
    const buffer = bufferCache.get(note.url)
    if (!buffer) {
      console.warn(`Sample not loaded, skipping: ${note.url}`)
      return
    }
    const context = getContext()
    const start = time + (note.delay ?? 0)
    if (note.group) choke(instrument, note.group, start)

    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = note.rate ?? 1
    const gain = context.createGain()
    gain.gain.value = note.gain ?? 1
    source.connect(gain)
    gain.connect(getInstrumentGain(instrument))
    source.start(start)

    const voice = { source, gain }
    if (note.duration !== undefined) fadeOut(voice, start + note.duration)
    if (!note.group) return
    const groups = ringing.get(instrument) ?? new Map<string, RingingVoice[]>()
    ringing.set(instrument, groups)
    const voices = groups.get(note.group) ?? []
    groups.set(note.group, voices)
    voices.push(voice)
    source.onended = () => {
      const index = voices.indexOf(voice)
      if (index !== -1) voices.splice(index, 1)
    }
  }

  /** Current AudioContext time in seconds. */
  function now(): number {
    return getContext().currentTime
  }

  /** Seconds between a sample being scheduled and it leaving the speakers (0 where unknown). */
  function outputLatency(): number {
    const context = getContext()
    return (context.baseLatency || 0) + (context.outputLatency || 0)
  }

  function dispose() {
    instrumentGains.clear()
    instrumentTones.clear()
    instrumentVolumes.clear()
    mutedInstruments.clear()
    bufferCache.clear()
    downloads.clear()
    decoding.clear()
    ringing.clear()
    ctx?.close()
    ctx = null
    masterGain = null
    reverbGain = null
  }

  return {
    resume,
    setInstrumentVolume,
    setInstrumentMuted,
    setInstrumentTone,
    prefetchSamples,
    loadSample,
    preloadSamples,
    playNote,
    setReverb,
    now,
    outputLatency,
    dispose,
  }
}
