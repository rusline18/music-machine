<template>
  <!-- The count and the transport, always in reach: stuck to the bottom of
       the screen on a phone (under the thumb, readable from the floor), to
       the top on wider screens, so they stay in view while scrolling the
       grid. Sticky, not fixed: at the end of the page it settles above the
       footer instead of covering it. -->
  <div
    class="sticky z-20 -mx-6 border-neutral-800 bg-neutral-950/95 px-6 backdrop-blur max-sm:bottom-0 max-sm:border-t max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:pt-3 sm:top-0 sm:border-b sm:py-3"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <BeatCountDisplay class="sm:flex-1" />
      <slot />
    </div>
  </div>
</template>
