/**
 * Feedback sent from the app's "Feedback" dialog to POST /api/feedback.
 * Shared by the form (limits, labels) and the server (validation).
 */

export const FEEDBACK_KINDS = ['problem', 'idea', 'missing'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  problem: 'Something is broken',
  idea: 'I have an idea',
  missing: 'Something is missing',
}

export const FEEDBACK_LIMITS = {
  messageMin: 5,
  messageMax: 2000,
  emailMax: 200,
  pageMax: 200,
  userAgentMax: 300,
} as const

/** What the browser sends. `website` is a honeypot: people never see it, bots fill it. */
export interface FeedbackInput {
  kind: FeedbackKind
  message: string
  email?: string
  /** Path the user was on, e.g. /bachata. */
  page?: string
  userAgent?: string
  website?: string
}

export class InvalidFeedbackError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'InvalidFeedbackError'
  }
}

function fail(reason: string): never {
  throw new InvalidFeedbackError(reason)
}

function optionalText(value: unknown, max: number, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') fail(`${field} must be text`)
  const trimmed = value.trim()
  if (trimmed.length > max) fail(`${field} is too long`)
  return trimmed || undefined
}

// Deliberately loose: one @, something on both sides, a dot in the domain.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Checks untrusted input and returns only the known, trimmed fields. Throws InvalidFeedbackError. */
export function validateFeedback(input: unknown): FeedbackInput {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) fail('not an object')
  const raw = input as Record<string, unknown>
  if (!FEEDBACK_KINDS.includes(raw.kind as FeedbackKind)) fail(`kind must be one of ${FEEDBACK_KINDS.join(', ')}`)
  if (typeof raw.message !== 'string') fail('message is required')
  const message = raw.message.trim()
  if (message.length < FEEDBACK_LIMITS.messageMin) fail('message is too short')
  if (message.length > FEEDBACK_LIMITS.messageMax) fail('message is too long')
  const email = optionalText(raw.email, FEEDBACK_LIMITS.emailMax, 'email')
  if (email && !EMAIL.test(email)) fail('email looks invalid')
  const page = optionalText(raw.page, FEEDBACK_LIMITS.pageMax, 'page')
  if (page && !page.startsWith('/')) fail('page must be a path')

  return {
    kind: raw.kind as FeedbackKind,
    message,
    email,
    page,
    // Browsers can send long UA strings; keep the start instead of rejecting.
    userAgent: typeof raw.userAgent === 'string' ? raw.userAgent.slice(0, FEEDBACK_LIMITS.userAgentMax) : undefined,
    website: typeof raw.website === 'string' ? raw.website : undefined,
  }
}
