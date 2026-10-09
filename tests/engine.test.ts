import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioEngine } from '~/core/audio/engine'

class FakeGain {
  gain = { value: 1 }
  connect() {}
}

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  createGain() {
    return new FakeGain()
  }

  close() {}
}

describe('audio engine volume and mute', () => {
  let gains: FakeGain[]

  beforeEach(() => {
    gains = []
    vi.stubGlobal('AudioContext', class extends FakeAudioContext {
      override createGain() {
        const gain = new FakeGain()
        gains.push(gain)
        return gain
      }
    })
  })

  // gains[0] is the master gain; the first instrument touched gets gains[1].
  const instrumentGain = () => gains[1]!.gain.value

  it('applies the track volume', () => {
    const engine = createAudioEngine()
    engine.setInstrumentVolume('clave', 0.4)
    expect(instrumentGain()).toBe(0.4)
  })

  it('restores the previous volume on unmute', () => {
    const engine = createAudioEngine()
    engine.setInstrumentVolume('clave', 0.4)
    engine.setInstrumentMuted('clave', true)
    expect(instrumentGain()).toBe(0)
    engine.setInstrumentMuted('clave', false)
    expect(instrumentGain()).toBe(0.4)
  })

  it('keeps a muted track silent when its volume changes', () => {
    const engine = createAudioEngine()
    engine.setInstrumentMuted('clave', true)
    engine.setInstrumentVolume('clave', 0.7)
    expect(instrumentGain()).toBe(0)
    engine.setInstrumentMuted('clave', false)
    expect(instrumentGain()).toBe(0.7)
  })
})

describe('audio engine tone', () => {
  /** Every node, with what it was connected to. */
  let nodes: { kind: string, type?: string, targets: unknown[] }[]

  beforeEach(() => {
    nodes = []
    const node = (kind: string) => {
      const n = {
        kind,
        type: undefined as string | undefined,
        targets: [] as unknown[],
        gain: { value: 1 },
        frequency: { value: 0 },
        Q: { value: 0 },
        curve: null as Float32Array | null,
        oversample: 'none',
        connect(target: unknown) {
          n.targets.push(target)
        },
      }
      nodes.push(n)
      return n
    }
    vi.stubGlobal('AudioContext', class extends FakeAudioContext {
      override createGain() {
        return node('gain') as unknown as FakeGain
      }

      createBiquadFilter() {
        return node('filter')
      }

      createWaveShaper() {
        return node('shaper')
      }
    })
  })

  it('routes an instrument through its EQ and exciter to the master', () => {
    const engine = createAudioEngine()
    engine.setInstrumentTone('tres', {
      highpass: 180,
      peaks: [{ frequency: 400, gain: -5, q: 1 }],
      exciter: { frequency: 1800, drive: 4, mix: 0.25 },
    })
    engine.setInstrumentVolume('tres', 0.5)
    const [master, instrument, highpass, peak, band, shaper, wet] = nodes
    expect(instrument!.targets).toEqual([highpass])
    expect(highpass!.type).toBe('highpass')
    expect(highpass!.targets).toEqual([peak])
    expect(peak!.type).toBe('peaking')
    // Dry to the master, and through the exciter in parallel.
    expect(peak!.targets).toEqual([master, band])
    expect(band!.targets).toEqual([shaper])
    expect(shaper!.targets).toEqual([wet])
    expect(wet!.targets).toEqual([master])
  })

  it('connects instruments without a tone straight to the master', () => {
    const engine = createAudioEngine()
    engine.setInstrumentVolume('clave', 1)
    expect(nodes[1]!.targets).toEqual([nodes[0]])
    expect(nodes).toHaveLength(2)
  })
})

describe('audio engine sample loading', () => {
  /** URLs that decode; anything else fails like an unsupported codec. */
  let decodable: Set<string>
  let fetched: string[]

  beforeEach(() => {
    fetched = []
    decodable = new Set(['/a.webm', '/a.wav'])
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url)
      if (url.startsWith('/missing')) return { ok: false, status: 404 }
      return { ok: true, arrayBuffer: async () => url }
    })
    vi.stubGlobal('AudioContext', class extends FakeAudioContext {
      async decodeAudioData(data: string) {
        if (!decodable.has(data)) throw new Error(`can't decode ${data}`)
        return { from: data }
      }
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => vi.unstubAllGlobals())

  function playsOpus(answer: string) {
    vi.stubGlobal('Audio', class {
      canPlayType = () => answer
    })
  }

  it('downloads the Opus copy when the browser plays Opus', async () => {
    playsOpus('probably')
    const buffer = await createAudioEngine().loadSample('/a.wav')
    expect(buffer).toEqual({ from: '/a.webm' })
    expect(fetched).toEqual(['/a.webm'])
  })

  it('downloads only the WAV when the browser does not play Opus', async () => {
    playsOpus('')
    const buffer = await createAudioEngine().loadSample('/a.wav')
    expect(buffer).toEqual({ from: '/a.wav' })
    expect(fetched).toEqual(['/a.wav'])
  })

  it('falls back to the WAV when the Opus copy fails to decode', async () => {
    playsOpus('maybe')
    decodable.delete('/a.webm')
    const buffer = await createAudioEngine().loadSample('/a.wav')
    expect(buffer).toEqual({ from: '/a.wav' })
    expect(fetched).toEqual(['/a.webm', '/a.wav'])
  })

  it('caches by the WAV name', async () => {
    playsOpus('probably')
    const engine = createAudioEngine()
    await engine.loadSample('/a.wav')
    await engine.loadSample('/a.wav')
    expect(fetched).toEqual(['/a.webm'])
  })

  it('reports a missing file instead of decoding the error page', async () => {
    playsOpus('')
    await expect(createAudioEngine().loadSample('/missing.wav')).rejects.toThrow('HTTP 404')
  })
})

describe('audio engine prefetching', () => {
  let fetched: string[]
  let failOnce: Set<string>

  beforeEach(() => {
    fetched = []
    failOnce = new Set()
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url)
      if (failOnce.delete(url)) throw new TypeError('network down')
      return { ok: true, arrayBuffer: async () => url }
    })
    vi.stubGlobal('Audio', class {
      canPlayType = () => 'probably'
    })
    vi.stubGlobal('AudioContext', class extends FakeAudioContext {
      static created = 0
      constructor() {
        super()
        ;(this.constructor as unknown as { created: number }).created++
      }

      async decodeAudioData(data: string) {
        return { from: data }
      }
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => vi.unstubAllGlobals())

  it('downloads without creating an AudioContext', async () => {
    const settled: Array<[string, boolean]> = []
    await createAudioEngine().prefetchSamples(['/a.wav', '/b.wav'], (url, ok) => settled.push([url, ok]))
    expect(fetched).toEqual(['/a.webm', '/b.webm'])
    expect(settled).toEqual([['/a.wav', true], ['/b.wav', true]])
    expect((globalThis.AudioContext as unknown as { created: number }).created).toBe(0)
  })

  it('decodes prefetched samples without downloading them again', async () => {
    const engine = createAudioEngine()
    await engine.prefetchSamples(['/a.wav'])
    expect(await engine.loadSample('/a.wav')).toEqual({ from: '/a.webm' })
    expect(fetched).toEqual(['/a.webm'])
  })

  it('does not download samples that are already decoded', async () => {
    const engine = createAudioEngine()
    await engine.loadSample('/a.wav')
    const settled: boolean[] = []
    await engine.prefetchSamples(['/a.wav'], (_url, ok) => settled.push(ok))
    expect(settled).toEqual([true])
    expect(fetched).toEqual(['/a.webm'])
  })

  it('shares one download between loads that overlap', async () => {
    const engine = createAudioEngine()
    const [first, second] = await Promise.all([engine.loadSample('/a.wav'), engine.loadSample('/a.wav'), engine.prefetchSamples(['/a.wav'])])
    expect(first).toBe(second)
    expect(fetched).toEqual(['/a.webm'])
  })

  it('retries a failed download on the next load', async () => {
    failOnce.add('/a.webm')
    failOnce.add('/a.wav')
    const engine = createAudioEngine()
    const settled: boolean[] = []
    await engine.prefetchSamples(['/a.wav'], (_url, ok) => settled.push(ok))
    expect(settled).toEqual([false])
    expect(await engine.preloadSamples(['/a.wav'])).toEqual([])
    expect(await engine.loadSample('/a.wav')).toEqual({ from: '/a.webm' })
  })

  it('reports what failed to load', async () => {
    failOnce.add('/a.webm')
    failOnce.add('/a.wav')
    expect(await createAudioEngine().preloadSamples(['/a.wav', '/b.wav'])).toEqual(['/a.wav'])
  })
})
