import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cosmos: {
          bg: '#F2F1EE',
          card: '#C8C5BC',
          dark: '#1C1C1C',
          muted: '#A8A49C',
          sub: '#6B6862',
        },
      },
    },
  },
}
export default config
