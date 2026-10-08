import type { FeedbackInput } from '#shared/feedback'
import { FEEDBACK_KIND_LABELS } from '#shared/feedback'

/** One stored piece of feedback. No IP address is kept. */
export interface FeedbackEntry extends Omit<FeedbackInput, 'website'> {
  id: string
  receivedAt: string
}

export interface FeedbackSinks {
  /** Keeps a durable copy; the app passes Nitro's `feedback` storage mount. */
  save: (key: string, entry: FeedbackEntry) => Promise<void>
  /**
   * Optional POST target, e.g. a Slack or Discord incoming webhook or an
   * automation tool. Set with NUXT_FEEDBACK_WEBHOOK_URL.
   */
  webhookUrl?: string
  fetch?: typeof globalThis.fetch
}

const WEBHOOK_TIMEOUT_MS = 5000
/** Discord rejects messages over 2000 characters. */
const CHAT_TEXT_MAX = 1900

/** Storage key: one folder per day, e.g. 2026-10-08:<id>.json → .data/feedback/2026-10-08/<id>.json */
export function storageKey(entry: FeedbackEntry): string {
  return `${entry.receivedAt.slice(0, 10)}:${entry.id}.json`
}

/** A one-line summary for chat tools; `<`, `>` and `&` escaped so text can't trigger Slack mentions or links. */
export function chatText(entry: FeedbackEntry): string {
  const details = [entry.page, entry.email].filter(Boolean).join(' · ')
  const text = `[${FEEDBACK_KIND_LABELS[entry.kind]}] ${entry.message}${details ? `\n— ${details}` : ''}`
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.length > CHAT_TEXT_MAX ? `${escaped.slice(0, CHAT_TEXT_MAX)}…` : escaped
}

/**
 * Saves the entry and forwards it to the webhook, if one is set. Succeeds if
 * at least one of them worked, so a flaky webhook never loses feedback that
 * was stored; throws only when nothing took it.
 */
export async function deliverFeedback(entry: FeedbackEntry, sinks: FeedbackSinks): Promise<{ saved: boolean, forwarded: boolean }> {
  const saved = await sinks.save(storageKey(entry), entry).then(() => true, (err) => {
    console.error(`feedback ${entry.id}: could not save`, err)
    return false
  })

  let forwarded = false
  if (sinks.webhookUrl) {
    const text = chatText(entry)
    const fetch = sinks.fetch ?? globalThis.fetch
    forwarded = await fetch(sinks.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // `text` is what Slack reads, `content` what Discord reads (with pings
      // switched off); anything else can use the structured `feedback`.
      body: JSON.stringify({ text, content: text, allowed_mentions: { parse: [] }, feedback: entry }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    }).then((response) => {
      if (!response.ok) throw new Error(`webhook answered HTTP ${response.status}`)
      return true
    }).catch((err) => {
      console.error(`feedback ${entry.id}: webhook failed`, err)
      return false
    })
  }

  if (!saved && !forwarded) throw new Error('feedback could not be saved or forwarded')
  return { saved, forwarded }
}
