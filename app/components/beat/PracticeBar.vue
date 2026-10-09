<template>
  <!-- The count and the transport, always in reach: stuck to the bottom of
       the screen on a phone (under the thumb, readable from the floor), to
       the top on wider screens, so they stay in view while scrolling the
       grid. Sticky, not fixed: at the end of the page it settles above the
       footer instead of covering it. -->
  <div
    class="sticky z-20 border-neutral-800 bg-neutral-900/95 backdrop-blur max-sm:bottom-0 max-sm:-mx-4 max-sm:rounded-t-[1.75rem] max-sm:border-t max-sm:px-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:pt-3 sm:top-2 sm:rounded-3xl sm:border sm:px-5 sm:py-4"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
      <BeatCountDisplay class="sm:order-last sm:min-w-72 sm:flex-1" />
      <slot />
    </div>
  </div>
</template>
