import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAudioEngine } from '../app/composables/useAudioEngine'

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

describe('useAudioEngine volume and mute', () => {
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
    const engine = useAudioEngine()
    engine.setInstrumentVolume('clave', 0.4)
    expect(instrumentGain()).toBe(0.4)
  })

  it('restores the previous volume on unmute', () => {
    const engine = useAudioEngine()
    engine.setInstrumentVolume('clave', 0.4)
    engine.setInstrumentMuted('clave', true)
    expect(instrumentGain()).toBe(0)
    engine.setInstrumentMuted('clave', false)
    expect(instrumentGain()).toBe(0.4)
  })

  it('keeps a muted track silent when its volume changes', () => {
    const engine = useAudioEngine()
    engine.setInstrumentMuted('clave', true)
    engine.setInstrumentVolume('clave', 0.7)
    expect(instrumentGain()).toBe(0)
    engine.setInstrumentMuted('clave', false)
    expect(instrumentGain()).toBe(0.7)
  })
})
