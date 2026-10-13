import { describe, expect, it } from 'vitest'
import { addScriptNonce, contentSecurityPolicy } from '../server/csp'

describe('contentSecurityPolicy', () => {
  it('allows no inline scripts without a nonce', () => {
    expect(contentSecurityPolicy()).toContain('script-src \'self\';')
    expect(contentSecurityPolicy()).not.toMatch(/script-src[^;]*unsafe-inline/)
  })

  it('allows scripts carrying the nonce', () => {
    expect(contentSecurityPolicy('abc')).toContain('script-src \'self\' \'nonce-abc\';')
  })
})

describe('addScriptNonce', () => {
  it('marks every script tag, inline or not', () => {
    const html = '<script type="importmap">{}</script><script>x()</script><script type="module" src="/a.js"></script>'
    expect(addScriptNonce(html, 'n')).toBe('<script nonce="n" type="importmap">{}</script><script nonce="n">x()</script><script nonce="n" type="module" src="/a.js"></script>')
  })

  it('leaves other tags alone', () => {
    expect(addScriptNonce('<scripts><noscript>', 'n')).toBe('<scripts><noscript>')
  })
})
