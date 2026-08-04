/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',   // light-only default, class-based opt-in
  theme: {
    extend: {
      colors: {
        /* ── IlmForge Brand ─────────────────── */
        teal: {
          50:  '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',   /* PRIMARY */
          800: '#115E59',
          900: '#0F4C45',   /* SIDEBAR */
          950: '#0A3530',
          DEFAULT: '#0F766E',
        },
        gold: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',   /* ACCENT */
          700: '#B45309',
          DEFAULT: '#D97706',
        },
        /* ── Neutral / Background ───────────── */
        surface: {
          bg:     '#F8FAFC',  /* page background */
          card:   '#FFFFFF',  /* card surface    */
          border: '#E5E7EB',
        },
        charcoal: {
          50:  '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',   /* PRIMARY TEXT */
          900: '#111827',
          DEFAULT: '#1F2937',
        },
        /* ── Status ─────────────────────────── */
        success: { DEFAULT:'#10B981', light:'#D1FAE5', dark:'#065F46' },
        warning: { DEFAULT:'#D97706', light:'#FEF3C7', dark:'#78350F' },
        danger:  { DEFAULT:'#EF4444', light:'#FEE2E2', dark:'#7F1D1D' },
        info:    { DEFAULT:'#3B82F6', light:'#DBEAFE', dark:'#1E3A8A' },
      },
      fontFamily: {
        sans:    ["'Poppins'", "'Inter'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ["'JetBrains Mono'", "'Fira Code'", 'monospace'],
        display: ["'Poppins'", 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        'sm':   '6px',
        DEFAULT:'10px',
        'md':   '12px',
        'lg':   '14px',
        'xl':   '18px',
        '2xl':  '24px',
      },
      boxShadow: {
        'xs':   '0 1px 2px rgba(0,0,0,0.04)',
        'sm':   '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card': '0 2px 8px rgba(15,118,110,0.08), 0 1px 3px rgba(0,0,0,0.05)',
        'hover':'0 8px 24px rgba(15,118,110,0.12)',
        'teal': '0 4px 14px rgba(15,118,110,0.25)',
        'gold': '0 4px 14px rgba(217,119,6,0.25)',
        'modal':'0 20px 60px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-up':    'fadeUp 0.25s ease',
        'fade-in':    'fadeIn 0.2s ease',
        'slide-in':   'slideIn 0.22s ease',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeUp:    { from:{ opacity:'0', transform:'translateY(10px)' }, to:{ opacity:'1', transform:'translateY(0)' } },
        fadeIn:    { from:{ opacity:'0' }, to:{ opacity:'1' } },
        slideIn:   { from:{ opacity:'0', transform:'translateX(-8px)' }, to:{ opacity:'1', transform:'translateX(0)' } },
        pulseSoft: { '0%,100%':{ opacity:'1' }, '50%':{ opacity:'.7' } },
        shimmer:   { '0%':{ backgroundPosition:'-200% 0' }, '100%':{ backgroundPosition:'200% 0' } },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '72': '18rem',
        '80': '20rem',
      },
    },
  },
  plugins: [],
};
