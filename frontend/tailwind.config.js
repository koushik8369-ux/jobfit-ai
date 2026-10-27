/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#090d16',
        surface: {
          DEFAULT: '#0f172a',
          raised: '#151f32',
          elevated: '#1b2638',
        },
        line: {
          DEFAULT: 'rgba(148, 163, 184, 0.14)',
          strong: 'rgba(148, 163, 184, 0.22)',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        slate: {
          850: '#151f32',
          950: '#090d16',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        control: '0.75rem',
        card: '1rem',
        panel: '1.25rem',
      },
      boxShadow: {
        surface: '0 18px 48px -28px rgba(0, 0, 0, 0.72)',
        'brand-soft': '0 10px 28px -16px rgba(99, 102, 241, 0.55)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        }
      }
    },
  },
  plugins: [],
}
