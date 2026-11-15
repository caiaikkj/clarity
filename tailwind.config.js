/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#090D16',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Inter Variable"',
          'Inter',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass:
          'inset 0 1px 0 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.03), 0 24px 60px -24px rgba(0,0,0,0.65), 0 8px 20px -10px rgba(0,0,0,0.4)',
        'glass-lift':
          'inset 0 1px 0 0 rgba(255,255,255,0.24), inset 0 0 0 1px rgba(255,255,255,0.08), 0 32px 70px -22px rgba(0,0,0,0.7), 0 12px 26px -10px rgba(56,189,248,0.12)',
        glow: '0 0 28px -4px rgba(56,189,248,0.55)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        drift1: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(8vw,6vh,0) scale(1.12)' },
          '66%': { transform: 'translate3d(-4vw,10vh,0) scale(0.95)' },
        },
        drift2: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '40%': { transform: 'translate3d(-10vw,-6vh,0) scale(1.1)' },
          '70%': { transform: 'translate3d(5vw,-10vh,0) scale(0.92)' },
        },
        drift3: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(6vw,-8vh,0) scale(1.18)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        haptic: {
          '0%': {
            boxShadow:
              '0 0 0 0 rgba(56,189,248,0.55), 0 0 0 0 rgba(99,102,241,0.45)',
            transform: 'scale(1)',
          },
          '35%': { transform: 'scale(1.025)' },
          '100%': {
            boxShadow:
              '0 0 0 22px rgba(56,189,248,0), 0 0 0 40px rgba(99,102,241,0)',
            transform: 'scale(1)',
          },
        },
        drawer: {
          '0%': { opacity: '0', transform: 'translate3d(32px,0,0) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0) scale(1)' },
        },
        dock: {
          '0%': { opacity: '0', transform: 'translate3d(0,24px,0)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scanline: {
          '0%, 100%': { top: '0%' },
          '50%': { top: '100%' },
        },
        checkDraw: {
          '0%': { strokeDashoffset: '1' },
          '100%': { strokeDashoffset: '0' },
        },
        checkPop: {
          '0%': { transform: 'scale(0.6)' },
          '100%': { transform: 'scale(1)' },
        },
        micRing: {
          '0%': { opacity: '0.75', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(1.7)' },
        },
        ringPulse: {
          '0%': { transform: 'scale(0.9)' },
          '45%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        drift1: 'drift1 38s ease-in-out infinite',
        drift2: 'drift2 46s ease-in-out infinite',
        drift3: 'drift3 54s ease-in-out infinite',
        pop: 'pop 0.22s cubic-bezier(0.22,1,0.36,1) both',
        fade: 'fade 0.2s cubic-bezier(0.22,1,0.36,1) both',
        rise: 'rise 0.22s cubic-bezier(0.22,1,0.36,1) both',
        haptic: 'haptic 0.9s cubic-bezier(0.22,1,0.36,1) both',
        drawer: 'drawer 0.22s cubic-bezier(0.22,1,0.36,1) both',
        dock: 'dock 0.22s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 2.4s linear infinite',
        scanline: 'scanline 2.2s ease-in-out infinite',
        'check-draw': 'checkDraw 0.3s cubic-bezier(0.22,1,0.36,1) 0.06s both',
        'check-pop': 'checkPop 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
        'mic-ring': 'micRing 1.6s cubic-bezier(0.22,1,0.36,1) infinite',
        'ring-pulse': 'ringPulse 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
      },
    },
  },
  plugins: [],
}
