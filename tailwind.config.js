/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // White paper, orange ink, and warm paper scraps for the NRG edition.
        base: 'var(--ui-base)',
        navbar: 'var(--ui-base)',
        surface: 'var(--ui-surface)',
        surface2: 'var(--ui-surface2)',
        surface3: 'var(--ui-surface3)',
        hairline: 'var(--ui-border)',
        ink: 'var(--ui-ink)',
        muted: 'var(--ui-muted)',
        accent: { DEFAULT: '#ce460c', dim: '#a63a0d', bright: '#a63a0d' },
        selected: { DEFAULT: '#ce460c', dim: '#a63a0d', bright: '#e46d30' },
        good: '#277552',
        warn: '#8c6416',
        mid: '#8c6416',
        bad: '#b34443',
        live: '#ce460c',
        score: {
          1: '#4f79df', 2: '#2e9fbd', 3: '#4bd389',
          4: '#d7c74f', 5: '#e79648', 6: '#f06b74',
        },
      },
      fontFamily: {
        display: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { lg: '0.25rem', xl: '0.25rem', '2xl': '0.25rem' },
      backgroundImage: {
        'grad-accent': 'linear-gradient(#a63a0d, #a63a0d)',
        'grad-accent-hover': 'linear-gradient(#ce460c, #ce460c)',
        'grad-selected': 'linear-gradient(#ce460c, #ce460c)',
        'grad-surface': 'linear-gradient(var(--ui-surface), var(--ui-surface))',
        'grad-surface2': 'linear-gradient(var(--ui-surface2), var(--ui-surface2))',
      },
      boxShadow: {
        'depth-xs': '0 2px 3px rgb(65 35 12 / 0.06)',
        'depth-sm': 'none',
        'depth-md': '0 14px 32px rgb(65 35 12 / 0.12)',
        'depth-lg': '0 22px 52px rgb(65 35 12 / 0.16)',
        button: '0 1px 2px rgb(65 35 12 / 0.08)',
        'button-hover': '0 0 0 1px rgb(206 70 12 / 0.25)',
        'button-active': 'inset 0 1px 2px rgb(65 35 12 / 0.16)',
        'focus-ring': '0 0 0 3px rgb(206 70 12 / 0.20)',
      },
      maxWidth: { content: '1400px' },
    },
  },
  plugins: [],
}
