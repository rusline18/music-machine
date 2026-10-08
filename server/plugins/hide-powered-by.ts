// Nuxt's renderer advertises itself with `x-powered-by: Nuxt`; don't tell
// scanners which framework (and so which advisories) to try.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    event.node.res.removeHeader('x-powered-by')
  })
})
