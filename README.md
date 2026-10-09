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
    tempo.ts             Slow / Normal / Fast, relative to a preset's own tempo; −/+ steps
    motion.ts            How each instrument's icon moves when it plays, and its
                         accent part on top
    layers.ts            Order for "layer by layer"
    links.ts             Checks configured external links (https only)
    share.ts             Pattern ⇄ short link code; incoming links are checked and rebuilt
    song.ts              Songs built from presets: which sections fit together (clave,
                         tempo, length) and joining them with a fill between sections
    sendLink.ts          Share sheet on touch screens, clipboard elsewhere
    audio/
      engine.ts          AudioContext, per-instrument gain, sample loading (Opus with
                         WAV fallback, prefetch before the first click), playback, reverb
      scheduler.ts       Lookahead scheduler — sample-accurate timing, live pattern edits
      playhead.ts        Hands each step over on the animation frame it's heard in
      prefetch.ts        Downloads a genre's sounds ahead of time (home page, offline)
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
    useNarrowScreen.ts   Phone-sized screen, for the one-bar-at-a-time grid
    useBeatEffects.ts    Playhead and beat animations, by toggling classes (no re-render)
    useBeatView.ts       Phone: practice view or grid editor
    useMotion.ts         Animation on/off (switch + prefers-reduced-motion)
    useWakeLock.ts       Keeps the screen on while playing
    useHotkeys.ts        Space, ←/→, 1–9
    useSilentModeHint.ts One-time hint about the iPhone silent switch (old iOS)
  components/
    beat/                BeatMachine (the whole trainer), BeatGrid, TrackRow,
                         CountDisplay, PracticeBar, Transport, TempoStepper,
                         InstrumentCards, LayerGuide, PresetSelector,
                         SongBuilder
    SiteFooter.vue       Feedback and donation links (hidden until configured)
    FeedbackDialog.vue   The feedback form
    ui/                  RangeControl, SegmentedControl, ControlLabel (icon + label
                         + tooltip), Tooltip, Icon, Sheet (modal / bottom sheet)
  plugins/
    service-worker.client.ts  Registers public/sw.js (production only)
  icons.ts             Line icons as SVG paths, keyed by instrument id or control;
                       instruments add an accent layer in the genre's color
    LanguageSwitcher.vue
  pages/
    index.vue            Home: one link per genre
    [genre].vue          Trainer page for any genre in the registry (404 otherwise)

server/                POST /api/feedback (rate-limited, off by default)
shared/feedback.ts     Feedback limits and validation, used by the form and the server
i18n/locales/          en.json, ru.json — every user-visible string
public/audio/          Built one-shots (don't edit by hand — see below)
public/sw.js           Offline: caches pages, scripts and sounds (see "Offline")
audio-sources/         Raw recordings + credits
scripts/
  generate-samples.mjs Builds public/audio from audio-sources, synth fallback
  encode-samples.mjs   Adds an Opus (.webm) copy of every WAV
  speak-counts.py      Speaks the counts with espeak-ng into audio-sources/voice
  app-icon.svg         The app icon; render-icons.mjs turns it into public/*.png
tests/                 Vitest unit tests
e2e/                   Playwright: pages, grid editing, transport, sharing in a real browser
deploy/                VPS setup: systemd unit, Caddyfile, setup and release scripts
docs/                  Roadmap, deploy guide and research notes
CHANGELOG.md           What's done
```

### Simple and advanced mode

The trainer opens in simple mode: pattern picker with a short description,
Slow / Normal / Fast, the counting voice, Play with a −/+ tempo stepper (tap:
1 BPM, hold: 5), and a grid where a click turns a hit on or off (with the
sound that track plays most); a long press or right-click on a cell picks the
sound from a menu. **Advanced features** adds loop length, feel, reverb,
chords, volumes and the voice track. The mode only changes what's shown;
the pattern stays the same. Every instrument and control has an icon and a
tooltip (hover, tap or keyboard focus) explaining what it is for.

Both modes have **Build it layer by layer** (starts from the genre's
foundation instrument and adds one at a time, in `teachingOrder` from the
genre definition) and a large 1–8 count display with 1 and 5 marked. The
count and Play/tempo stay in view: stuck to the top of the screen, or to the
bottom on a phone. Keys: Space plays/stops, ←/→ change the tempo, 1–9 switch
instruments. The screen stays on while playing (Wake Lock), and iOS plays
with the silent switch on.

A phone opens in a **practice** view: one big switch per instrument. **Edit
grid** shows the grid one bar (4 counts) at a time: swipe or the arrows turn
the bar, it follows the music unless **Follow** is off, and the instrument
icon opens a sheet with its volume.

Icons and the count move in time with the music (`useBeatEffects`, timed by
the audio clock); `prefers-reduced-motion` or the **Animation** switch turns
that off. Salsa is amber, bachata sky blue (CSS variables in `main.css`).

### Songs

**Build a song from sections** joins presets into one loop, up to 32 counts
(e.g. verse → verse → montuno). A loop has one clave and one tempo, so only
sections in the same clave and written within 20 BPM of every section
already in the song can be added; the others stay in the list, greyed out
with the reason ("other clave: son 2-3", "other tempo: 120 BPM"). In salsa
the timbales play a fill wherever the next section is a different one. Each
track plays at the volume of the loudest section it's in. A song is an
ordinary pattern with its sections listed, so it's edited, shared and saved
like any other (`app/core/song.ts`).

### Sharing and saving

**Share** sends a link like `/salsa?p=…` to the exact pattern: on a touch
screen through the system share menu, elsewhere it's copied. The link holds tempo, length,
mutes, volumes, chords and the voice. Each step is one letter, so a 32-count
pattern stays well under 2 KB. Opening a link loads the pattern and drops the
code from the address bar; anything decoded is checked against the genre and
rebuilt (`app/core/share.ts`). Edits are kept in the browser per genre
(an untouched preset isn't, so preset fixes reach everyone); **Reset** goes
back to the preset.

### Offline

In production `public/sw.js` caches every genre page in both languages with
its scripts on install, and every genre's sounds in the background, so the
trainer works in a hall with no signal; it can also be installed to a phone's
home screen (`public/manifest.webmanifest`; the icon is drawn in
`scripts/app-icon.svg`, and `node scripts/render-icons.mjs` renders the PNGs). Pages are network-first, so a
deploy shows up at once (the worker is registered as `/sw.js?v=<build id>`).
Sounds live in their own cache across deploys: after `npm run samples`, bump
`AUDIO_VERSION` in `sw.js`. Add new genre pages to `PAGES` there (a test
checks). The home page also starts downloading a genre's sounds when its link
is on screen or pointed at, so the genre page plays on the first tap.

### Feedback

A "Send feedback" link in the footer opens a form that posts to
`/api/feedback`. It's off until `NUXT_PUBLIC_FEEDBACK_ENABLED=true`. Feedback
is stored with Nitro storage (`.data/feedback` by default) and, if
`NUXT_FEEDBACK_WEBHOOK_URL` is set, also posted there; behind a reverse proxy
set `NUXT_FEEDBACK_TRUST_PROXY=true` so rate limits see real client IPs.
Production builds also send security headers (CSP and friends) and cache
`/audio/**` for a week — see `nuxt.config.ts`.

### Donations

A "Support the developer" link in the footer opens a donation page hosted by
a payment service (Boosty, Ko-fi, …). The app only links there: it has no
payment code, keys or server, and never sees card details. Set the link with
the `NUXT_PUBLIC_DONATE_URL` environment variable (https only); while it's
unset the link is hidden.

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
- **An instrument:** add it to the genre's `teachingOrder`, and besides its samples, give it a name
  (`instruments.<id>`), a tooltip (`help.instruments.<id>`) and an icon in
  `app/icons.ts` — a few strokes on a 24×24 grid, plus an accent part
  (`ICON_ACCENTS`) and its motion (`ACCENT_MOTION` in `app/core/motion.ts`).
  Tests fail if any is missing.
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

End-to-end tests run in Chromium against the production build (port 3000;
a server already listening there, e.g. `npm run dev`, is reused):

```bash
npx playwright install chromium   # once, downloads the browser
npm run test:e2e                  # builds the app and runs e2e/ against it
npm run test:e2e:ui               # interactive UI mode
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit and e2e tests on
every pull request and push to `main`; when e2e fails, download the
`playwright-report` artifact and open `index.html` to see traces.

For correct `hreflang` links in production, set the site's public URL:
`NUXT_PUBLIC_I18N_BASE_URL=https://example.com`.

## Deploy

The site runs on a VPS: Node behind Caddy (HTTPS). After CI passes on
`main`, `.github/workflows/deploy.yml` builds the app and ships it over SSH;
the server keeps the last 5 releases and rolls back if a new one doesn't
answer. One-time server setup and the GitHub secrets it needs:
[docs/deploy.md](docs/deploy.md).

## Audio samples

`public/audio/**` is built by `npm run samples`
(`scripts/generate-samples.mjs`). Each one-shot is trimmed from a free
recording in `audio-sources/` (CC0, except the University of Iowa guitar)
when that source is present, and synthesized otherwise — see
[audio-sources/README.md](audio-sources/README.md) for sources, licenses and
which Freesound and Iowa files to download. The list of files comes from the
paths quoted in `app/genres/**`; to change a sound, edit its entry in
`recordings` in the script and re-run.

The script then encodes every WAV to Opus (`.webm`, about 5× smaller) with
`scripts/encode-samples.mjs` — that needs ffmpeg with libopus, and runs on its
own as `npm run samples:encode`. The app downloads the `.webm` and falls back
to the WAV where the browser can't play Opus. A test fails if a WAV has no
`.webm` beside it: without it every load starts with a failed request.

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
- Presets: Salsa verse/montuno/mambo in 3-2 and 2-3 son clave, cha-cha-chá (2-3)
  and rumba guaguancó (3-2 rumba clave), with bass tumbao and piano montuno
  over C–G7 (both anticipate the next chord), a tres guajeo (played from
  the bachata guitar notes, each note doubled like a tres course) and, in
  the montuno, bongo and timbales bells and a brass moña (trumpets call,
  trombones answer), and a mambo where both brass sections play at once
  (a trombone riff, trumpets on the clave); Bachata derecho, majao and mambo over
  an Am–E loop. Every preset starts at
  8 counts. They follow documented references but still need sign-off from a
  player.
- What's next: [docs/roadmap.md](docs/roadmap.md); what's done:
  [CHANGELOG.md](CHANGELOG.md).
- Patterns are 8, 16, 24 or 32 dance counts long, shown as 8-count blocks.
  Each count is two cells ("1 &"); BPM is counts per minute.
