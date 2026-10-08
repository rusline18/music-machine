# Latin Beat Machine

Interactive Salsa & Bachata rhythm trainer — build a beat from real percussion
one-shots, practice it at your own tempo, and train your ear. See the project
plan for the full concept, sourcing, and roadmap.

**Stack:** Nuxt 4 (SSR on) + Vue 3 + TypeScript + Tailwind CSS + Web Audio API.

## Status

This is the Phase 1 foundation: project scaffold, pattern data model, a
Web Audio engine + lookahead scheduler, and Salsa/Bachata pages wired to a
shared beat-machine composable. Salsa has verse/montuno in 3-2 and 2-3
clave, cha-cha-chá and rumba guaguancó; bachata has derecho, majao and
mambo. Patterns can be shared as a link and edits are kept in the browser.
What's next: [docs/roadmap.md](docs/roadmap.md).

`public/audio/**` is built by `npm run samples`
(`scripts/generate-samples.mjs`). Each one-shot is trimmed from a free
recording in `audio-sources/` (CC0, except the University of Iowa guitar)
when that source is present, and synthesized otherwise — see
[audio-sources/README.md](audio-sources/README.md) for sources, licenses and
which Freesound and Iowa files to download. To change a sound, edit its
entry in `recordings` and re-run; don't hand-edit `public/audio`, since the
script overwrites it.

## Project structure

```
app/
  components/beat/     UI: BeatGrid, InstrumentTrack, Transport, BpmControl, CountSelector, PatternSelector, ShareButton
  composables/
    useAudioEngine.ts    AudioContext, gain nodes, sample loading/playback
    useBeatScheduler.ts  Lookahead scheduler — keeps BPM/timing sample-accurate
    usePattern.ts        Pattern/track data model + (de)serialization
    useBeatMachine.ts     Ties pattern + engine + scheduler together per genre
  data/
    salsa/, bachata/     Instrument sample maps + preset patterns
    share.ts             Pattern ⇄ link code, with validation of incoming links
  pages/
    index.vue, salsa.vue, bachata.vue

public/audio/
  salsa/<instrument>/    One-shot .wav files (built — don't edit by hand)
  bachata/<instrument>/

audio-sources/           Raw recordings (VCSL, Freesound, Wikimedia, Iowa) + credits

scripts/
  generate-samples.mjs   Builds public/audio from recordings, synth fallback

tests/                   Vitest: presets, pattern helpers, engine, scheduler
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

## Tests

```bash
npm test
npm run typecheck
```

`typecheck` runs vue-tsc over the app, `.vue` files and the tests (strict,
with `noUncheckedIndexedAccess`). Vite strips types without checking them,
so a type error only shows up here.

Vitest covers share links (round-trip, tampered codes), preset integrity
(lengths, sample names, files on disk), the clave (son/rumba, 3-2/2-3) and
bass reference rhythms, pattern helpers, volume/mute, and scheduler timing. Audio output itself is checked by ear.

## Notes

- Audio only initializes client-side and only on user interaction (browsers
  require a user gesture to start an `AudioContext`) — pages still render
  fully server-side for SEO.
- Presets: Salsa verse/montuno in 3-2 son clave, Bachata derecho/majao,
  plus 16-count chains of each pair. They follow documented references but still need sign-off from a player
  — see plan sections 7 and 14.
- Patterns are 8, 16, 24 or 32 dance counts long, shown as 8-count blocks.
  Each count is two cells ("1 &"); BPM is counts per minute.
