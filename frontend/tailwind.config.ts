import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f7fb',
          100: '#e5ecf5',
          200: '#c7d4e6',
          300: '#94a9c7',
          400: '#5e78a3',
          500: '#3a557f',
          600: '#29406a',
          700: '#1e3257',
          800: '#162542',
          900: '#0e1a31',
        },
        navy: {
          50: '#f4f7fb',
          100: '#e5ecf5',
          200: '#c7d4e6',
          300: '#94a9c7',
          400: '#5e78a3',
          500: '#3a557f',
          600: '#29406a',
          700: '#1e3257',
          800: '#162542',
          900: '#0e1a31',
        },
        accent: {
          400: '#d4a857',
          500: '#b5872f',
          600: '#8e6620',
        },
        surface: {
          0: '#ffffff',
          50: '#f7f9fc',
          100: '#eef2f8',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'app-gradient':
          'linear-gradient(180deg, #f7f9fc 0%, #eef2f8 60%, #e5ecf5 100%)',
        'brand-gradient':
          'linear-gradient(135deg, #1e3257 0%, #29406a 50%, #3a557f 100%)',
        'brand-gradient-soft':
          'linear-gradient(135deg, #29406a 0%, #3a557f 100%)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(14,26,49,0.04), 0 1px 3px rgba(14,26,49,0.06)',
        elevated:
          '0 8px 24px -8px rgba(14,26,49,0.18), 0 2px 6px rgba(14,26,49,0.06)',
        'ring-navy': '0 0 0 4px rgba(58,85,127,0.15)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};

export default config;
