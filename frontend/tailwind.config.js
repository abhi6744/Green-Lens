/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f0',
          100: '#dceedc',
          200: '#bcdcbd',
          300: '#8ec391',
          400: '#5ea562',
          500: '#3b8a3e',
          600: '#2d6e31',
          700: '#255828',
          800: '#1f4521',
          900: '#193a1b',
          950: '#0c1f0d',
        },
        sage: {
          50: '#f6f7f2',
          100: '#eaede0',
          200: '#d4dac3',
          300: '#b7c09f',
          400: '#99a27d',
          500: '#7e8a62',
          600: '#636f4b',
          700: '#4e573b',
          800: '#3f4531',
          900: '#363b2c',
        },
        earth: {
          50: '#faf8f3',
          100: '#f3ede0',
          200: '#e4d8bc',
          300: '#d2be93',
          400: '#bda069',
          500: '#a98448',
          600: '#8e6b38',
          700: '#71522f',
          800: '#5c4129',
          900: '#4d3825',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
