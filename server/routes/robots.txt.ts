/** Everything may be crawled; points crawlers at the sitemap. */
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${publicOrigin(event)}/sitemap.xml\n`
})
