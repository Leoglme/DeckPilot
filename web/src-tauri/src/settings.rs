//! Persisted desktop preferences (startup, tray, updates).

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

/// User-facing toggles from Réglages.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub start_with_windows: bool,
    pub keep_rgb_alive: bool,
    pub minimize_to_tray: bool,
    pub check_drivers_on_start: bool,
    pub auto_install_drivers: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            start_with_windows: true,
            keep_rgb_alive: true,
            minimize_to_tray: true,
            check_drivers_on_start: true,
            auto_install_drivers: false,
        }
    }
}

/// Load settings from disk, or defaults on first run.
pub fn load_settings() -> AppSettings {
    let path = settings_path();
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(settings) = serde_json::from_str::<AppSettings>(&raw) {
            return settings;
        }
    }
    AppSettings::default()
}

/// Persist settings to disk.
fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())
}

/// Enable or disable the Windows login autostart entry.
fn apply_autostart(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|error| error.to_string())?;
    } else {
        autostart.disable().map_err(|error| error.to_string())?;
    }
    Ok(())
}

/// Apply persisted startup preferences once at launch.
pub fn apply_on_boot(app: &AppHandle) {
    let settings = load_settings();
    let _ = apply_autostart(app, settings.start_with_windows);
}

/// Return every settings toggle for the Réglages screen.
#[tauri::command]
pub fn get_app_settings() -> AppSettings {
    load_settings()
}

/**
 * Update one settings toggle and persist it.
 *
 * @param key - Setting id (`startWithWindows`, `keepRgbAlive`, …).
 * @param value - New toggle value.
 */
#[tauri::command]
pub fn set_app_setting(app: AppHandle, key: String, value: bool) -> Result<(), String> {
    let mut settings = load_settings();
    match key.as_str() {
        "startWithWindows" => {
            settings.start_with_windows = value;
            apply_autostart(&app, value)?;
        }
        "keepRgbAlive" => settings.keep_rgb_alive = value,
        "minimizeToTray" => settings.minimize_to_tray = value,
        "checkDriversOnStart" => settings.check_drivers_on_start = value,
        "autoInstallDrivers" => settings.auto_install_drivers = value,
        _ => return Err(format!("Réglage inconnu : {key}")),
    }
    save_settings(&settings)
}

fn settings_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("fr.dibodev.deckpilot").join("settings.json")
}
