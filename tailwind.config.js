/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom dark mode palette inspired by the image
        dark: {
          bg: '#0D0B14', // Deep purple-black background
          surface: '#1A1820', // Slightly lighter surface for cards
          card: '#1F1D28', // Card background
          border: '#393649', // Borders and dividers
          text: {
            primary: '#E0DDF0', // Light lavender text
            secondary: '#A09CB8', // Muted purple-gray text
            muted: '#6E6A8A',
          },
        },
        // Accent color for buttons and highlights
        accent: {
          DEFAULT: '#7F56D9',
          50: '#F9F5FF',
          100: '#F4EBFF',
          200: '#E9D7FE',
          300: '#D6BBFB',
          400: '#B692F6',
          500: '#9E77ED',
          600: '#7F56D9',
          700: '#6941C6',
          800: '#53389E',
          900: '#42307D',
        },
        // Keeping the original palettes for light mode
        primary: {
          50: '#f0f0ff',
          100: '#e5e5ff',
          200: '#ccccff',
          300: '#b3b3ff',
          400: '#9999ff',
          500: '#8080ff',
          600: '#6666ff',
          700: '#4d4dff',
          800: '#3333ff',
          900: '#1a1aff',
          950: '#0d0dcc'
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(25, 24, 32, 0.5)', // Updated dark glass
          purple: 'rgba(127, 86, 217, 0.1)',
          blue: 'rgba(128, 128, 255, 0.1)'
        },
      },
      backgroundImage: {
        'icon-gradient': 'linear-gradient(to right, #E0DDF0, #9E77ED)',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px'
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 4s ease-in-out infinite alternate', // Slower glow
        'pulse-border': 'pulse-border 3s ease-in-out infinite',
        'aurora': 'aurora 60s linear infinite',
      },
      keyframes: {
        'gradient-y': {
          '0%, 100%': {
            'background-size':'400% 400%',
            'background-position': 'center top'
          },
          '50%': {
            'background-size':'200% 200%',
            'background-position': 'center center'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size':'400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size':'200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size':'400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size':'200% 200%',
            'background-position': 'right center'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        glow: {
          'from': { 'box-shadow': '0 0 10px -5px #7F56D9' },
          'to': { 'box-shadow': '0 0 20px 5px #7F56D9' }
        },
        aurora: {
          from: {
            backgroundPosition: '50% 50%, 50% 50%',
          },
          to: {
            backgroundPosition: '350% 50%, 350% 50%',
          },
        },
        'pulse-border': {
          '0%, 100%': { 'box-shadow': '0 0 0 0 rgba(127, 86, 217, 0.4)' },
          '50%': { 'box-shadow': '0 0 0 4px rgba(127, 86, 217, 0)' }
        }
      },
    },
  },
  plugins: [],
};
