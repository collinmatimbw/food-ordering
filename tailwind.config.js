/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F1F8F3',
          100: '#DAF1DE',
          200: '#C2E0CB',
          300: '#8EB69B',
          400: '#5E8C73',
          500: '#235347',
          600: '#163832',
          700: '#0B2B26',
          800: '#051F20',
          900: '#031415',
        },
        ink: {
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
          600: '#4B5563',
          500: '#6B7280',
          400: '#9CA3AF',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 6px 16px -8px rgba(16,24,40,0.12)',
        lift: '0 2px 4px rgba(16,24,40,0.05), 0 18px 36px -16px rgba(16,24,40,0.24)',
        brand: '0 10px 24px -10px rgba(22,56,50,0.5)',
        sheet: '0 24px 60px -20px rgba(16,24,40,0.35)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        marquee: {
          '0%,100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-4px)' },
        },
        riseIn: {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        pop: 'pop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        shimmer: 'shimmer 1.6s infinite',
        marquee: 'marquee 2.4s ease-in-out infinite',
        riseIn: 'riseIn 0.45s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
}
