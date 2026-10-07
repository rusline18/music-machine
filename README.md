# Latin Beat Machine

Interactive Salsa & Bachata rhythm trainer — build a beat from real percussion
one-shots, practice it at your own tempo, and train your ear. See the project
plan for the full concept, sourcing, and roadmap.

**Stack:** Nuxt 4 (SSR on) + Vue 3 + TypeScript + Tailwind CSS + Web Audio API.

## Status

This is the Phase 1 foundation: project scaffold, pattern data model, a
Web Audio engine + lookahead scheduler, and Salsa/Bachata pages wired to a
shared beat-machine composable. **No audio samples are included yet** —
`public/audio/**` only has the folder layout. Dropping in samples requires
checking licensing first (see the project plan, sections 3 and 5); until
then the grids play silently (missing samples are skipped with a console
warning).

## Project structure

```
app/
  components/beat/     UI: BeatGrid, InstrumentTrack, Transport, BpmControl, PatternSelector
  composables/
    useAudioEngine.ts    AudioContext, gain nodes, sample loading/playback
    useBeatScheduler.ts  Lookahead scheduler — keeps BPM/timing sample-accurate
    usePattern.ts        Pattern/track data model + (de)serialization
    useBeatMachine.ts     Ties pattern + engine + scheduler together per genre
  data/
    salsa/, bachata/     Instrument sample maps + starter patterns (placeholders)
  pages/
    index.vue, salsa.vue, bachata.vue

public/audio/
  salsa/<instrument>/    One-shot .wav files go here (not included yet)
  bachata/<instrument>/
```

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm run preview
```

## Notes

- Audio only initializes client-side and only on user interaction (browsers
  require a user gesture to start an `AudioContext`) — pages still render
  fully server-side for SEO.
- The starter patterns in `app/data/*/patterns/basic.ts` are illustrative
  placeholders, not verified rhythms — see plan sections 7 and 14.
