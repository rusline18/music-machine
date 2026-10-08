import { describe, expect, it } from 'vitest'
import { safeExternalUrl } from '~/core/links'

describe('safeExternalUrl', () => {
  it('keeps an https link', () => {
    expect(safeExternalUrl('https://boosty.to/someone')).toBe('https://boosty.to/someone')
  })

  it.each(['', undefined, 'http://example.com', 'javascript:alert(1)', 'boosty.to/someone', 'not a url'])('drops %s', (url) => {
    expect(safeExternalUrl(url)).toBeUndefined()
  })
})
