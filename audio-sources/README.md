# Audio sources

Raw recordings that `npm run samples` trims into `public/audio/**`. The
mapping from each app sample to its source lives in `recordings` in
`scripts/generate-samples.mjs`. Every file here is **CC0** or public domain
(no attribution required, credits below are a courtesy), except the
University of Iowa guitar, which is free to use under the university's own
terms — see [uiowa/](#uiowa).

Any sample whose source is missing is synthesized instead.

## vcsl/

From the [Versilian Community Sample Library](https://github.com/sgossner/VCSL)
by Versilian Studios (CC0 1.0). Used for clave, congas, bongos, cowbell,
maracas (small shaker) and güiro.

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

## freesound/

Download each sound from its page (requires a free freesound.org account)
and drop it here **without renaming** — the script matches on the leading
sound ID.

| App sample | Sound | Author |
|---|---|---|
| salsa/timbales/low | [Timbales Low (Hembra)](https://freesound.org/people/Sassaby/sounds/533094/) | Sassaby |
| salsa/timbales/high | [Timbales - High (Macho)](https://freesound.org/people/Sassaby/sounds/533095/) | Sassaby |
| salsa/timbales/rim | [Timbales High Rimshot (Macho)](https://freesound.org/people/Sassaby/sounds/533089/) | Sassaby |
| bachata/bass/a2 | [bass A2](https://freesound.org/people/mat_the_glad/sounds/43938/) | mat_the_glad |

All of these were checked as CC0 on their sound pages (October 2026).

No longer used: `44573__uiop__guiro114bpm4bars` (replaced by the Wikimedia
güira); `8393__speedy__clean_e1st_str_pick` and `8403__speedy__clean_g_str_pluck`
(single guitar notes, replaced by the Iowa guitar).
