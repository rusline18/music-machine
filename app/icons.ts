/**
 * Line icons on a 24×24 grid, drawn with `currentColor` strokes by
 * <UiIcon>. Each is a few SVG path strings, so all of them together stay a
 * few kilobytes: no icon font, no extra requests. Instrument icons are keyed
 * by instrument id (every genre's instruments need one — see
 * tests/icons.test.ts); the rest are for controls. An instrument icon is
 * two-tone: these neutral lines plus an accent layer (ICON_ACCENTS) in the
 * genre's color — the part that sounds or strikes, which moves on its own
 * on every hit.
 */
export const ICONS: Record<string, readonly string[]> = {
  // Instruments — the neutral line layer; the accent layer is in ICON_ACCENTS
  /** A speech bubble: the counting voice. */
  voice: ['M4 4h16v11H10l-4 4v-4H4z'],
  /** Two wooden sticks, crossed as they are played: the held one; the one that strikes is the accent. */
  clave: ['M3 18 19 8'],
  /** A tall barrel drum with a hoop; the skin is the accent. */
  congas: ['M7 4.5c-1.5 6-1.5 10.5 1 16.5h8c2.5-6 2.5-10.5 1-16.5', 'M6.2 12c3 1.2 8.6 1.2 11.6 0'],
  /** Two small drums joined in the middle, the second one larger. */
  bongos: ['M2.5 8v6.5c0 1 1.6 1.8 3.5 1.8s3.5-.8 3.5-1.8V8', 'M13 8.5v7c0 1.1 2 2 4.5 2s4.5-.9 4.5-2v-7', 'M9.5 12H13'],
  /** Two shallow drums on a stand. */
  timbales: ['M2 7v4h9V7', 'M13 7v4h9V7', 'M12 11v10M8 21h8'],
  /** A hand bell, mouth down; the mouth is the accent. */
  cowbell: ['M8.5 5h7L19 19H5z', 'M10.5 5V2.5h3V5'],
  /** The bell mounted on the timbales: on its side on a stand, mouth to the right. */
  timbalebell: ['M17 5 4 8.5v4L17 16', 'M10 14.2V21M6.5 21h7'],
  /** The bachata bell; the stick that strikes it is the accent. */
  campana: ['M9.5 3h7l3 13h-13z', 'M11.5 3V1.5h3V3'],
  /** Two shakers: the handles; the heads are the accent. */
  maracas: ['M8 11v10', 'M16.5 13.5V21'],
  /** A ridged gourd; the scraper is the accent. */
  guiro: ['M2 14c0-2.8 4-4.5 9-4.5s9 1.7 9 4.5-4 4.5-9 4.5-9-1.7-9-4.5z', 'M7 10.5v7M10 9.7v8.6M13 9.8v8.4M16 10.8v6.4'],
  /** A dotted metal cylinder; the fork that scrapes it is the accent. */
  guira: ['M5 4h9v16H5z', 'M8 8h.01M11 8h.01M8 12h.01M11 12h.01M8 16h.01M11 16h.01'],
  /** An upright bass: neck, scroll and endpin; the body is the accent. */
  bass: ['M12 8.5V3.5c0-2 2.6-2 2.6-.2', 'M12 5.5h-1.8', 'M12 22v1'],
  /** Piano keys; the black keys are the accent. */
  piano: ['M3 5h18v14H3z', 'M7.5 13v6M12 13v6M16.5 13v6'],
  /** The Cuban tres: a short neck and a three-way head; the teardrop body is the accent. */
  tres: ['M12 10V6', 'M12 6V2M12 6 9.5 2.5M12 6l2.5-3.5'],
  /** A trumpet: mouthpiece and valves; the bell is the accent. */
  trumpet: ['M2 12h13', 'M7 12V8M10 12V8M13 12V8', 'M4 12v3h9v-3'],
  /** A trombone: the slide; the bell is the accent. */
  trombone: ['M2 9h12', 'M4 9v6h14', 'M18 15v-3'],
  /** The lead guitar: neck and head; the body with a cutaway and a spark are the accent. */
  requinto: ['M12 11V4', 'M10.8 1.5h2.4V4h-2.4z'],
  /** The rhythm guitar: neck and head; the plain body is the accent. */
  segunda: ['M12 11V4', 'M10.8 1.5h2.4V4h-2.4z'],

  // Controls
  /** A metronome. */
  tempo: ['M6 21h12L15 3H9z', 'M12 17l5-9'],
  /** A loop arrow: how many counts repeat. */
  counts: ['M4 12a8 8 0 1 0 2.3-5.7', 'M3 3v4.5h4.5'],
  /** Sliders. */
  advanced: ['M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1', 'M15 4v4M9 10v4M17 16v4'],
  /** A die. */
  random: ['M4 4h16v16H4z', 'M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01'],
  /** An eraser. */
  clear: ['M15 4l5 5-9 9H6l-2-2z', 'M10 9l5 5', 'M11 20h9'],
  /** Three stacked layers: build a rhythm one instrument at a time. */
  layers: ['M12 3 3 7.5 12 12l9-4.5z', 'M3 12l9 4.5 9-4.5', 'M3 16.5 12 21l9-4.5'],
  /** Three blocks in a row: a song built from sections. */
  song: ['M2 8h5v8H2z', 'M9.5 8h5v8h-5z', 'M17 8h5v8h-5z'],
  /** A heart: support the developer. */
  /** Two chain links: a link to the pattern. */
  share: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  /** An arrow turning back: undo the edits. */
  reset: ['M4 13a8 8 0 1 0 2.5-6.5L4 9', 'M4 4v5h5'],
  heart: ['M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z'],
  /** Two notes: the chords the guitars and bass follow. */
  chords: ['M3 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', 'M13 15a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', 'M9 17V5l10-2v12'],
}

/**
 * The accent layer of each instrument icon, drawn over ICONS in the genre's
 * accent color and animated on its own on every hit (INSTRUMENT_MOTION in
 * core/motion.ts). `fill` paths are closed shapes, filled (even-odd, so a
 * second subpath cuts a hole); `line` paths are strokes like ICONS.
 */
export const ICON_ACCENTS: Record<string, { fill?: readonly string[], line?: readonly string[] }> = {
  voice: { line: ['M9 9.5h.01M12 9.5h.01M15 9.5h.01'] },
  clave: { line: ['M7 6 17 20'] },
  congas: { fill: ['M7 4.5a5 1.7 0 0 0 10 0a5 1.7 0 0 0 -10 0'] },
  bongos: { fill: ['M2.5 8a3.5 1.4 0 0 0 7 0a3.5 1.4 0 0 0 -7 0', 'M13 8.5a4.5 1.6 0 0 0 9 0a4.5 1.6 0 0 0 -9 0'] },
  timbales: { fill: ['M2 7a4.5 1.5 0 0 0 9 0a4.5 1.5 0 0 0 -9 0', 'M13 7a4.5 1.5 0 0 0 9 0a4.5 1.5 0 0 0 -9 0'] },
  cowbell: { fill: ['M5.8 16h12.4l.8 3H5z'] },
  timbalebell: { fill: ['M17 5a2 5.5 0 0 0 0 11a2 5.5 0 0 0 0 -11'] },
  campana: { line: ['M2.5 21.5 8.5 15.5'] },
  maracas: { fill: ['M4 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0', 'M13 10a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0'] },
  guiro: { line: ['M5 3.5l13 3'] },
  guira: { line: ['M21 3l-4 4M17 7v5'] },
  bass: { fill: ['M12 8.5c-2.7 0-4.2 1.5-4.2 3.4 0 1.1.6 1.7.6 2.5 0 1-1.9 1.7-1.9 3.9 0 2.3 2.3 3.7 5.5 3.7s5.5-1.4 5.5-3.7c0-2.2-1.9-2.9-1.9-3.9 0-.8.6-1.4.6-2.5 0-1.9-1.5-3.4-4.2-3.4z'] },
  piano: { fill: ['M6.5 5h2v8h-2zM11 5h2v8h-2zM15.5 5h2v8h-2z'] },
  tres: { fill: ['M12 10c-1 2.5-4.5 4.5-4.5 8a4.5 4.5 0 0 0 9 0c0-3.5-3.5-5.5-4.5-8zM10.4 17.8a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0'] },
  trumpet: { fill: ['M15 12l6-5v10z'] },
  trombone: { fill: ['M14 9l7-5v10z'] },
  requinto: { fill: ['M12 11c-2.2 0-3.5 1.2-3.5 2.8 0 .9.5 1.4.5 2 0 .8-1.5 1.4-1.5 3.2 0 1.9 1.9 3 4.5 3s4.5-1.1 4.5-3c0-1.8-1.5-2.4-1.5-3.2 0-.9-.2-1.5-1.2-2l-.6-2.7c-.4-.1-.8-.1-1.2-.1zM10.2 18.4a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0'], line: ['M5 3v4M3 5h4'] },
  segunda: { fill: ['M12 11c-2.2 0-3.5 1.2-3.5 2.8 0 .9.5 1.4.5 2 0 .8-1.5 1.4-1.5 3.2 0 1.9 1.9 3 4.5 3s4.5-1.1 4.5-3c0-1.8-1.5-2.4-1.5-3.2 0-.6.5-1.1.5-2 0-1.6-1.3-2.8-3.5-2.8zM10.4 18.4a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0'] },
}

/**
 * A mark for each sound a step can be (step names), drawn in a grid cell
 * over the sound's color. One mark per sound across instruments, so a slap
 * looks the same on the congas and the bongos; pitched sounds sit higher
 * the higher they are (root, 3rd, 5th). `fill` marks are solid shapes, the
 * rest strokes. The counting voice has none: its cells show the number.
 */
export const STEP_GLYPHS: Record<string, { d: string, fill?: true }> = {
  /** The plain stroke: a solid dot. */
  hit: { d: 'M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0', fill: true },
  /** A ring: the open tone rings out. */
  open: { d: 'M6.5 12a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0' },
  /** A cross: the sharp slap. */
  slap: { d: 'M7 7l10 10M17 7 7 17' },
  /** The lower half of a dot: the heel of the hand. */
  heel: { d: 'M5.5 11h13a6.5 6.5 0 0 1 -13 0z', fill: true },
  /** A small dot: the fingertips. */
  toe: { d: 'M9.3 12a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0', fill: true },
  high: { d: 'M12 5.5l6.5 11h-13z', fill: true },
  low: { d: 'M5.5 7.5h13L12 18.5z', fill: true },
  /** An arc: the edge of the drum. */
  rim: { d: 'M5 15a7 7 0 0 1 14 0' },
  short: { d: 'M9 12h6' },
  long: { d: 'M4 12h16' },
  /** A diamond: the bell's neck, a thinner sound than its mouth. */
  neck: { d: 'M12 6.5l5.5 5.5-5.5 5.5-5.5-5.5z' },
  /** A square: a muted, choked sound. */
  mute: { d: 'M7 7h10v10H7z' },
  root: { d: 'M8.5 17a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0', fill: true },
  '3rd': { d: 'M8.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0', fill: true },
  '5th': { d: 'M8.5 7a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0', fill: true },
  /** A bar at the bottom: the low note under a chord. */
  bass: { d: 'M7 15.5h10v3H7z', fill: true },
  /** Three stacked lines: the notes of a chord. */
  chord: { d: 'M6 7.5h12M6 12h12M6 16.5h12' },
  dyad: { d: 'M6 9.5h12M6 14.5h12' },
  /** An arrow: the chord pushed ahead of the beat. */
  push: { d: 'M5 12h12M13 7.5 17.5 12 13 16.5' },
}
