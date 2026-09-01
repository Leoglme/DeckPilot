import { invoke } from '@tauri-apps/api/core'
import type { EnginePayloadSlot, EngineSlot } from '~/types/Hardware'
import type { RgbDevice } from '~/types/RgbDevice'

/** Bridge to the desktop hardware layer (OpenRGB + AIO via Tauri); no-ops in a plain browser. */
export class HardwareService {
  /** Latest rig look waiting to be pushed to the effect engine. */
  private static pendingSlots: EngineSlot[] | null = null

  /** Whether a push is currently in flight (used to serialise rapid calls). */
  private static isBusy: boolean = false

  /**
   * Push the whole rig's live look (per-component effect + colours + brightness + on/off) to the
   * Rust effect engine, which animates every component from one shared clock. Coalesces rapid
   * calls, keeping only the latest. No-op in a plain browser.
   * @param slots - The resolved look of every component.
   */
  static setEngineState(slots: EngineSlot[]): void {
    if (!HardwareService.isDesktopRuntime()) {
      return
    }
    HardwareService.pendingSlots = slots
    HardwareService.drain()
  }

  /**
   * Prepare every device for live control: set a controllable (Direct) mode so colours apply,
   * and give every unconfigured ARGB zone a default size so fans/strips light up — all without
   * the user touching OpenRGB (desktop only).
   * @returns The number of zones configured, or 0 in the browser / on failure.
   */
  static async prepareDevices(): Promise<number> {
    if (!HardwareService.isDesktopRuntime()) {
      return 0
    }
    try {
      return await invoke<number>('rgb_prepare_devices')
    } catch (error: unknown) {
      console.warn('[DeckPilot] Préparation du matériel échouée', error)
      return 0
    }
  }

  /**
   * List the RGB controllers OpenRGB currently detects, with their LED counts (desktop only).
   * @returns The detected devices, or an empty list in the browser / on failure.
   */
  static async getDevices(): Promise<RgbDevice[]> {
    if (!HardwareService.isDesktopRuntime()) {
      return []
    }
    try {
      return await invoke<RgbDevice[]>('rgb_get_devices')
    } catch (error: unknown) {
      console.warn('[DeckPilot] Détection RGB échouée', error)
      return []
    }
  }

  /**
   * Detect the Aorus AIO pump (its HID interface).
   * @returns True when the reverse-engineered watercooling is connected.
   */
  static async isAioPresent(): Promise<boolean> {
    if (!HardwareService.isDesktopRuntime()) {
      return false
    }
    try {
      return await invoke<boolean>('rgb_aio_present')
    } catch (error: unknown) {
      console.warn('[DeckPilot] Détection watercooling échouée', error)
      return false
    }
  }

  /**
   * Warm the hardware pipeline at boot: launch + connect OpenRGB and open the AIO now, so the
   * very first colour the user picks is instant instead of waiting for the engine to start.
   */
  static async warmup(): Promise<void> {
    if (!HardwareService.isDesktopRuntime()) {
      return
    }
    await HardwareService.prepareDevices()
    await HardwareService.isAioPresent()
  }

  /**
   * Flush the pending rig look to the engine, one call at a time, keeping only the latest.
   * @returns Resolves once the queue is empty.
   */
  private static async drain(): Promise<void> {
    if (HardwareService.isBusy) {
      return
    }
    HardwareService.isBusy = true
    try {
      while (HardwareService.pendingSlots !== null) {
        const slots: EngineSlot[] = HardwareService.pendingSlots
        HardwareService.pendingSlots = null
        await HardwareService.pushState(slots)
      }
    } catch (error: unknown) {
      console.warn('[DeckPilot] Échec du pilotage RGB', error)
    } finally {
      HardwareService.isBusy = false
    }
  }

  /**
   * Send one rig look to the Rust effect engine (converts each hex colour to `[r, g, b]` channels).
   * @param slots - The resolved look of every component.
   * @returns Resolves once the push has been sent.
   */
  private static async pushState(slots: EngineSlot[]): Promise<void> {
    const payload: EnginePayloadSlot[] = slots.map((slot: EngineSlot): EnginePayloadSlot => ({
      slot: slot.slot,
      effect: slot.effect,
      colors: slot.colors.map((hex: string): [number, number, number] => HardwareService.hexToRgb(hex)),
      brightness: Math.max(0, Math.min(100, Math.round(slot.brightness))),
      on: slot.on,
    }))
    await invoke('rgb_set_state', { slots: payload })
  }

  /**
   * Whether the app runs inside the Tauri desktop shell.
   * @returns True in the desktop build, false in a plain browser.
   */
  private static isDesktopRuntime(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  }

  /**
   * Convert a hex colour to its 8-bit red, green and blue channels.
   * @param hex - The colour, e.g. `#28D7F0`.
   * @returns The channels as a `[r, g, b]` tuple (0-255).
   */
  private static hexToRgb(hex: string): [number, number, number] {
    const value: string = hex.replace('#', '')
    const int: number = Number.parseInt(value, 16)
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
  }
}
