import { COUNTING_MODES } from '~/core/resolve'
import { TEMPO_CHOICES } from '~/core/tempo'

/** The tempo and counting-voice choices, labelled in the UI language, for a SegmentedControl. */
export function useControlOptions() {
  const { t } = useI18n()
  return {
    tempoOptions: computed(() => TEMPO_CHOICES.map((choice) => ({ value: choice, label: t(`controls.tempo.${choice}`) }))),
    countingOptions: computed(() => COUNTING_MODES.map((mode) => ({ value: mode, label: t(`controls.counting.${mode}`) }))),
  }
}
