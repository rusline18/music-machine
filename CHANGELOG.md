# Changelog

What's done. Plans: [docs/roadmap.md](docs/roadmap.md).

## 2026-10-17

- In the Telegram Mini App the screen no longer zooms: pinch and
  double-tap zoom are off there, so the controls stay in view (and a
  focused field doesn't zoom in on iOS). The site in a browser can still
  be zoomed.

## 2026-10-16

- Smoother playback on slow phones: the instruments' icons only move
  where they can be seen. Each instrument has an icon in the practice
  cards and one on the grid, and a phone shows one view at a time, so
  every hit used to animate a hidden copy too (and rows scrolled away).
  Those motions are most of what a beat costs. With the CPU slowed 4×,
  the grid went from about 35 to about 48 frames a second, and with 6×
  from about 14 to about 29; the practice view from about 47 to 54.
- A held instrument icon (grid) or practice card fills from the bottom
  every time, not only until the long press is learnt; the "keep
  holding" bubble still goes once it is. The fill starts a moment in,
  so a tap doesn't flash it, and works with a mouse too.
- Salsa: the counting voice says "1 2 3, 5 6 7", keeping quiet on 4 and
  8 like dancers do (with "and" too: "1 and 2 and 3 and, 5 and…").
- Code: useBeatMachine split up — sound loading, saving the pattern
  (links, browser, Telegram cloud) and "layer by layer" each have their own
  composable; compression moved out of core/telegram.ts into
  core/compress.ts. Nothing changes for the user.
- Code: the long press of grid cells, instrument icons and practice cards
  is one composable (useLongPress / useHoldToOpen) instead of three
  copies; salsa's figures and instrument pages have their own files next
  to the presets.
- Tests: e2e tests that pick or click right after opening a page wait for
  it to be hydrated first (e2e/hydrated.ts). On a busy machine a click
  could land before the app took over and be lost, so the Telegram cloud
  and offline tests failed now and then.

## 2026-10-15

- Practice view on a phone: each instrument card has an ⓘ, and a long
  press on the card opens the instrument's sheet (description, its page,
  listen alone, volume) as on the grid; a tap still switches it. Opened
  by the ⓘ, the sheet tips that holding the card does the same.
- On a wider screen, an instrument's name on the grid opens its sheet,
  the same one a long press or right-click on its icon opens.
- Holding an instrument's icon on the grid, or its practice card, on a
  phone fills it and says "keep holding — the sheet opens"; letting go
  early mutes as before. Once a long press has opened a sheet, the hint
  (and the ⓘ's tip about it) is gone on this device.
- Instrument pages: "On its own" plays only the instrument (it used to
  bring the clave or the güira along).

## 2026-10-14

- Every instrument has a page now: in salsa also the timbales, maracas,
  bass, piano, tres, trumpets and trombones; in bachata the güira, bongos,
  campana, bass, requinto and segunda (derecho, majao and mambo where
  the part changes between them). The genre pages no longer list them at
  the bottom: they're reached from each instrument's sheet.

## 2026-10-13

- Pages for the clave (son 3-2, 2-3, rumba clave), the bongos (the
  martillo in the verse and in a bolero), the bongo bell, the timbales
  bell (mambo 3-2 and 2-3, cha-cha-chá) and the güiro (montuno,
  cha-cha-chá). Each rhythm plays over the preset it belongs to
  (`InstrumentVariant.band`): the 2-3 clave over the 2-3 verse, the bells
  over the montuno.
- Instrument pages, starting with the congas (`/salsa/congas`): what the
  instrument is, its strokes and what a dancer hears in it, with a small
  machine to play its rhythm — the full tumbao, or the strokes added one
  at a time (open tones, then the slap) — on its own or
  with the whole band, quieter. Linked from the instrument's sheet (a
  long press on its icon) and listed in `/sitemap.xml`. Rhythms and texts:
  `Genre.instrumentPages`, `instrumentPages.*` in i18n. Plan:
  docs/instrument-pages-plan.md, stage 1.
- Mini App: no more endless Telegram loading screen or black screen. The
  Telegram SDK is served from the site instead of telegram.org (slow or
  blocked for many users in Russia), and the loading screen is lifted as
  soon as the page is there, without waiting for the whole app.
- Mini App: tapping a genre no longer throws you back to the genre choice.
  Switching to Telegram's language waited for the SDK, and when it arrived
  while the genre was opening, it cancelled that and reopened the home
  page. The language and `startapp` links are now read from the launch
  address right away.
- Mini App: the bundled Telegram SDK is the current one from telegram.org
  (was the Bot API 8.0 copy).

## 2026-10-12

- Share sends short links, to the site (`/salsa?b=…`) and in Telegram:
  the pattern is packed as what changed from its preset, so an untouched
  preset takes 12 characters instead of ~340–790, and a few edits a couple
  dozen (`app/core/compactPattern.ts`). Links shared before still open.
- Links to the site show a proper preview card in Telegram, WhatsApp, VK
  and X: a picture per page and language (`node scripts/render-og.mjs`),
  title and description (Open Graph, Twitter cards). Search engines get
  `/sitemap.xml` with every page in both languages, a `robots.txt` that
  points to it, and a schema.org description of the app.
- Share answers in the button itself: it dips and fills with the genre's
  color, the link spins away into a check that draws itself, and the label
  turns to "Copied" before going back. No more text popping up beside it,
  and the button keeps its width, so nothing around it moves.
- After a stall (a background tab, a long pause) the beat picks up where
  it should be instead of playing every missed step at once.
- Opening shared links no longer fills the offline cache: a page is kept
  once, whatever pattern its link carries.
- The feedback rate limit counts an IPv6 sender by its /64 network, so
  rotating addresses doesn't get round it; its cleanup of idle senders no
  longer runs on every request when there are many.
- Inline scripts no longer run just for being inline: each page carries a
  one-off nonce that only Nuxt's own scripts get, and the CSP allows those
  alone. The smallest font subsets, which Vite inlines, are no longer
  blocked by it.
- With data saving on, the offline copy of every page isn't downloaded
  up front; pages are kept as they're visited.
- GitHub Actions are pinned to commit SHAs (Dependabot keeps them current).

## 2026-10-11

- The desktop grid no longer has a volume column in advanced mode: the
  cells get its room. A track's volume is set in the instrument's sheet,
  opened by holding or right-clicking its icon (the icon's tooltip says so).
  Phones keep their volume mode.

## 2026-10-10

- The claves strike instead of twitching: at rest the striker is raised
  (a gap shows the held stick passing under it); on the hit they meet,
  hold together for a moment with a spark where they cross, and the
  striker bounces off. The guitars, tres and bass get three strings over
  the body that are strummed one after another and ring out, slower and
  wider on the bass, quicker on the requinto.
- Salsa ↔ bachata straight from a genre page: the switch next to Back (now
  on phones too) slides its pill over to the genre picked while the page
  slides across toward it, like tabs (View Transitions API: stills of both
  pages animated on the compositor). The other genre's sounds start loading
  when its switch is pointed at or touched. Music that's playing fades out
  instead of cutting off, here and on the way home.
- Faster first Play: it waits only for the sounds the pattern uses (the rest
  load while it plays), and the room reverb is worked out while they load.
  Grid cells share one set of pointer listeners per row instead of eight
  each; the scheduler reads the pattern without Vue's reactive wrapper.
- Lighter playback: the playhead finds the cells and icons it lights up once
  and reuses them until the grid changes, instead of searching the page on
  every step; chords are parsed once, and step names and preset share codes
  are worked out once each. Shared `trackOf` lookup in place of copies.
- Dependabot: weekly PRs for npm packages (minor and patch bumps grouped
  into one, majors separately) and GitHub Actions.
- Instrument icons move like the instruments: a hit gives each part a kick,
  then it rings at its own pitch and dies away (skins ripple, bells swing
  and shimmer, maraca heads lag behind the handles, the scraper catches on
  the ridges), and fast runs build up instead of restarting. The claves are
  drawn crossed, and the striker falls onto the held stick and bounces off.

## 2026-10-09

- Two-tone instrument icons: neutral lines plus the part that sounds or
  strikes in the genre's color, moving on its own on every hit (the skin
  squashes, the stick strikes, the keys dip); flat and dim when muted. The
  guitars and bells got their own shapes: upright bass, teardrop tres,
  requinto with a cutaway, the timbale bell on its side.
- Salsa slowed to a social-dance tempo: verse and On2 165, montuno 170,
  mambo 175 (were 180–195); the bongo bell plays quarter notes (mouth on 1
  and 3, neck on 2 and 4) instead of every eighth.
- Song builder: join presets into one loop of up to 32 counts; only sections
  in the same clave and within 20 BPM can be added, the rest are greyed out
  with the reason; timbales fill between different sections. Replaces the
  fixed verse → montuno and derecho → majao chain presets.
- VPS deploy: setup script, systemd + Caddy, GitHub Actions with rollback.
- Salsa presets from existing sounds: On2 (voice counts 2 and 6, congas lead),
  son montuno, bolero (salsa tempo now starts at 60), pachanga.
- Share opens the system share menu on phones; computers still copy the link.
- Salsa rhythm section: timbales bell, bongo bell neck stroke, conga heel/toe,
  bass tumbao and piano montuno, timbales break, tres guajeo, brass moña
  (trumpets and trombones), Mambo 3-2 / 2-3 preset.
- Bachata presets checked against written breakdowns
  ([docs/bachata-rhythms.md](docs/bachata-rhythms.md)); real campana neck stroke.
- Phone UX: bottom bar, tempo −/+, instrument switches, bar-per-screen editor
  with swipes and sound menu, Wake Lock, iOS audio.
- Playhead on the audio clock via `requestAnimationFrame`; animation in time
  with the music, per-genre colors, reduced motion.
- PWA and offline: service worker caches pages and sounds, home page preloads
  a genre's sounds, app icon.

## 2026-10-08

- Pattern links (`?p=…`, validated on open), autosave in the browser, Reset.
- Salsa: verse/montuno in 3-2 and 2-3, cha-cha-chá, rumba guaguancó.
- Beginners: counting voice, simple mode, layer-by-layer lesson, tooltips;
  English and Russian.
- Bachata: chord-following guitars and bass, mambo with campana, new majao.
- Opus samples with WAV fallback (~5× smaller), early loading with progress.
- Security headers, audio `Cache-Control`, feedback dialog, donation link.
- ESLint, vue-tsc, Vitest, Playwright, GitHub Actions CI.

## 2026-10-07

- First version: salsa and bachata grids, CC0 samples with synth fallback,
  documented presets, 8-count blocks.
