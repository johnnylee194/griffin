/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Griffin 品牌配色：Google Home 风格
        primary: {
          DEFAULT: '#4285F4', // 蓝色
          light: '#669DF6',
          dark: '#1967D2',
        },
        accent: {
          red: '#EA4335',
          yellow: '#FBBC04',
          green: '#34A853',
        },
        bg: {
          DEFAULT: '#F8F9FA',
          card: '#FFFFFF',
          dark: '#202124',
        },
        text: {
          DEFAULT: '#202124',
          secondary: '#5F6368',
          light: '#80868B',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          '微软雅黑',
          'STHeiti',
          'WenQuanYi Micro Hei',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      }
    },
  },
  plugins: [],
}

