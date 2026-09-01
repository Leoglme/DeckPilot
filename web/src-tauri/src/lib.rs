mod cloud;
mod health;
mod remote;
mod rgb;

/// Boot the DeckPilot desktop shell and expose the hardware bridge commands.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|_app| {
            // Drive every component's live effect from one shared clock (perfectly in sync).
            rgb::start_engine();
            // Cloud relay so the deployed PWA on deckpilote.dibodev.fr can drive RGB from anywhere.
            cloud::start();
            // LAN fallback for local dev (same Wi-Fi, no cloud needed).
            remote::start();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            rgb::rgb_get_devices,
            rgb::rgb_prepare_devices,
            rgb::rgb_aio_present,
            rgb::rgb_set_state,
            health::health_list_drivers,
            health::health_open_windows_update,
            health::health_open_url,
            remote::remote_url,
            cloud::pairing_token,
            cloud::pwa_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running the DeckPilot application");
}
