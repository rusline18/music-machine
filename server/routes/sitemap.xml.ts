import { sitemapXml } from '#shared/sitemap'

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return sitemapXml(publicOrigin(event))
})
