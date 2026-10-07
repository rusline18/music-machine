# Latin Beat Machine

Interactive Salsa & Bachata rhythm trainer — build a beat from real percussion
one-shots, practice it at your own tempo, and train your ear. See the project
plan for the full concept, sourcing, and roadmap.

**Stack:** Nuxt 4 (SSR on) + Vue 3 + TypeScript + Tailwind CSS + Web Audio API.

## Status

This is the Phase 1 foundation: project scaffold, pattern data model, a
Web Audio engine + lookahead scheduler, and Salsa/Bachata pages wired to a
shared beat-machine composable.

`public/audio/**` is built by `npm run samples`
(`scripts/generate-samples.mjs`). Each one-shot is trimmed from a CC0
recording in `audio-sources/` when that source is present, and synthesized
otherwise — see [audio-sources/README.md](audio-sources/README.md) for
sources and which Freesound files to download. To change a sound, edit its
entry in `recordings` and re-run; don't hand-edit `public/audio`, since the
script overwrites it.

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
  salsa/<instrument>/    One-shot .wav files (built — don't edit by hand)
  bachata/<instrument>/

audio-sources/           Raw CC0 recordings (VCSL, Freesound) + credits

scripts/
  generate-samples.mjs   Builds public/audio from recordings, synth fallback
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
- Presets: Salsa verse/montuno in 3-2 son clave, Bachata derecho/majao.
  They follow documented references but still need sign-off from a player
  — see plan sections 7 and 14.
- The Salsa grid is eighth notes across a two-bar clave cycle, so its BPM
  is in half notes (90 ≈ 180 quarter-note BPM). Bachata's grid is one bar of
  sixteenths, BPM in quarter notes.
