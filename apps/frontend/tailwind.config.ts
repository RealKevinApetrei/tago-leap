import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Source Code Pro', 'SF Mono', 'Monaco', 'Menlo', 'monospace'],
      },
      colors: {
        // TAGO Research brand colors - black/white/yellow foundation
        tago: {
          black: '#000000',
          white: '#FFFFFF',
          // Yellow spectrum
          yellow: {
            50: '#FFF9E6',
            100: '#FFF3CC',
            200: '#FFE999',
            300: '#FFDF66',
            400: '#FFD633', // Primary yellow
            500: '#FFCD00',
            600: '#E6B800',
            700: '#CC9F00',
            800: '#997800',
            900: '#665000',
          },
          // Grayscale (white opacity based for dark backgrounds)
          gray: {
            50: 'rgba(255, 255, 255, 0.95)',
            100: 'rgba(255, 255, 255, 0.85)',
            200: 'rgba(255, 255, 255, 0.70)',
            300: 'rgba(255, 255, 255, 0.60)',
            400: 'rgba(255, 255, 255, 0.40)',
            500: 'rgba(255, 255, 255, 0.20)',
            600: 'rgba(255, 255, 255, 0.10)',
            700: 'rgba(255, 255, 255, 0.05)',
            800: 'rgba(255, 255, 255, 0.03)',
            900: 'rgba(255, 255, 255, 0.01)',
          },
        },
        // Semantic color aliases
        background: {
          DEFAULT: '#000000',
          elevated: 'rgba(255, 255, 255, 0.03)',
        },
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.03)',
          hover: 'rgba(255, 255, 255, 0.05)',
          active: 'rgba(255, 255, 255, 0.08)',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.15)',
          active: 'rgba(255, 255, 255, 0.20)',
        },
        text: {
          primary: '#FFFFFF',
          secondary: 'rgba(255, 255, 255, 0.70)',
          tertiary: 'rgba(255, 255, 255, 0.40)',
          muted: 'rgba(255, 255, 255, 0.20)',
        },
        accent: {
          DEFAULT: '#FFD633',
          hover: '#FFDF66',
          active: '#FFCD00',
          muted: 'rgba(255, 214, 51, 0.20)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-yellow': 'linear-gradient(135deg, #FFD633 0%, #FFCD00 100%)',
        'gradient-yellow-hover': 'linear-gradient(135deg, #FFDF66 0%, #FFD633 100%)',
        'gradient-subtle': 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'grid-pattern': 'radial-gradient(circle_at_center, rgba(255, 215, 0, 0.03) 1px, transparent 1px)',
      },
      boxShadow: {
        'glow-white': '0 0 30px rgba(255, 255, 255, 0.1)',
        'glow-yellow': '0 0 30px rgba(255, 205, 0, 0.2)',
        'glow-yellow-lg': '0 0 40px rgba(255, 205, 0, 0.3)',
        card: '0 4px 20px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // ASCII animations
        'typing-cursor': 'blink 1s step-end infinite',
        'glitch': 'glitch 0.3s ease-in-out infinite',
        'glitch-once': 'glitch 0.3s ease-in-out',
        'matrix-fall': 'matrixFall 5s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'particle-flow': 'particleFlow 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // ASCII keyframes
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        matrixFall: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(255, 214, 51, 0.3)',
            borderColor: 'rgba(255, 214, 51, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(255, 214, 51, 0.6)',
            borderColor: 'rgba(255, 214, 51, 0.8)',
          },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        particleFlow: {
          '0%': { transform: 'translateX(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateX(100px)', opacity: '0' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontSize: {
        'display': ['5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'h1': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'h2': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h3': ['2.25rem', { lineHeight: '1.2' }],
        'h4': ['1.875rem', { lineHeight: '1.3' }],
        'h5': ['1.5rem', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
};

export default config;
