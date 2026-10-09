/** What happened to a link the user asked to share. */
export type SendResult = 'shared' | 'cancelled' | 'copied' | 'manual'

/** The parts of `navigator` that sending a link uses. */
export interface LinkSender {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
  clipboard?: Pick<Clipboard, 'writeText'>
}

/**
 * Send `url` on its way. On a touch screen with a system share sheet the
 * sheet opens (WhatsApp, Telegram…); elsewhere the link is copied. Desktop
 * browsers have share sheets too, but there copying is what people expect.
 * 'manual' means neither worked and the link should be shown for copying
 * by hand.
 */
export async function sendLink(url: string, sender: LinkSender, touch: boolean): Promise<SendResult> {
  const data: ShareData = { url }
  if (touch && sender.share && (sender.canShare?.(data) ?? true)) {
    try {
      await sender.share(data)
      return 'shared'
    } catch (error) {
      // The user closed the sheet: nothing to do.
      if ((error as Error)?.name === 'AbortError') return 'cancelled'
      // Not allowed (no user gesture, policy): copying still might be.
    }
  }
  try {
    await sender.clipboard!.writeText(url)
    return 'copied'
  } catch {
    // No clipboard (insecure origin, permission denied).
    return 'manual'
  }
}
