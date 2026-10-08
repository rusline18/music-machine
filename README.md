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
(`scripts/generate-samples.mjs`). Each one-shot is trimmed from a free
recording in `audio-sources/` (CC0, except the University of Iowa guitar)
when that source is present, and synthesized otherwise — see
[audio-sources/README.md](audio-sources/README.md) for sources, licenses and
which Freesound and Iowa files to download. To change a sound, edit its
entry in `recordings` and re-run; don't hand-edit `public/audio`, since the
script overwrites it.

Each WAV also gets an Opus copy (`.webm`, 128 kbps, ~5× smaller) from
`scripts/encode-samples.mjs`, which `npm run samples` runs at the end; it
needs `ffmpeg` with libopus. The app downloads the `.webm` and falls back to
the WAV only where the browser can't decode Opus. After touching WAVs some
other way, run `npm run samples:encode` to refresh the copies.

## Feedback

**Built but switched off** until it's decided where feedback should go. Set
`NUXT_PUBLIC_FEEDBACK_ENABLED=true` to show a **Send feedback** link in the
footer of every page (`app/components/FeedbackDialog.vue`); it posts to
`POST /api/feedback` (`server/api/feedback.post.ts`), which answers 404 while
the flag is off. Where feedback ends up is configuration, so it can change
without touching code:

- **Stored** in Nitro's `feedback` storage — by default JSON files under
  `.data/feedback/<date>/<id>.json` on the server. For hosts without a
  persistent disk (serverless, several instances) point `nitro.storage.feedback`
  in `nuxt.config.ts` at another [unstorage driver](https://unstorage.unjs.io/drivers)
  (Redis, S3, Cloudflare KV, …).
- **Forwarded** to a webhook if `NUXT_FEEDBACK_WEBHOOK_URL` is set. The JSON
  body has `text` (Slack), `content` (Discord, with pings disabled) and the
  full entry under `feedback`, so an incoming webhook or an automation tool
  (Zapier, Make, n8n → email, Telegram, GitHub issues) can take it as is.

Feedback counts as delivered if either one works. Each entry keeps the kind,
message, optional email, page path and browser user agent — no IP address.
The endpoint takes JSON only, at most 16 KB, 5 per client per 10 minutes and
200 per hour overall, and silently drops bots that fill a hidden honeypot
field. Behind a reverse proxy set `NUXT_FEEDBACK_TRUST_PROXY=true`, or every
visitor shares the proxy's rate limit. The API needs the Node server
(`nuxt build`); on a static `nuxt generate` site the dialog says feedback
isn't available.

## Project structure

```
app/
  components/beat/     UI: BeatGrid, InstrumentTrack, Transport, BpmControl, CountSelector, PatternSelector
  composables/
    useAudioEngine.ts    AudioContext, gain nodes, sample loading/playback
    useBeatScheduler.ts  Lookahead scheduler — keeps BPM/timing sample-accurate
    usePattern.ts        Pattern/track data model + (de)serialization
    useBeatMachine.ts     Ties pattern + engine + scheduler together per genre
  data/
    salsa/, bachata/     Instrument sample maps + preset patterns
  pages/
    index.vue, salsa.vue, bachata.vue
  components/FeedbackDialog.vue  "Send feedback" link + dialog in the footer

server/
  api/feedback.post.ts   Validates, rate-limits and delivers feedback
  feedback/              Delivery (storage + webhook) and the rate limiter
shared/feedback.ts       Feedback kinds, limits and validation (app + server)

public/audio/
  salsa/<instrument>/    One-shot .wav files (built — don't edit by hand)
  bachata/<instrument>/

audio-sources/           Raw recordings (VCSL, Freesound, Wikimedia, Iowa) + credits

scripts/
  generate-samples.mjs   Builds public/audio from recordings, synth fallback
  encode-samples.mjs     Opus (.webm) copies of the WAVs, what the app downloads

tests/                   Vitest: presets, pattern helpers, engine, scheduler
e2e/                     Playwright: pages, grid editing, transport in a real browser
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
```

Vitest covers preset integrity (lengths, sample names, files on disk), the
clave/bass reference rhythms, pattern helpers, volume/mute, and scheduler
timing. Audio output itself is checked by ear.

### End-to-end (Playwright)

```bash
npx playwright install chromium   # once, downloads the browser
npm run test:e2e                  # builds the app and runs e2e/ against it
npm run test:e2e:ui               # interactive UI mode
```

The tests run against the production build (`nuxt build`, port 3000). If a
server is already listening on 3000 (e.g. `npm run dev`), it is reused
instead.

## Notes

- Audio only initializes client-side and only on user interaction (browsers
  require a user gesture to start an `AudioContext`) — pages still render
  fully server-side for SEO.
- Presets: Salsa verse/montuno in 3-2 son clave, Bachata derecho/majao,
  plus 16-count chains of each pair. They follow documented references but still need sign-off from a player
  — see plan sections 7 and 14.
- Patterns are 8, 16, 24 or 32 dance counts long, shown as 8-count blocks.
  Each count is two cells ("1 &"); BPM is counts per minute.
