/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './reconciliation/**/*.{js,ts,jsx,tsx,mdx}',
    './ai/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        foreground: '#f8fafc',
        card: {
          DEFAULT: '#111827',
          foreground: '#f8fafc',
        },
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          foreground: '#ffffff',
        },
        emerald: {
          500: '#10b981',
          400: '#34d399',
        },
        amber: {
          500: '#f59e0b',
          400: '#fbbf24',
        },
        rose: {
          500: '#f43f5e',
          400: '#fb7185',
        }
      },
    },
  },
  plugins: [],
}
