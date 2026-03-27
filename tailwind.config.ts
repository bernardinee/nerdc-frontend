import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#0d1117',
          50: '#161b22',
          100: '#1c2128',
          200: '#21262d',
          300: '#30363d',
          400: '#484f58',
        },
        cyan: {
          50: '#e0f8ff',
          100: '#b9efff',
          200: '#7ee0ff',
          300: '#38ceff',
          400: '#00b8f5',
          500: '#0097d6',
          600: '#0077ad',
          700: '#005d8c',
          800: '#004d73',
          900: '#003a56',
          950: '#001f30',
        },
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'glass-hover': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-lg': '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glow-cyan': '0 0 20px rgba(0,184,245,0.25)',
        'glow-red': '0 0 20px rgba(239,68,68,0.25)',
        'glow-green': '0 0 20px rgba(34,197,94,0.2)',
        'glow-amber': '0 0 20px rgba(245,158,11,0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
