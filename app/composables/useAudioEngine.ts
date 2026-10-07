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

  function getContext(): AudioContext {
    if (!ctx) {
      ctx = new AudioContext()
      masterGain = ctx.createGain()
      masterGain.connect(ctx.destination)
    }
    return ctx
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

  /**
   * Schedule a sample to play at a precise AudioContext time (not
   * setTimeout — the scheduler is responsible for lookahead timing).
   */
  function playSample(instrument: string, url: string, time: number) {
    const buffer = bufferCache.get(url)
    if (!buffer) {
      console.warn(`Sample not loaded, skipping: ${url}`)
      return
    }
    const context = getContext()
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(getInstrumentGain(instrument))
    source.start(time)
  }

  function now(): number {
    return getContext().currentTime
  }

  function dispose() {
    instrumentGains.clear()
    instrumentVolumes.clear()
    mutedInstruments.clear()
    bufferCache.clear()
    ctx?.close()
    ctx = null
    masterGain = null
  }

  return {
    getContext,
    resume,
    setInstrumentVolume,
    setInstrumentMuted,
    loadSample,
    preloadSamples,
    playSample,
    now,
    dispose,
  }
}
