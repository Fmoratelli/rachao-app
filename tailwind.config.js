/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:       '#0A0A0A',
        surface:   '#111111',
        elevated:  '#171717',
        line:      '#2A2A2A',
        chalk:     '#F8F5EC',
        'chalk-dim': '#6E6E76',
        orange: {
          DEFAULT: '#FF8410',
          hi:      '#FF9A3A',
        },
      },
      fontFamily: {
        display: ['"Alfa Slab One"', 'system-ui', 'sans-serif'],
        brush:   ['"Caveat Brush"', '"Comic Sans MS"', 'cursive'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
