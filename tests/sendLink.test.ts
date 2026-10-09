import { describe, expect, it, vi } from 'vitest'
import { sendLink } from '~/core/sendLink'

const URL = 'https://example.com/salsa?p=abc'

const failWith = (name: string) => () => Promise.reject(Object.assign(new Error(name), { name }))

describe('sendLink', () => {
  it('opens the share sheet on a touch screen', async () => {
    const share = vi.fn(() => Promise.resolve())
    const writeText = vi.fn(() => Promise.resolve())
    expect(await sendLink(URL, { share, clipboard: { writeText } }, true)).toBe('shared')
    expect(share).toHaveBeenCalledWith({ url: URL })
    expect(writeText).not.toHaveBeenCalled()
  })

  it('copies on a desktop, even if it has a share sheet', async () => {
    const share = vi.fn(() => Promise.resolve())
    const writeText = vi.fn(() => Promise.resolve())
    expect(await sendLink(URL, { share, clipboard: { writeText } }, false)).toBe('copied')
    expect(share).not.toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledWith(URL)
  })

  it('copies when there is no share sheet or it cannot take a link', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    expect(await sendLink(URL, { clipboard: { writeText } }, true)).toBe('copied')
    const share = vi.fn(() => Promise.resolve())
    expect(await sendLink(URL, { share, canShare: () => false, clipboard: { writeText } }, true)).toBe('copied')
    expect(share).not.toHaveBeenCalled()
  })

  it('does nothing more when the user closes the sheet', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    expect(await sendLink(URL, { share: failWith('AbortError'), clipboard: { writeText } }, true)).toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('falls back to copying when sharing is not allowed', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    expect(await sendLink(URL, { share: failWith('NotAllowedError'), clipboard: { writeText } }, true)).toBe('copied')
  })

  it('asks for a manual copy when nothing works', async () => {
    expect(await sendLink(URL, { clipboard: { writeText: failWith('NotAllowedError') } }, false)).toBe('manual')
    expect(await sendLink(URL, {}, false)).toBe('manual')
  })
})
