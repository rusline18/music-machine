import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useBeatMachine } from '~/composables/useBeatMachine'
import { sampleUrls } from '~/core/resolve'
import { findGenre } from '~/genres'

class FakeNode {
  gain = { value: 1, setTargetAtTime() {} }
  playbackRate = { value: 1 }
  buffer: unknown = null
  connect() {}
  start() {}
  stop() {}
}

const salsa = findGenre('salsa')!
const sampleCount = sampleUrls(salsa, 'en').size
const machineFor = () => useBeatMachine(salsa, ref('en'))

describe('useBeatMachine loading', () => {
  /** Resolves every pending download at once. */
  let release: () => void
  let downloadsFail: boolean

  beforeEach(() => {
    vi.useFakeTimers()
    downloadsFail = false
    let gate = Promise.withResolvers<void>()
    release = () => {
      gate.resolve()
      gate = Promise.withResolvers<void>()
    }
    vi.stubGlobal('fetch', async (url: string) => {
      await gate.promise
      if (downloadsFail) throw new TypeError('offline')
      return { ok: true, arrayBuffer: async () => url }
    })
    vi.stubGlobal('AudioContext', class {
      state = 'running'
      currentTime = 0
      destination = {}
      createGain = () => new FakeNode()
      createBufferSource = () => new FakeNode()
      createConvolver = () => new FakeNode()
      createBuffer = () => ({ getChannelData: () => new Float32Array(1) })
      sampleRate = 8
      async resume() {}
      async decodeAudioData(data: string) {
        return { from: data }
      }

      close() {}
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows progress while Play waits for samples, then plays', async () => {
    const machine = machineFor()
    const playing = machine.play()
    expect(machine.isLoading.value).toBe(true)
    expect(machine.loadProgress.value).toBe(0)

    release()
    await playing
    expect(machine.loadProgress.value).toBe(1)
    expect(machine.isLoading.value).toBe(false)
    expect(machine.isPlaying.value).toBe(true)
    expect(machine.failedSamples.value).toBe(0)
    machine.stop()
  })

  it('does not start if Stop is pressed while loading', async () => {
    const machine = machineFor()
    const playing = machine.play()
    machine.stop()
    expect(machine.isLoading.value).toBe(false)

    release()
    await playing
    expect(machine.isPlaying.value).toBe(false)
  })

  it('reports samples that failed and retries them on the next Play', async () => {
    const machine = machineFor()
    downloadsFail = true
    const first = machine.play()
    release()
    await first
    expect(machine.failedSamples.value).toBe(sampleCount)
    // Nothing loaded, so there's nothing to play.
    expect(machine.isPlaying.value).toBe(false)

    downloadsFail = false
    const second = machine.play()
    expect(machine.isLoading.value).toBe(true)
    release()
    await second
    expect(machine.failedSamples.value).toBe(0)
    expect(machine.isPlaying.value).toBe(true)
    machine.stop()
  })
})
