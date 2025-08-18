/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom dark mode palette
        dark: {
          bg: '#0a0a0b',
          surface: '#1a1a1d',
          card: '#2a2a2e',
          border: '#3a3a3f',
          text: {
            primary: '#ffffff',
            secondary: '#b3b3b3',
            muted: '#8b8b8b'
          }
        },
        // Purple-blue gradient palette
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
        accent: {
          50: '#f8f0ff',
          100: '#f0e5ff',
          200: '#e6ccff',
          300: '#d9b3ff',
          400: '#cc99ff',
          500: '#bf80ff',
          600: '#b366ff',
          700: '#a64dff',
          800: '#9933ff',
          900: '#8c1aff',
          950: '#7300e6'
        },
        // Glassmorphism colors
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(0, 0, 0, 0.3)',
          purple: 'rgba(179, 179, 255, 0.1)',
          blue: 'rgba(128, 128, 255, 0.1)'
        },
        nebula: {
          900: '#07070a',
          800: '#0d0f17',
          700: '#111426',
          600: '#181b32'
        },
        plasma: {
          400: '#8a3dff',
          500: '#6f30ff',
          600: '#5524d6'
        }
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
        'glow': 'glow 2s ease-in-out infinite alternate',
        aurora: 'aurora 18s ease-in-out infinite',
        shimmer: 'shimmer 4s linear infinite',
        'pulse-border': 'pulse-border 3s ease-in-out infinite'
      },
      keyframes: {
        'gradient-y': {
          '0%, 100%': {
            transform: 'translateY(-50px)',
          },
          '50%': {
            transform: 'translateY(50px)',
          },
        },
        'gradient-x': {
          '0%, 100%': {
            transform: 'translateX(-50px)',
          },
          '50%': {
            transform: 'translateX(50px)',
          },
        },
        'gradient-xy': {
          '0%, 100%': {
            transform: 'translate(-50px, -50px)',
          },
          '25%': {
            transform: 'translate(50px, -50px)',
          },
          '50%': {
            transform: 'translate(50px, 50px)',
          },
          '75%': {
            transform: 'translate(-50px, 50px)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        glow: {
          from: {
            'box-shadow': '0 0 20px rgba(179, 179, 255, 0.4)'
          },
          to: {
            'box-shadow': '0 0 30px rgba(179, 179, 255, 0.8)'
          }
        },
        aurora: {
          '0%': { transform: 'translateY(0) scale(1)', filter: 'hue-rotate(0deg)' },
          '50%': { transform: 'translateY(-20%) scale(1.1)', filter: 'hue-rotate(45deg)' },
          '100%': { transform: 'translateY(0) scale(1)', filter: 'hue-rotate(0deg)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' }
        },
        'pulse-border': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(128,128,255,0.35), 0 0 0 0 rgba(179,128,255,0.25)' },
          '50%': { boxShadow: '0 0 25px 2px rgba(128,128,255,0.55), 0 0 45px 8px rgba(179,128,255,0.25)' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'dark-gradient': 'linear-gradient(135deg, #0a0a0b 0%, #1a1a1d 50%, #2a2a2e 100%)',
        'purple-gradient': 'linear-gradient(135deg, #8c1aff 0%, #6666ff 50%, #4d4dff 100%)',
      }
    },
  },
  plugins: [],
};
