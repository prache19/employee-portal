import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          500: '#3b66f5',
          600: '#2851dd',
          700: '#1f3eae',
        },
      },
    },
  },
  plugins: [],
};

export default config;
