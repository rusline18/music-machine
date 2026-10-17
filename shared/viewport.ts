/**
 * viewport-fit=cover: the page runs under the notch and the home bar, and
 * the practice bar keeps clear of them with env(safe-area-inset-*).
 */
export const VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover'

/**
 * Inside the Telegram Mini App (plugins/telegram.client.ts): no pinch zoom.
 * It's an app screen, and a zoomed one leaves its controls off-screen.
 * maximum-scale=1 also stops iOS zooming in on a focused input. The site
 * itself stays zoomable.
 */
export const MINI_APP_VIEWPORT = `${VIEWPORT}, maximum-scale=1, user-scalable=no`
