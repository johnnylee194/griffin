/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Griffin 品牌配色：黑金
        gold: {
          DEFAULT: '#D4AF37',
          light: '#FFD700',
          dark: '#B8960F',
        },
        dark: {
          DEFAULT: '#0A0A0A',
          lighter: '#1F1F1F',
          light: '#2A2A2A',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

