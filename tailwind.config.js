/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#080E18',
        panel: '#0f172a',
        steel: '#1e293b',
        accent: '#F97316',
      },
      fontFamily: {
        sans: ['Pretendard', 'Segoe UI', 'Apple SD Gothic Neo', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
