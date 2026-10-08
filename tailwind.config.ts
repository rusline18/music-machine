import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './app/components/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue',
  ],
}
