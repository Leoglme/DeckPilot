import { invoke } from '@tauri-apps/api/core'
import type { Driver, DriverCategory, DriverFreshness, RawDriver } from '~/types/Health'

/** Maps a Windows device class to a friendly display category. */
const CATEGORY_BY_CLASS: Record<string, DriverCategory> = {
  DISPLAY: 'gpu',
  NET: 'network',
  MEDIA: 'audio',
  SYSTEM: 'system',
  HDC: 'storage',
  SCSIADAPTER: 'storage',
}

/** Name fragments of entries that are shims / provisioning, not user-updatable drivers. */
const NON_DRIVER_NAMES: string[] = [
  'compatibility database',
  'provisioning',
  'special tools',
  'crash defender',
  'virtual bus',
]

/** A driver newer than this many months is considered recent. */
const RECENT_MONTHS: number = 24

/** Demo drivers shown in a plain browser (no Tauri) so the page still renders in development. */
const DEMO_DRIVERS: RawDriver[] = [
  { name: 'Carte graphique', provider: 'NVIDIA', version: '—', date: '', deviceClass: 'DISPLAY' },
  { name: 'Réseau Wi-Fi', provider: 'Realtek', version: '—', date: '', deviceClass: 'NET' },
  { name: 'Audio', provider: 'Realtek', version: '—', date: '', deviceClass: 'MEDIA' },
]

/** Access to the machine's real drivers and health. */
export class HealthService {
  /**
   * List the machine's real installed drivers, prepared for display (category + freshness).
   * @returns The drivers, filtered of non-driver shims.
   */
  static async listDrivers(): Promise<Driver[]> {
    const raws: RawDriver[] = await HealthService.fetchRaw()
    return raws
      .filter((raw: RawDriver): boolean => !HealthService.isNonDriver(raw.name))
      .map((raw: RawDriver): Driver => HealthService.toDriver(raw))
  }

  /** Open the Windows Update panel — the safe, real place drivers get updated (desktop only). */
  static async openWindowsUpdate(): Promise<void> {
    if (!HealthService.isDesktopRuntime()) {
      return
    }
    try {
      await invoke('health_open_windows_update')
    } catch (error: unknown) {
      console.warn('[DeckPilot] Ouverture de Windows Update échouée', error)
    }
  }

  /**
   * Open a web search that lands on the exact driver's download page — more useful than a vendor
   * homepage, and never a dead link. (True one-click auto-install per vendor is a separate, much
   * larger feature that would need per-vendor download + silent-install automation.)
   * @param name - The device/driver name (e.g. "NVIDIA GeForce RTX 4070 Ti").
   * @param provider - The driver's provider (e.g. "Realtek Semiconductor Corp.").
   */
  static async openUpdateSource(name: string, provider: string): Promise<void> {
    if (!HealthService.isDesktopRuntime()) {
      return
    }
    // Build a `+`-joined query (no `%`/`&`) so the desktop `start` command opens it cleanly.
    const query: string = `${name} ${provider} driver`
      .replace(/[^a-z0-9 ]/gi, ' ')
      .trim()
      .replace(/\s+/g, '+')
    try {
      await invoke('health_open_url', { url: `https://www.google.com/search?q=${query}` })
    } catch (error: unknown) {
      console.warn('[DeckPilot] Recherche du pilote échouée', error)
    }
  }

  /**
   * Fetch the raw driver list from the desktop bridge, or a demo set in a plain browser.
   * @returns The raw drivers.
   */
  private static async fetchRaw(): Promise<RawDriver[]> {
    if (!HealthService.isDesktopRuntime()) {
      return DEMO_DRIVERS.map((driver: RawDriver): RawDriver => ({ ...driver }))
    }
    try {
      return await invoke<RawDriver[]>('health_list_drivers')
    } catch (error: unknown) {
      console.warn('[DeckPilot] Lecture des pilotes échouée', error)
      return []
    }
  }

  /**
   * Turn a raw Windows driver into a display driver (category + freshness).
   * @param raw - The raw driver.
   * @returns The prepared driver.
   */
  private static toDriver(raw: RawDriver): Driver {
    return {
      id: `${raw.deviceClass}:${raw.name}`,
      name: raw.name,
      provider: raw.provider,
      version: raw.version,
      date: raw.date,
      category: CATEGORY_BY_CLASS[raw.deviceClass] ?? 'system',
      freshness: HealthService.freshness(raw.date),
    }
  }

  /**
   * Whether a driver name is a shim / provisioning entry rather than a real updatable driver.
   * @param name - The driver name.
   * @returns True when it should be hidden.
   */
  private static isNonDriver(name: string): boolean {
    const haystack: string = name.toLowerCase()
    return NON_DRIVER_NAMES.some((fragment: string): boolean => haystack.includes(fragment))
  }

  /**
   * Classify a driver's age from its date.
   * @param date - The driver date (`yyyy-MM-dd`), possibly empty.
   * @returns `recent` when within the freshness window, `old` otherwise.
   */
  private static freshness(date: string): DriverFreshness {
    if (!date) {
      return 'old'
    }
    const time: number = new Date(date).getTime()
    if (Number.isNaN(time)) {
      return 'old'
    }
    const months: number = (Date.now() - time) / (1000 * 60 * 60 * 24 * 30)
    return months <= RECENT_MONTHS ? 'recent' : 'old'
  }

  /**
   * Whether the app runs inside the Tauri desktop shell.
   * @returns True in the desktop build, false in a plain browser.
   */
  private static isDesktopRuntime(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  }
}
