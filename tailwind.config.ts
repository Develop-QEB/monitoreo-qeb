import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      colors: {
        bg: {
          base: '#1A1B26',
          raised: '#1F2032',
          card: '#24283B',
          hover: '#2A2F45',
          inset: '#16161E',
        },
        border: {
          subtle: 'rgba(192, 202, 245, 0.08)',
          strong: 'rgba(192, 202, 245, 0.14)',
        },
        fg: {
          primary: '#C0CAF5',
          secondary: '#9AA5CE',
          muted: '#565F89',
          faint: '#414868',
        },
        brand: {
          50: '#F5F1FE',
          100: '#EBE3FD',
          200: '#D6C7FB',
          300: '#C8ABFA',
          400: '#BB9AF7',
          500: '#9D7CD8',
          600: '#7C5FB8',
          700: '#5C4590',
        },
        state: {
          ok: '#9ECE6A',
          warn: '#E0AF68',
          crit: '#F7768E',
          info: '#7DCFFF',
          orange: '#FF9E64',
          blue: '#7AA2F7',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        card: 'inset 0 0 0 1px rgba(192, 202, 245, 0.06)',
        raised: '0 1px 0 rgba(192, 202, 245, 0.05) inset, 0 8px 24px -12px rgba(0, 0, 0, 0.6)',
      },
      letterSpacing: {
        tightest: '-0.03em',
        tighter: '-0.02em',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config
