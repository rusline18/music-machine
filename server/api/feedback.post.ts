import type { H3Event } from 'h3'
import { InvalidFeedbackError, validateFeedback } from '#shared/feedback'
import { deliverFeedback } from '../feedback/deliver'
import type { FeedbackEntry } from '../feedback/deliver'
import { createRateLimiter } from '../feedback/rateLimit'

const MAX_BODY_BYTES = 16 * 1024
const perClient = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })
/** Caps total intake even if someone rotates addresses. */
const overall = createRateLimiter({ limit: 200, windowMs: 60 * 60_000 })

/** Reads the body but stops at MAX_BODY_BYTES, whatever Content-Length claims. */
async function readLimitedBody(event: H3Event): Promise<string> {
  const declared = Number(getHeader(event, 'content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) throw createError({ statusCode: 413, statusMessage: 'Feedback is too large' })
  const body = new Uint8Array(MAX_BODY_BYTES)
  let size = 0
  for await (const chunk of event.node.req as AsyncIterable<Uint8Array>) {
    if (size + chunk.length > MAX_BODY_BYTES) throw createError({ statusCode: 413, statusMessage: 'Feedback is too large' })
    body.set(chunk, size)
    size += chunk.length
  }
  return new TextDecoder().decode(body.subarray(0, size))
}

/**
 * Takes feedback from the app's dialog; off unless NUXT_PUBLIC_FEEDBACK_ENABLED
 * is true. Where it ends up is configured, not
 * coded: Nitro's `feedback` storage (files under .data/feedback by default,
 * see nuxt.config.ts) and, if NUXT_FEEDBACK_WEBHOOK_URL is set, a webhook.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  // Switched off: behave as if the route didn't exist.
  if (!config.public.feedbackEnabled) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  // JSON only: a cross-site form can't send it without a CORS preflight,
  // which this route never approves.
  if (!getHeader(event, 'content-type')?.startsWith('application/json')) {
    throw createError({ statusCode: 415, statusMessage: 'Expected JSON' })
  }

  // Behind a reverse proxy every request comes from the proxy's address;
  // only then trust X-Forwarded-For (NUXT_FEEDBACK_TRUST_PROXY=true).
  const client = getRequestIP(event, { xForwardedFor: Boolean(config.feedbackTrustProxy) }) ?? 'unknown'
  if (!perClient(client) || !overall('all')) {
    throw createError({ statusCode: 429, statusMessage: 'Too much feedback at once — please try again later' })
  }

  let input
  try {
    input = validateFeedback(JSON.parse(await readLimitedBody(event)))
  } catch (err) {
    if (err instanceof SyntaxError) throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' })
    if (err instanceof InvalidFeedbackError) throw createError({ statusCode: 400, statusMessage: err.message })
    throw err
  }

  const id = crypto.randomUUID()
  // Honeypot filled in: a bot. Look successful so it doesn't retry, keep nothing.
  if (input.website) return { ok: true, id }

  const { website: _honeypot, ...fields } = input
  const entry: FeedbackEntry = { id, receivedAt: new Date().toISOString(), ...fields }
  try {
    await deliverFeedback(entry, {
      save: (key, value) => useStorage('feedback').setItem(key, value),
      webhookUrl: config.feedbackWebhookUrl || undefined,
    })
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Feedback could not be delivered — please try again later' })
  }
  // The message itself stays out of the logs.
  console.info(`feedback ${id} received (${entry.kind})`)
  setResponseStatus(event, 201)
  return { ok: true, id }
})
