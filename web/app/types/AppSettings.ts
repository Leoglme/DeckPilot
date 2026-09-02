/** Persisted desktop preferences exposed by the Tauri shell. */
export interface AppSettings {
  startWithWindows: boolean
  keepRgbAlive: boolean
  minimizeToTray: boolean
  checkDriversOnStart: boolean
  autoInstallDrivers: boolean
}

/** Keys accepted by `set_app_setting`. */
export type AppSettingKey = keyof AppSettings
