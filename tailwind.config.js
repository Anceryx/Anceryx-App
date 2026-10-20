/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/renderer/**/*.{ts,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Resolved through CSS variables defined in index.css.
        // :root defines dark values; .light class overrides them for light mode.
        'background-primary': 'var(--color-bg-primary)',
        'background-secondary': 'var(--color-bg-secondary)',
        'background-tertiary': 'var(--color-bg-tertiary)',
        'background-elevated': 'var(--color-bg-elevated)',
        'background-panel': 'var(--color-bg-panel)',
        'accent': 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-secondary': 'var(--color-accent-secondary)',
        'accent-red': 'var(--color-accent-red)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-disabled': 'var(--color-text-disabled)',
        'link': 'var(--color-link)',
        'border': 'var(--color-border)',
        'border-hover': 'var(--color-border-hover)',
        'surface-hover': 'var(--color-surface-hover)',
        'surface-selected': 'var(--color-surface-selected)',
        'message-highlight': 'var(--color-message-highlight)'
      }
    }
  },
  plugins: []
}
