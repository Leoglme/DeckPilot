export default defineAppConfig({
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'zinc',
    },
    button: {
      slots: {
        base: 'inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50',
      },
      defaultVariants: {
        size: 'md',
      },
    },
    card: {
      slots: {
        root: 'rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] shadow-none',
      },
    },
    modal: {
      slots: {
        overlay: 'bg-[var(--app-overlay)]',
        content: 'rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)]',
      },
    },
  },
})
