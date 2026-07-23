import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        primary: 'var(--hf-primary)',
        canvas: 'var(--hf-canvas)',
        parchment: 'var(--hf-parchment)',
        pearl: 'var(--hf-pearl)',
        ink: 'var(--hf-ink)',
        hairline: 'var(--hf-hairline)',
      },
      borderRadius: {
        sm: '8px',
        md: '11px',
        lg: '18px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['var(--hf-font-text)'],
        display: ['var(--hf-font-display)'],
      },
    },
  },
  plugins: [],
}

export default config
