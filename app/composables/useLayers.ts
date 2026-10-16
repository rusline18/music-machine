import { layerOrder } from '~/core/layers'
import type { Pattern } from '~/core/pattern'
import type { Genre } from '~/genres'

interface LayerControls {
  /** The counting voice, left as it is: it has its own switch. */
  voiceInstrument: string | undefined
  isPlaying: Readonly<Ref<boolean>>
  play: () => void
  setMuted: (instrument: string, muted: boolean) => void
}

/**
 * "Build it layer by layer": the band starts with the genre's foundation
 * instrument alone and brings the others in one at a time, in the genre's
 * `teachingOrder`.
 */
export function useLayers(genre: Genre, pattern: Ref<Pattern>, { voiceInstrument, isPlaying, play, setMuted }: LayerControls) {
  /** The instruments to bring in, and how many are in so far. Null when the guide isn't running. */
  const layers = ref<{ order: string[], added: number } | null>(null)

  /** Silences the band but the first instrument and starts playing. */
  function startLayers() {
    const order = layerOrder(pattern.value, genre.teachingOrder)
    if (order.length === 0) return
    for (const track of pattern.value.tracks) {
      if (track.instrument !== voiceInstrument) setMuted(track.instrument, track.instrument !== order[0])
    }
    layers.value = { order, added: 1 }
    if (!isPlaying.value) play()
  }

  function addLayer() {
    const next = layers.value?.order[layers.value.added]
    if (!next) return
    setMuted(next, false)
    layers.value!.added++
  }

  /** Ends the guide; with `addRest`, brings in every instrument it hadn't reached. */
  function endLayers(addRest: boolean) {
    if (addRest) for (const instrument of layers.value?.order ?? []) setMuted(instrument, false)
    layers.value = null
  }

  return { layers, startLayers, addLayer, endLayers }
}
