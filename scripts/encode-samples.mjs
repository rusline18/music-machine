/**
 * Encodes every public/audio/**.wav into a .webm (Opus) next to it. The app
 * downloads the .webm and only falls back to the .wav when the browser
 * can't decode Opus, so the WAVs stay the master copy.
 *
 * 128 kbps mono is well above where Opus becomes transparent; measured
 * against the WAVs (decoded in Chromium) the onset stays sample-accurate and
 * level and octave-band balance stay within 0.5 dB. Opus does drop content
 * below ~20 Hz, which some guitar tails carry as inaudible drift.
 *
 * Needs ffmpeg built with libopus on PATH. Run by `npm run samples`, or on
 * its own with `npm run samples:encode`.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const AUDIO = join(ROOT, 'public', 'audio')
const BITRATE = '128k'

function wavFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return wavFiles(path)
    return name.endsWith('.wav') ? [path] : []
  })
}

export function encodeSamples() {
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' })
  if (probe.error || !probe.stdout.includes('libopus')) {
    console.error('encode-samples: needs ffmpeg with libopus on PATH (e.g. `apt install ffmpeg`, `brew install ffmpeg`).')
    process.exit(1)
  }

  let wavBytes = 0
  let webmBytes = 0
  for (const wav of wavFiles(AUDIO)) {
    const webm = wav.replace(/\.wav$/, '.webm')
    // bitexact + no metadata: re-running on the same WAVs gives identical files.
    const result = spawnSync('ffmpeg', [
      '-v', 'error', '-y', '-i', wav,
      '-c:a', 'libopus', '-b:a', BITRATE,
      '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
      webm,
    ], { encoding: 'utf8' })
    if (result.status !== 0) {
      console.error(`encode-samples: ffmpeg failed on ${relative(ROOT, wav)}\n${result.stderr}`)
      process.exit(1)
    }
    wavBytes += statSync(wav).size
    webmBytes += statSync(webm).size
  }
  console.log(`Opus: ${(wavBytes / 1024).toFixed(0)} KB of WAV → ${(webmBytes / 1024).toFixed(0)} KB of .webm`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) encodeSamples()
