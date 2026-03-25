/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0f1117',
          800: '#161b27',
          700: '#1e2535',
          600: '#252d40',
          500: '#2e3a52',
        },
        profit: '#22c55e',
        loss: '#ef4444',
        accent: '#6366f1',
      },
    },
  },
  plugins: [],
}
