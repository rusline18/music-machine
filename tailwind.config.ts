import type { Config } from 'tailwindcss'

/** A color from CSS variables (space-separated RGB), so opacity modifiers like /20 still work. */
const variable = (name: string) => `rgb(var(${name}) / <alpha-value>)`

/**
 * The "Noche" theme: a warm near-black ground, one bright color per genre
 * and gold for the count. `neutral` is replaced outright, so every
 * neutral-* class in the app picks up the warm tones.
 */
export default <Partial<Config>>{
  content: [
    './app/components/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue',
  ],
  theme: {
    extend: {
      colors: {
        neutral: {
          50: '#FBF7F2',
          100: '#F6F0E9',
          200: '#E6DDD4',
          300: '#CFC4BA',
          400: '#B3A79D',
          500: '#8A7E74',
          600: '#6A5F57',
          700: '#3A322E',
          800: '#29221F',
          900: '#1B1716',
          950: '#110E0D',
        },
        // Fuego and Caribe: the genres' own colors, for places that show both (the home page).
        salsa: { 300: '#FFB08C', 400: '#FF8A5C', 500: '#FF6A3D' },
        bachata: { 300: '#A6EDE4', 400: '#5EDDD0', 500: '#2FC6B4' },
        // The genre's color on its own page (main.css).
        accent: {
          300: variable('--accent-300'),
          400: variable('--accent-400'),
          500: variable('--accent-500'),
        },
        // Oro: the count only — 1 and 5, the count sounding now, the playhead.
        gold: { 300: '#F9DD94', 400: '#F4C552' },
      },
      fontFamily: {
        sans: ['"Onest Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
    },
  },
}
