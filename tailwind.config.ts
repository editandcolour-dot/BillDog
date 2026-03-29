import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1F3A',
        blue: '#1A56DB',
        orange: {
          DEFAULT: '#F97316',
          light: '#FB923C',
        },
        'off-white': '#F8FAFF',
        grey: '#64748B',
        'light-grey': '#E2E8F0',
        success: '#10B981',
        error: '#EF4444',
        'footer-dark': '#070F1E',
      },
      fontFamily: {
        display: ['var(--font-bebas-neue)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      animation: {
        'fade-up': 'fadeUp 0.7s ease forwards',
        'fade-up-delay': 'fadeUp 0.7s ease 0.2s forwards',
        'fade-up-delay-2': 'fadeUp 0.7s ease 0.4s forwards',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
