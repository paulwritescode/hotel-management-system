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
        surface: 'var(--hf-parchment)',
        parchment: 'var(--hf-parchment)',
        pearl: 'var(--hf-pearl)',
        ink: 'var(--hf-ink)',
        charcoal: 'var(--hf-ink-80)',
        steel: 'var(--hf-ink-48)',
        hairline: 'var(--hf-hairline)',
        coral: 'var(--hf-coral)',
        magenta: 'var(--hf-magenta)',
        brandblue: 'var(--hf-blue)',
        purple: 'var(--hf-purple)',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        xxl: '20px',
        xxxl: '24px',
        hero: '32px',
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
