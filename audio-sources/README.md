# Audio sources

Raw recordings that `npm run samples` trims into `public/audio/**`. The
mapping from each app sample to its source lives in `recordings` in
`scripts/generate-samples.mjs`. Every file here is **CC0** or public domain
(no attribution required, credits below are a courtesy), except the
University of Iowa guitar, which is free to use under the university's own
terms — see [uiowa/](#uiowa) — and [voice/](#voice), synthesized for this
project.

Any sample whose source is missing is synthesized instead.

## vcsl/

From the [Versilian Community Sample Library](https://github.com/sgossner/VCSL)
by Versilian Studios (CC0 1.0). Used for clave, congas, bongos, both salsa
bells (bongo bell: `Cowbell1`, timbales bell: `Cowbell2`), maracas (small
shaker), güiro and the salsa piano.

The piano notes (`Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/`)
are ~14 MB, so they're **not committed** (`.gitignore`d) — only the 8 trimmed
notes in `public/audio/salsa/piano/` are. To rebuild those, put these files
from that folder into `audio-sources/vcsl/` (names unchanged):
`GrandPno_Main_Sus_{C3,E3,G3,B3,D4,F4,A4,C5}_v3_rr1.wav`. VCSL names its
notes an octave low — its "C3" sounds as C4 — and the script measures and
retunes each one, so the names in `public/` are the real pitches.

## uiowa/

Guitar notes for the bachata requinto and segunda (`bachata/guitar/*`): a
Raimundo 118 classical (nylon-string) guitar played by Brian Penkrot, from the
[University of Iowa Musical Instrument Samples](https://theremin.music.uiowa.edu/MISguitar.html).
The site states the recordings "may be downloaded and used for any projects,
without restrictions"; there's no formal license text such as CC0.

The files are ~117 MB, so they're **not committed** (`.gitignore`d) — only the
13 trimmed notes in `public/audio/bachata/guitar/` are. To rebuild those,
download these mono mf files into `audio-sources/uiowa/` (names unchanged)
from `https://theremin.music.uiowa.edu/sound%20files/MIS/Piano_Other/guitar/`:

- `Guitar.mf.sulE.E2B2.mono.aif`
- `Guitar.mf.sulA.C3B3.mono.aif`
- `Guitar.mf.sulG.G3B3.mono.aif`
- `Guitar.mf.sulB.C4B4.mono.aif`
- `Guitar.mf.sul_E.C5B5.mono.aif`

Each file is a slow chromatic run up one string; the script finds the wanted
note by pitch and retunes it exactly (the player's strings are 5–40 cents
flat) while resampling 96 kHz to 44.1 kHz. Without these files, `npm run
samples` synthesizes the guitar notes instead.

## wikimedia/

- `Guira_Tim_Ross.wav` (bachata/guira/short, long): metal güira by Tim Ross,
  [Güira.ogg](https://commons.wikimedia.org/wiki/File:G%C3%BCira.ogg) on
  Wikimedia Commons, public domain. Converted from Ogg Vorbis to WAV.

## voice/

Spoken counts for the counting voice, one word per file:
`<locale>/1.wav` … `8.wav` and `and.wav`. Generated with
[espeak-ng](https://github.com/espeak-ng/espeak-ng) by
`scripts/speak-counts.py` (the audio espeak-ng produces is not covered by
its GPL license). Placeholders — replace them with recordings of a real
person counting (same file names) for a much better result.

## freesound/

Download each sound from its page (requires a free freesound.org account)
and drop it here **without renaming** — the script matches on the leading
sound ID.

| App sample | Sound | Author |
|---|---|---|
| salsa/timbales/low | [Timbales Low (Hembra)](https://freesound.org/people/Sassaby/sounds/533094/) | Sassaby |
| salsa/timbales/high | [Timbales - High (Macho)](https://freesound.org/people/Sassaby/sounds/533095/) | Sassaby |
| salsa/timbales/rim | [Timbales High Rimshot (Macho)](https://freesound.org/people/Sassaby/sounds/533089/) | Sassaby |
| salsa/bass/a2, bachata/bass/a2 | [bass A2](https://freesound.org/people/mat_the_glad/sounds/43938/) | mat_the_glad |

All of these were checked as CC0 on their sound pages (October 2026).
