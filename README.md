# Latin Beat Machine

Interactive Salsa & Bachata rhythm trainer — build a beat from real percussion
one-shots, practice it at your own tempo, and train your ear. Available in
English and Russian.

**Stack:** Nuxt 4 (SSR) + Vue 3 + TypeScript + Tailwind CSS + Web Audio API +
`@nuxtjs/i18n`.

## Architecture

Three layers, each depending only on the ones below it:

```
app/
  core/                Framework-free logic: no Vue, no Nuxt, unit-tested
    pattern.ts           Pattern model, preset builder (definePattern), chaining, resizing
    harmony.ts           Chords, chord tones, pitch-shifting notes onto recorded zones
    resolve.ts           Turns a step into the notes to play: samples, chord-following
                         notes, or the counting voice
    tempo.ts             Slow / Normal / Fast, relative to a preset's own tempo
    audio/
      engine.ts          AudioContext, per-instrument gain, sample cache, playback, reverb
      scheduler.ts       Lookahead scheduler — sample-accurate timing, live pattern edits
      humanize.ts        "Feel": small timing/volume/pitch variations
  genres/              Data: one folder per genre, plus the registry
    index.ts             `genres` list and `findGenre(id)`
    voice.ts             The counting voice shared by all genres (per language)
    types.ts             The `Genre` shape: instruments, samples, pitched, bpmRange, presets
    salsa/, bachata/
      samples.ts         Sample paths (read by `npm run samples`) and pitched instruments
      patterns.ts        Presets, written as repeating figures
      index.ts           The genre definition
  composables/
    useBeatMachine.ts    Vue state for one genre page: wires pattern + engine + scheduler
    useUiMode.ts         Simple / advanced mode, remembered in the browser
  components/
    beat/                BeatMachine (the whole trainer), BeatGrid, TrackRow,
                         Transport, PresetSelector
    ui/                  RangeControl, SegmentedControl, ControlLabel (icon + label
                         + tooltip), Tooltip, Icon
  icons.ts             Line icons as SVG paths, keyed by instrument id or control
    LanguageSwitcher.vue
  pages/
    index.vue            Home: one link per genre
    [genre].vue          Trainer page for any genre in the registry (404 otherwise)

i18n/locales/          en.json, ru.json — every user-visible string
public/audio/          Built one-shots (don't edit by hand — see below)
audio-sources/         Raw recordings + credits
scripts/
  generate-samples.mjs Builds public/audio from audio-sources, synth fallback
  speak-counts.py      Speaks the counts with espeak-ng into audio-sources/voice
tests/                 Vitest
docs/                  Plans
```

### Simple and advanced mode

The trainer opens in simple mode: pattern picker with a short description,
Slow / Normal / Fast, the counting voice, Play, and a grid where a click turns
a hit on or off (with the sound that track plays most). **Advanced features**
adds the BPM slider, loop length, feel, reverb, chords, volumes, the voice
track and every sound of each instrument. The mode only changes what's shown;
the pattern stays the same. Every instrument and control has an icon and a
tooltip (hover, tap or keyboard focus) explaining what it is for.

### Conventions

- **Ids, not labels, in data.** Genres, instruments, step names and presets are
  identified by ids; their display text lives in `i18n/locales/*.json` under
  `genres.<id>`, `instruments.<id>`, `steps.<name>` and `presets.<id>`.
  `tests/i18n.test.ts` fails if a locale is missing a key or one the data needs.
- **`core/` stays framework-free** so it can be tested without Nuxt. Anything
  that needs Vue reactivity or lifecycle goes in `composables/`.
- **Code style is enforced by ESLint** (`@nuxt/eslint`, configured under
  `eslint` in `nuxt.config.ts`) — no Prettier. CI runs lint, typecheck and
  tests on every pull request.
- **Components are auto-imported with their folder prefix**: `beat/TrackRow.vue`
  is `<BeatTrackRow>`, `ui/RangeControl.vue` is `<UiRangeControl>`.
  `npm run typecheck` (strict templates) catches a wrong name.

### Adding things

- **A language:** add `i18n/locales/<code>.json` (same keys as `en.json`) and
  an entry in `i18n.locales` in `nuxt.config.ts`.
- **A preset:** add a `definePattern({...})` to the genre's `patterns.ts`,
  list it in the genre's presets, and add its name (`presets.<id>`) and a
  one-line description for beginners (`help.presets.<id>`) to every locale.
- **An instrument:** besides its samples, give it a name
  (`instruments.<id>`), a tooltip (`help.instruments.<id>`) and an icon in
  `app/icons.ts` — a few strokes on a 24×24 grid. Tests fail if any is missing.
- **A genre:** add `app/genres/<id>/` like the existing ones, register it in
  `app/genres/index.ts`, and add its texts and an accent colour on the home
  page. The `/<id>` page then exists automatically.

## Setup

```bash
npm install
npm run dev        # http://localhost:3000 (Russian at /ru)
npm test           # unit tests
npm run typecheck  # TypeScript + Vue templates
npm run lint       # ESLint: bugs + code style (npm run lint:fix fixes most)
npm run build && npm run preview
```

For correct `hreflang` links in production, set the site's public URL:
`NUXT_PUBLIC_I18N_BASE_URL=https://example.com`.

## Audio samples

`public/audio/**` is built by `npm run samples`
(`scripts/generate-samples.mjs`). Each one-shot is trimmed from a free
recording in `audio-sources/` (CC0, except the University of Iowa guitar)
when that source is present, and synthesized otherwise — see
[audio-sources/README.md](audio-sources/README.md) for sources, licenses and
which Freesound and Iowa files to download. The list of files comes from the
paths quoted in `app/genres/**`; to change a sound, edit its entry in
`recordings` in the script and re-run.

## Counting voice

Every genre has a **Voice** track that counts the dance in the page's
language: a `count` step says the number of the count it falls on (1–8,
starting over each 8-count block), an `and` step says "and" / «и». The
**Voice** control switches it between off, "1 2 3…" and "1 & 2 &…"; cells
can also be edited one by one. Random and Clear leave it alone.

The current recordings are synthesized with espeak-ng
(`scripts/speak-counts.py`) and sound robotic. For a real voice, record each
word as a WAV — `1.wav` … `8.wav` and `and.wav` per language — into
`audio-sources/voice/<locale>/`, replacing the generated files, and run
`npm run samples`. Leading and trailing silence is trimmed automatically.
A new UI language needs its words added in `app/genres/voice.ts` and the
script.

## Notes

- Audio only starts client-side, on user interaction (browsers require a user
  gesture to start an `AudioContext`); pages still render fully server-side.
- Presets: Salsa verse/montuno in 3-2 son clave; Bachata derecho, majao and
  mambo; plus a chain of the first two of each. They follow documented
  references but still need sign-off from a player.
- Patterns are 8, 16, 24 or 32 dance counts long, shown as 8-count blocks.
  Each count is two cells ("1 &"); BPM is counts per minute.
