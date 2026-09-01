import type { UseDesktopRuntimeReturn } from '~/types/Composables'
import type { ComputedRef } from 'vue'

/**
 * Detect the DeckPilot runtime: Tauri desktop shell vs plain browser, and local dev vs packaged app.
 *
 * @returns Desktop + environment detection helpers.
 */
export function useDesktopRuntime(): UseDesktopRuntimeReturn {
  const isDesktopApp: ComputedRef<boolean> = computed((): boolean => {
    if (!import.meta.client) {
      return false
    }
    const w: Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown } = window as Window & {
      __TAURI__?: unknown
      __TAURI_INTERNALS__?: unknown
    }
    return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__)
  })

  const isLocalDev: boolean = import.meta.dev

  const isProdDesktop: ComputedRef<boolean> = computed((): boolean => isDesktopApp.value && !isLocalDev)

  return { isDesktopApp, isLocalDev, isProdDesktop }
}
