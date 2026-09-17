/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glow': '0 0 20px rgba(214, 168, 79, 0.45)',
        '3d': '0 20px 40px rgba(0,0,0,0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      },
      colors: {
        primary: {
          50: '#eff6f8',
          100: '#d7e9ee',
          200: '#adcbdc',
          300: '#7da3bd',
          400: '#4d789b',
          500: '#173e62',
          600: '#123b63',
          700: '#102d50',
          800: '#0f2440',
          900: '#0c2039',
        },
        gold: {
          50: '#fffaf1',
          100: '#f8eac4',
          200: '#e8cf8e',
          300: '#d6a84f',
          400: '#bf8e42',
          500: '#b88a34',
          600: '#9c7038',
          700: '#795728',
        },
        status: {
          available: '#22c55e',
          occupied: '#ef4444',
          cleaning: '#d6a84f',
          maintenance: '#f97316',
          blocked: '#6b7280',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
