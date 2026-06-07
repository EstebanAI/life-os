/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0D0D',
        surface: '#161616',
        card: '#1C1C1C',
        'card-hover': '#222222',
        border: '#2A2A2A',
        'text-primary': '#F5F5F5',
        'text-secondary': '#A0A0A0',
        'text-muted': '#606060',
        accent: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          dark: '#6D28D9',
          glow: 'rgba(124,58,237,0.25)',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
