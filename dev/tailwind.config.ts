import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // LegalMind Brand Colors
        primary: {
          50: '#FFF4F1',
          100: '#FFE6DC',
          200: '#FFCCB8',
          300: '#FFB394',
          400: '#FF9970',
          500: '#FF6B35', // Main Orange
          600: '#E55A2B',
          700: '#CC4A1F',
          800: '#B23A13',
          900: '#992A07',
          950: '#7F1A00',
        },
        // Neutral Colors
        neutral: {
          50: '#F8F9FA',
          100: '#F1F3F4',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#ADB5BD',
          600: '#6C757D',
          700: '#495057',
          800: '#343A40',
          900: '#212529',
        },
        // Functional Colors
        success: {
          50: '#F0FDF4',
          500: '#28A745',
          600: '#22C55E',
        },
        warning: {
          50: '#FFFBEB',
          500: '#FFC107',
          600: '#F59E0B',
        },
        error: {
          50: '#FEF2F2',
          500: '#DC3545',
          600: '#EF4444',
        },
        info: {
          50: '#EFF6FF',
          500: '#17A2B8',
          600: '#3B82F6',
        },
        background: 'hsl(var(--color-background))',
        foreground: 'hsl(var(--color-foreground))',
        card: {
          DEFAULT: 'hsl(var(--color-card))',
          foreground: 'hsl(var(--color-card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--color-popover))',
          foreground: 'hsl(var(--color-popover-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--color-muted))',
          foreground: 'hsl(var(--color-muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent))',
          foreground: 'hsl(var(--color-accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--color-destructive))',
          foreground: 'hsl(var(--color-destructive-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--color-secondary))',
          foreground: 'hsl(var(--color-secondary-foreground))'
        },
        border: 'hsl(var(--color-border))',
        input: 'hsl(var(--color-input))',
        ring: 'hsl(var(--color-ring))',
        chart: {
          '1': 'hsl(var(--color-chart-1))',
          '2': 'hsl(var(--color-chart-2))',
          '3': 'hsl(var(--color-chart-3))',
          '4': 'hsl(var(--color-chart-4))',
          '5': 'hsl(var(--color-chart-5))'
        }
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
