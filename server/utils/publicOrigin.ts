import type { H3Event } from 'h3'

/**
 * The site's public address, without a trailing slash: NUXT_PUBLIC_I18N_BASE_URL
 * in production, else the host the request came to (dev, previews).
 */
export function publicOrigin(event: H3Event): string {
  const configured = useRuntimeConfig(event).public.i18n?.baseUrl
  return (typeof configured === 'string' && configured ? configured : getRequestURL(event).origin).replace(/\/+$/, '')
}
