import { describe, expect, it } from 'vitest'
import { decodePattern, encodePattern } from '~/core/share'
import { packCode, unpackCode } from '~/core/compress'
import { MAX_START_PARAM, miniAppLink, parseLaunchParams, parseStartParam, startParam, telegramShareUrl } from '~/core/telegram'
import { genres } from '~/genres'

describe('start parameters', () => {
  it('name a genre, and maybe a packed pattern', () => {
    expect(parseStartParam('salsa')).toEqual({ genre: 'salsa' })
    expect(parseStartParam('salsa-abc-_DEF09')).toEqual({ genre: 'salsa', pattern: 'abc-_DEF09' })
  })

  it('still read the packed codes of older links', () => {
    expect(parseStartParam('salsa_abc-_DEF09')).toEqual({ genre: 'salsa', packed: 'abc-_DEF09' })
  })

  it('reject anything else', () => {
    for (const param of ['', 'Salsa', 'salsa_', 'salsa-', 'sal sa', 'salsa_a.b', '../salsa', `salsa_${'a'.repeat(MAX_START_PARAM)}`]) {
      expect(parseStartParam(param), param).toBeNull()
    }
  })

  it('are built only when Telegram would accept them', () => {
    expect(startParam('bachata')).toBe('bachata')
    expect(startParam('bachata', 'xyz')).toBe('bachata-xyz')
    expect(startParam('bachata', 'x'.repeat(MAX_START_PARAM))).toBeNull()
  })
})

describe('launch parameters', () => {
  // As Telegram puts them in the hash: the init data, URL-encoded once more.
  const initData = `query_id=1&user=${encodeURIComponent('{"id":1,"language_code":"ru"}')}&start_param=bachata&hash=x`
  const hash = `#tgWebAppData=${encodeURIComponent(initData)}&tgWebAppVersion=8.0&tgWebAppPlatform=ios`

  it('are read from the URL hash', () => {
    expect(parseLaunchParams(hash, null)).toEqual({ startParam: 'bachata', language: 'ru' })
  })

  it('or, after a reload, from the copy the SDK keeps', () => {
    expect(parseLaunchParams('', JSON.stringify({ tgWebAppData: initData }))).toEqual({ startParam: 'bachata', language: 'ru' })
    expect(parseLaunchParams(hash, JSON.stringify({ tgWebAppData: 'start_param=salsa' }))).toEqual({ startParam: 'bachata', language: 'ru' })
  })

  it('may be missing or broken', () => {
    expect(parseLaunchParams('', null)).toEqual({})
    expect(parseLaunchParams('#tgWebAppData=query_id%3D1', 'not json')).toEqual({ startParam: undefined, language: undefined })
    expect(parseLaunchParams('#tgWebAppData=user%3D%7Bbroken', null)).toEqual({ startParam: undefined, language: undefined })
    expect(parseLaunchParams('', '{"tgWebAppData":5}')).toEqual({})
  })
})

describe('links', () => {
  it('open the Mini App of a bot', () => {
    expect(miniAppLink('latinbeat_bot', 'salsa')).toBe('https://t.me/latinbeat_bot?startapp=salsa')
    expect(miniAppLink('', 'salsa')).toBeNull()
    expect(miniAppLink('evil.com/x', 'salsa')).toBeNull()
  })

  it('share a link to a chat with a message', () => {
    expect(telegramShareUrl('https://t.me/b?startapp=salsa', 'Мой бит'))
      .toBe('https://t.me/share/url?url=https%3A%2F%2Ft.me%2Fb%3Fstartapp%3Dsalsa&text=%D0%9C%D0%BE%D0%B9%20%D0%B1%D0%B8%D1%82')
  })
})

describe('packed codes', () => {
  it('come back unchanged', async () => {
    for (const genre of genres) {
      for (const preset of genre.presets) {
        const code = encodePattern(preset, genre)
        const packed = await packCode(code)
        const unpacked = await unpackCode(packed!)
        expect(unpacked).toBe(code)
        expect(decodePattern(unpacked!, genre)).toEqual(decodePattern(code, genre))
      }
    }
  })

  it('that are broken unpack to nothing', async () => {
    expect(await unpackCode('not-deflate')).toBeNull()
  })

  it('stop unpacking what grows far past any pattern', async () => {
    const huge = btoa('x'.repeat(100_000)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(await unpackCode((await packCode(huge))!)).toBeNull()
  })
})
