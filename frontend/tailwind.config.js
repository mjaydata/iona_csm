/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Executive dashboard color palette
        primary: {
          DEFAULT: '#3c83f6',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3c83f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
        },
        background: {
          light: '#f5f7f8',
          dark: '#101722',
        },
        health: {
          critical: '#ef4444',
          'at-risk': '#f59e0b',
          good: '#22c55e',
        },
        status: {
          'needs-attention': '#fee2e2',
          'in-progress': '#fef3c7',
          stable: '#dcfce7',
        }
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
