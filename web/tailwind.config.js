/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,vue}',
    './components/**/*.{js,ts,vue}',
    './layouts/**/*.{js,ts,vue}',
    './pages/**/*.{js,ts,vue}',
    './composables/**/*.{js,ts,vue}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Bricolage Grotesque', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
