import type { Config } from 'tailwindcss'

/** A color from CSS variables (space-separated RGB), so opacity modifiers like /20 still work. */
const variable = (name: string) => `rgb(var(${name}) / <alpha-value>)`

export default <Partial<Config>>{
  content: [
    './app/components/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue',
  ],
  theme: {
    extend: {
      colors: {
        // The genre's color: amber for salsa, sky for bachata (main.css).
        accent: {
          300: variable('--accent-300'),
          400: variable('--accent-400'),
          500: variable('--accent-500'),
        },
      },
    },
  },
}
