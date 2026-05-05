/** @type {import('tailwindcss').Config} */

// Colors must stay in sync with constants/theme.ts
const electricDiner = {
  primary: '#C41E3A',
  secondary: '#2AF5FF',
  accent: '#FFC107',
  background: '#121212',
  surface: '#1E1E1E',
  'text-primary': '#FFFFFF',
  'text-secondary': '#A0A0A0',
  'badge-protein': '#FFC107',
  'badge-fiber': '#6B8F71',
  success: '#4CAF50',
  error: '#DC2626',
  warning: '#EA580C',
  border: '#2A2A2A',
};

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: electricDiner,
      fontFamily: {
        display: ['Bungee_400Regular'],
        body: ['Inter_400Regular'],
        'body-semibold': ['Inter_600SemiBold'],
        'body-bold': ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
