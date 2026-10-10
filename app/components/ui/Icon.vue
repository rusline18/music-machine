<script setup lang="ts">
import { INSTRUMENT_MOTION, stringFrames } from '~/core/motion'
import { ICON_ACCENTS, ICONS } from '~/icons'

const props = withDefaults(defineProps<{
  /** A key of ICONS: an instrument id or a control name. */
  name: string
  /** Draw the accent layer in the genre's color; false = same color as the lines (muted, dimmed). */
  accent?: boolean
}>(), { accent: true })

/** Looked up once so the template can narrow it: a lookup indexed by a prop doesn't narrow. */
const layer = computed(() => ICON_ACCENTS[props.name])

/** Unique per icon: the gap's mask is looked up by id. */
const maskId = useId()

/** Each string at rest and, when the instrument has a strum, its vibration (started by useBeatEffects). */
const strings = computed(() => {
  const motion = INSTRUMENT_MOTION[props.name]
  return layer.value?.strings?.map((string, i) => {
    const [x, top, bottom] = string
    return {
      d: `M${x} ${top}Q${x} ${(top + bottom) / 2} ${x} ${bottom}`,
      values: motion?.strum ? stringFrames(motion.strum, string, i, motion.duration) : undefined,
      dur: `${motion?.duration ?? 0}ms`,
    }
  })
})
</script>

<template>
  <svg
    v-if="ICONS[name]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="size-5 shrink-0"
  >
    <!-- The gap: the line layer is cut where the raised accent crosses it. -->
    <mask
      v-if="layer?.gap"
      :id="maskId"
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="24"
      height="24"
    >
      <rect
        width="24"
        height="24"
        fill="white"
      />
      <g class="icon-gap">
        <path
          v-for="(d, i) in layer.gap"
          :key="i"
          :d="d"
          stroke="black"
          stroke-width="4.2"
        />
      </g>
    </mask>
    <!-- In a group of its own so it can move against the accent (the held clave). -->
    <g
      class="icon-base"
      :mask="layer?.gap ? `url(#${maskId})` : undefined"
    >
      <path
        v-for="(d, i) in ICONS[name]"
        :key="i"
        :d="d"
      />
    </g>
    <!-- Fill paths get a thin stroke: at 1.75 the sound holes and the
         piano's keys close up. -->
    <g
      v-if="layer"
      class="icon-accent"
      :class="accent ? 'text-accent-400' : ''"
    >
      <path
        v-for="(d, i) in layer.fill"
        :key="`f${i}`"
        :d="d"
        fill="currentColor"
        fill-rule="evenodd"
        stroke-width="1"
      />
      <path
        v-for="(d, i) in layer.line"
        :key="`l${i}`"
        :d="d"
      />
      <!-- Strings over the body: a dark edge so they show on the body and
           over the sound hole alike, then the string itself. -->
      <g
        v-if="strings"
        class="icon-strings"
      >
        <template
          v-for="(string, i) in strings"
          :key="i"
        >
          <path
            :d="string.d"
            class="text-neutral-950"
            stroke-width="1.5"
          >
            <animate
              v-if="string.values"
              attributeName="d"
              :values="string.values"
              :dur="string.dur"
              begin="indefinite"
            />
          </path>
          <path
            :d="string.d"
            :class="accent ? 'text-neutral-100' : ''"
            stroke-width="0.7"
          >
            <animate
              v-if="string.values"
              attributeName="d"
              :values="string.values"
              :dur="string.dur"
              begin="indefinite"
            />
          </path>
        </template>
      </g>
    </g>
    <g
      v-if="layer?.spark"
      class="icon-spark"
      :class="accent ? 'text-accent-400' : ''"
      stroke-width="1.25"
    >
      <path
        v-for="(d, i) in layer.spark"
        :key="i"
        :d="d"
      />
    </g>
  </svg>
</template>
