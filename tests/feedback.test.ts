import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidFeedbackError, validateFeedback } from '#shared/feedback'
import { chatText, deliverFeedback, storageKey } from '../server/feedback/deliver'
import type { FeedbackEntry } from '../server/feedback/deliver'
import { createRateLimiter } from '../server/feedback/rateLimit'

const valid = { kind: 'idea', message: 'Add a merengue page please', email: 'dancer@example.com', page: '/salsa', userAgent: 'Firefox' }

describe('validateFeedback', () => {
  it('keeps known fields, trimmed', () => {
    expect(validateFeedback({ ...valid, message: '  Add a merengue page please  ', extra: 'dropped' })).toEqual({ ...valid, website: undefined })
  })

  it('treats an empty email as none', () => {
    expect(validateFeedback({ ...valid, email: '' }).email).toBeUndefined()
  })

  it('cuts a very long user agent instead of rejecting', () => {
    expect(validateFeedback({ ...valid, userAgent: 'x'.repeat(5000) }).userAgent).toHaveLength(300)
  })

  it.each<[string, Record<string, unknown> | unknown]>([
    ['an unknown kind', { ...valid, kind: 'spam' }],
    ['a missing message', { ...valid, message: undefined }],
    ['a blank message', { ...valid, message: '     ' }],
    ['a too-long message', { ...valid, message: 'x'.repeat(2001) }],
    ['a malformed email', { ...valid, email: 'not an email' }],
    ['an email that is not text', { ...valid, email: 42 }],
    ['a page that is not a path', { ...valid, page: 'https://evil.example' }],
    ['an array', [valid]],
    ['null', null],
  ])('rejects %s', (_case, input) => {
    expect(() => validateFeedback(input)).toThrow(InvalidFeedbackError)
  })
})

describe('createRateLimiter', () => {
  it('allows `limit` hits per window per key, then frees up', () => {
    let now = 0
    const allow = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now })
    expect([allow('a'), allow('a'), allow('a'), allow('b')]).toEqual([true, true, false, true])
    now = 1000
    expect(allow('a')).toBe(true)
  })
})

describe('deliverFeedback', () => {
  const entry: FeedbackEntry = {
    id: 'abc',
    receivedAt: '2026-10-08T12:00:00.000Z',
    kind: 'problem',
    message: 'Hi <!channel> & @everyone',
    page: '/bachata',
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('files entries by day', () => {
    expect(storageKey(entry)).toBe('2026-10-08:abc.json')
  })

  it('escapes chat text so messages cannot ping or link', () => {
    expect(chatText(entry)).toBe('[Something is broken] Hi &lt;!channel&gt; &amp; @everyone\n— /bachata')
  })

  it('saves without a webhook', async () => {
    const save = vi.fn(async () => {})
    expect(await deliverFeedback(entry, { save })).toEqual({ saved: true, forwarded: false })
    expect(save).toHaveBeenCalledWith('2026-10-08:abc.json', entry)
  })

  it('posts to the webhook with mentions switched off', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    await deliverFeedback(entry, { save: async () => {}, webhookUrl: 'https://hooks.example/x', fetch })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://hooks.example/x')
    const body = JSON.parse(init.body as string)
    expect(body.allowed_mentions).toEqual({ parse: [] })
    expect(body.feedback).toEqual(entry)
  })

  it('succeeds when only one of storage and webhook works', async () => {
    const failingSave = async () => {
      throw new Error('disk full')
    }
    const okFetch = async () => new Response(null, { status: 200 })
    const badFetch = async () => new Response(null, { status: 500 })
    expect(await deliverFeedback(entry, { save: failingSave, webhookUrl: 'https://h', fetch: okFetch })).toEqual({ saved: false, forwarded: true })
    expect(await deliverFeedback(entry, { save: async () => {}, webhookUrl: 'https://h', fetch: badFetch })).toEqual({ saved: true, forwarded: false })
  })

  it('fails when nothing took the feedback', async () => {
    const failingSave = async () => {
      throw new Error('disk full')
    }
    await expect(deliverFeedback(entry, { save: failingSave })).rejects.toThrow()
  })
})
