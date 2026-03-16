import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#e1ad2d',
          light: '#f0c040',
          dark: '#c2a10e',
        },
        'pixel-blue': {
          DEFAULT: '#3084b1',
          dark: '#205ad7',
          light: '#4a9fd4',
        },
        'pixel-red': '#b43824',
        dark: {
          900: '#0a0a0b',
          800: '#121214',
          700: '#1a1a1e',
          600: '#242429',
          500: '#2e2e35',
          400: '#3a3a42',
        }
      },
      fontFamily: {
        sans: ['var(--font-pixel)', 'monospace'],
      },
      animation: {
        'pixel-fade-up': 'pixel-fade-up 0.4s steps(4) forwards',
        'pixel-fade-in': 'pixel-fade-in 0.5s steps(4) forwards',
        'pixel-bob': 'pixel-bob 2.5s steps(3) infinite',
        'pixel-bob-badge': 'pixel-bob-badge 2.5s steps(3) infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'arrow-bounce': 'arrow-bounce 1.8s steps(4) infinite',
        'pixel-scale-in': 'pixel-scale-in 0.4s steps(3) forwards',
      },
      keyframes: {
        'pixel-fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '50%': { opacity: '0.5', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pixel-fade-in': {
          '0%': { opacity: '0' },
          '25%': { opacity: '0.25' },
          '50%': { opacity: '0.5' },
          '75%': { opacity: '0.75' },
          '100%': { opacity: '1' },
        },
        'pixel-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pixel-bob-badge': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'glow-pulse': {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(225,173,45,0.3))' },
          '50%': { filter: 'drop-shadow(0 0 20px rgba(225,173,45,0.6)) drop-shadow(0 0 40px rgba(225,173,45,0.2))' },
        },
        'arrow-bounce': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.6' },
          '50%': { transform: 'translateY(8px)', opacity: '0.9' },
        },
        'pixel-scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '50%': { opacity: '0.5', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
