/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette
        glass: "rgba(17, 25, 40, 0.75)",
        glassBorder: "rgba(255, 255, 255, 0.125)",
        neonBlue: "#00f3ff",
        neonPurple: "#bc13fe",
        neonGreen: "#00ff9d",
        darkBg: "#050b14",
        
        // Additional semantic colors
        primary: {
          50: '#e6f9ff',
          100: '#b3f0ff',
          200: '#80e7ff',
          300: '#4dddff',
          400: '#1ad4ff',
          500: '#00f3ff', // neonBlue
          600: '#00c2cc',
          700: '#009199',
          800: '#006166',
          900: '#003033',
        },
        secondary: {
          50: '#f4e6ff',
          100: '#e1b3ff',
          200: '#ce80ff',
          300: '#bb4dff',
          400: '#a81aff',
          500: '#bc13fe', // neonPurple
          600: '#9610cb',
          700: '#700c98',
          800: '#4a0865',
          900: '#240432',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'blob': 'blob 10s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'grid-move': 'grid-move 20s linear infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 5px rgba(0, 243, 255, 0.5)',
          },
          '50%': {
            opacity: '0.7',
            boxShadow: '0 0 20px rgba(0, 243, 255, 0.8)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'grid-move': {
          '0%': { transform: 'perspective(500px) rotateX(60deg) translateY(0)' },
          '100%': { transform: 'perspective(500px) rotateX(60deg) translateY(50px)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 243, 255, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 243, 255, 0.4)',
        'neon': '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}