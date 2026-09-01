import type { Ref } from 'vue'
import type { AppTheme } from '~/types/AppTheme'
import { watch } from 'vue'

const APP_THEME_STORAGE_KEY: string = 'deckpilot-theme'

/**
 * App theme state, mirrored on `<html class="dark">` for Nuxt UI / Tailwind.
 * @returns Theme ref plus init/set helpers.
 */
export function useAppTheme(): {
  theme: Ref<AppTheme>
  initTheme: () => void
  setTheme: (next: AppTheme) => void
} {
  const theme: Ref<AppTheme> = useState('app-theme', (): AppTheme => 'dark')

  /** Mirror the current theme on `<html>` (Tailwind `dark` class). */
  function applyThemeToDocument(): void {
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', theme.value === 'dark')
    }
  }

  /** Load the persisted theme (client-side) and apply it to the document. */
  function initTheme(): void {
    if (import.meta.client) {
      const stored: string | null = localStorage.getItem(APP_THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') {
        theme.value = stored
      }
      applyThemeToDocument()
    }
  }

  /**
   * Set the theme, persist and apply the choice.
   * @param next - Theme to switch to.
   */
  function setTheme(next: AppTheme): void {
    theme.value = next
    if (import.meta.client) {
      localStorage.setItem(APP_THEME_STORAGE_KEY, next)
    }
    applyThemeToDocument()
  }

  watch(theme, (): void => {
    applyThemeToDocument()
  })

  return { theme, initTheme, setTheme }
}
