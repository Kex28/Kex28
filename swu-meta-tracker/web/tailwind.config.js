/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Neumorphic surface + ink tokens; the raw values live in index.css
        // as CSS variables so dark mode gets its own tuned set (not an invert).
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        'ink-secondary': 'var(--ink-secondary)',
        'ink-muted': 'var(--ink-muted)',
        accent: 'var(--accent)',
        'delta-up': 'var(--delta-up)',
        'delta-down': 'var(--delta-down)',
        hairline: 'var(--hairline)',
      },
      boxShadow: {
        neu: 'var(--shadow-neu)',
        'neu-sm': 'var(--shadow-neu-sm)',
        'neu-inset': 'var(--shadow-neu-inset)',
      },
      borderRadius: {
        neu: '1.25rem',
      },
    },
  },
  plugins: [],
}
