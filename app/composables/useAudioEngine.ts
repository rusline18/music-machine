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

interface RingingVoice {
  source: AudioBufferSourceNode
  gain: GainNode
}

/**
 * Thin wrapper around the Web Audio API: one AudioContext, a master gain,
 * a per-instrument gain node, and a decoded-buffer cache keyed by sample URL.
 *
 * Client-only by construction (AudioContext doesn't exist during SSR) —
 * always call this from onMounted/a client-only component, never at module
 * top-level or in setup() render logic.
 */
export function useAudioEngine() {
  let ctx: AudioContext | null = null
  let masterGain: GainNode | null = null
  const instrumentGains = new Map<string, GainNode>()
  const bufferCache = new Map<string, AudioBuffer>()
  /** instrument → group → voices still sounding, for choking. */
  const ringing = new Map<string, Map<string, RingingVoice[]>>()

  function getContext(): AudioContext {
    if (!ctx) {
      ctx = new AudioContext()
      masterGain = ctx.createGain()
      masterGain.connect(ctx.destination)
    }
    return ctx
  }

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

  let reverbGain: GainNode | null = null

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
    if (context.state === 'suspended') {
      await context.resume()
    }
  }

  function getInstrumentGain(instrument: string): GainNode {
    const context = getContext()
    let gain = instrumentGains.get(instrument)
    if (!gain) {
      gain = context.createGain()
      gain.connect(masterGain!)
      instrumentGains.set(instrument, gain)
    }
    return gain
  }

  // Volume and mute are tracked separately so unmuting restores the
  // user's volume instead of resetting it, and a volume change while muted
  // doesn't accidentally unmute.
  const instrumentVolumes = new Map<string, number>()
  const mutedInstruments = new Set<string>()

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

  async function loadSample(url: string): Promise<AudioBuffer> {
    const cached = bufferCache.get(url)
    if (cached) return cached

    const context = getContext()
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await context.decodeAudioData(arrayBuffer)
    bufferCache.set(url, audioBuffer)
    return audioBuffer
  }

  async function preloadSamples(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => loadSample(url).catch((err) => {
      console.error(`Failed to load sample: ${url}`, err)
    })))
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

  function now(): number {
    return getContext().currentTime
  }

  function dispose() {
    instrumentGains.clear()
    instrumentVolumes.clear()
    mutedInstruments.clear()
    bufferCache.clear()
    ringing.clear()
    ctx?.close()
    ctx = null
    masterGain = null
    reverbGain = null
  }

  return {
    getContext,
    resume,
    setInstrumentVolume,
    setInstrumentMuted,
    loadSample,
    preloadSamples,
    playNote,
    setReverb,
    now,
    dispose,
  }
}
