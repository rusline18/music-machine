# Changelog

What's done. Plans: [docs/roadmap.md](docs/roadmap.md).

## 2026-10-09

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
