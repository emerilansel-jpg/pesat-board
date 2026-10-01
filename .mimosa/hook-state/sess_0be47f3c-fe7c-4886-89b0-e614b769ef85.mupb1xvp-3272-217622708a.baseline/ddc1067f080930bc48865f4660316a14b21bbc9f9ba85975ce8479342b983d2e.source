/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Pesat Board design tokens (design.md §2)
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        ink: {
          400: '#94A3B8',
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        },
        canvas: '#F8FAFC',
        sunken: '#F1F5F9',
        line: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },
        wa: {
          50: '#F0F9F0',
          100: '#D9FDD3',
          500: '#25D366',
          600: '#1EBE5B',
          700: '#075E54',
          tick: '#53BDEB',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        // Label card palette (design.md §2.5)
        label: {
          green: { DEFAULT: '#61BD4F', subtle: '#E3F6DF', text: '#1F660D' },
          yellow: { DEFAULT: '#F2D600', subtle: '#FDF6C8', text: '#6B5B00' },
          orange: { DEFAULT: '#FF9F1A', subtle: '#FFEED3', text: '#8A4B00' },
          red: { DEFAULT: '#EB5A46', subtle: '#FCE3E0', text: '#8F1D10' },
          purple: { DEFAULT: '#C377E0', subtle: '#F6E8FC', text: '#6A1B8A' },
          blue: { DEFAULT: '#0079BF', subtle: '#DDF0FA', text: '#005A8F' },
          sky: { DEFAULT: '#00C2E0', subtle: '#DAF6FC', text: '#00687A' },
          lime: { DEFAULT: '#51E898', subtle: '#DEFCEB', text: '#0C6B3F' },
          pink: { DEFAULT: '#FF78CB', subtle: '#FFE6F5', text: '#8F1B5E' },
          black: { DEFAULT: '#344563', subtle: '#E4E7EC', text: '#1D2B45' },
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        card: '0 1px 2px 0 rgba(9,30,66,.13), 0 0 1px 0 rgba(9,30,66,.13)',
        raised: '0 4px 8px -2px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)',
        pop: '0 8px 16px -4px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)',
        modal: '0 16px 40px -8px rgba(15,23,42,.35)',
        navbar: '0 1px 0 rgba(9,30,66,.1)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      zIndex: {
        navbar: '30',
        boardheader: '20',
        popover: '40',
        modal: '50',
        toast: '60',
        drag: '70',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        shimmer: 'shimmer 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
