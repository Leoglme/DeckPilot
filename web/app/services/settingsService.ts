import { invoke } from '@tauri-apps/api/core'
import type { AppSettingKey, AppSettings } from '~/types/AppSettings'

/** Read and write persisted desktop preferences through Tauri. */
export class SettingsService {
  /**
   * Load every settings toggle from disk.
   * @returns The current persisted preferences.
   */
  static async getSettings(): Promise<AppSettings> {
    return invoke<AppSettings>('get_app_settings')
  }

  /**
   * Update one settings toggle and persist it.
   * @param key - Setting identifier.
   * @param value - New toggle value.
   */
  static async setSetting(key: AppSettingKey, value: boolean): Promise<void> {
    await invoke('set_app_setting', { key, value })
  }
}
