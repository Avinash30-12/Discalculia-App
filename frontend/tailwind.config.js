/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        accent: '#f97316',
        soft: '#f3f4f6'
      },
      fontFamily: {
        display: ['Nunito', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}

