import { describe, expect, it } from 'vitest'
import { COUNTING_MODES, stepNames } from '~/core/resolve'
import { TEMPO_CHOICES } from '~/core/tempo'
import { genres } from '~/genres'
import { countingVoice } from '~/genres/voice'
import en from '../i18n/locales/en.json'
import ru from '../i18n/locales/ru.json'

type Messages = { [key: string]: string | Messages }

/** Every leaf key, dotted: "grid.block", "presets.salsa-verse-3-2"… */
function keys(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'string' ? [prefix + key] : keys(value, `${prefix}${key}.`))
}

function has(messages: Messages, path: string[]): boolean {
  const [head, ...rest] = path
  const value = messages[head!]
  return rest.length === 0 ? typeof value === 'string' : typeof value === 'object' && has(value, rest)
}

/** Keys the app builds from data: genre, instrument, step and preset names and their help texts. */
const dataKeys = genres.flatMap((genre) => [
  ['genres', genre.id, 'name'],
  ['genres', genre.id, 'title'],
  ['genres', genre.id, 'description'],
  ...genre.instruments.map((instrument) => ['instruments', instrument]),
  ...genre.instruments.map((instrument) => ['help', 'instruments', instrument]),
  ...genre.instruments.flatMap((instrument) => stepNames(genre, instrument).map((step) => ['steps', step])),
  ...genre.presets.map((preset) => ['presets', preset.id]),
  ...genre.presets.map((preset) => ['help', 'presets', preset.id]),
  ...COUNTING_MODES.map((mode) => ['controls', 'counting', mode]),
  ...TEMPO_CHOICES.map((choice) => ['controls', 'tempo', choice]),
])

describe.each([['en', en], ['ru', ru]] as const)('%s messages', (locale, messages) => {
  it('has the same keys as English', () => {
    expect(keys(messages).sort()).toEqual(keys(en).sort())
  })

  it('has a counting voice', () => {
    expect(countingVoice[locale]?.counts).toHaveLength(8)
  })

  it.each(dataKeys.map((path) => [path.join('.'), path]))('translates %s', (_key, path) => {
    expect(has(messages, path)).toBe(true)
  })
})
