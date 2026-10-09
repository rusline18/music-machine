const STORAGE_KEY = 'silent-mode-hint-dismissed'

/** iPhone, iPod, or an iPad (which calls itself a Mac with a touch screen). */
function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

/**
 * iOS mutes Web Audio when the side switch is on silent. Safari 16.4+ is
 * told it's music (see the audio engine), older ones can't be: there the
 * first Play shows a one-time hint about the switch until it's dismissed.
 */
export function useSilentModeHint(playing: () => boolean) {
  const needed = ref(false)
  const dismissed = ref(false)

  onMounted(() => {
    try {
      dismissed.value = localStorage.getItem(STORAGE_KEY) === '1'
    } catch { /* storage blocked: show it once per visit */ }
    needed.value = isIos() && !('audioSession' in navigator)
  })

  const started = ref(false)
  watch(playing, (on) => {
    if (on) started.value = true
  })

  function dismiss() {
    dismissed.value = true
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch { /* not remembered, but hidden for this visit */ }
  }

  return reactive({
    shown: computed(() => needed.value && started.value && !dismissed.value),
    dismiss,
  })
}
