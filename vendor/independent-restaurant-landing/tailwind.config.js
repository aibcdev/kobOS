/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FF17E9',
        background: '#FFFFFF',
        surface: '#F5F5F6',
        text: '#000000',
        'dark-bg': '#000000',
        'dark-surface': '#242424',
        border: '#DEDEDE',
        'pink-transparent': 'rgba(255, 23, 233, 0.1)',
      },
      fontFamily: {
        sans: ['"Helvetica Neue LT Pro"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        default: '0.9375rem',
        button: '6.25rem',
        tag: '0.5rem',
        card: '1rem',
      }
    },
  },
  plugins: [],
}