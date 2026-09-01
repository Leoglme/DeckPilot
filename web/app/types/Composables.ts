import type { ComputedRef } from 'vue'

/** Desktop runtime detection helpers for the Tauri shell. */
export type UseDesktopRuntimeReturn = {
  isDesktopApp: ComputedRef<boolean>
  isLocalDev: boolean
  isProdDesktop: ComputedRef<boolean>
}
