//! Real driver / firmware inventory for the Machine page.
//!
//! DeckPilot reads the machine's actually-installed signed drivers (name, vendor, version, date)
//! straight from Windows — so a friend who launches the app sees *their* hardware, not a mock.

use std::process::Command;

/// One real installed driver, as reported by Windows (`Win32_PnPSignedDriver`).
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverInfo {
    name: String,
    provider: String,
    version: String,
    /// Driver date as `yyyy-MM-dd`, or empty when Windows does not report one.
    date: String,
    /// The Windows device class (`DISPLAY`, `NET`, `MEDIA`, `SYSTEM`, `HDC`, `SCSIADAPTER`).
    device_class: String,
}

/// Raw shape deserialized from PowerShell's JSON (Windows' PascalCase property names).
#[derive(serde::Deserialize)]
struct RawDriver {
    #[serde(rename = "DeviceName")]
    device_name: Option<String>,
    #[serde(rename = "DriverVersion")]
    driver_version: Option<String>,
    #[serde(rename = "DriverProviderName")]
    provider: Option<String>,
    #[serde(rename = "DriverDate")]
    date: Option<String>,
    #[serde(rename = "DeviceClass")]
    device_class: Option<String>,
}

/// PowerShell one-liner: the real signed drivers of the meaningful device classes, as compact JSON.
const DRIVER_QUERY: &str = "$c=@('DISPLAY','NET','MEDIA','SYSTEM','HDC','SCSIADAPTER');Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue | Where-Object { $_.DeviceName -and $_.DriverVersion -and $_.DriverProviderName -and $_.DriverProviderName -ne 'Microsoft' -and ($c -contains $_.DeviceClass) } | Select-Object DeviceName, DriverVersion, DriverProviderName, @{N='DriverDate';E={ if($_.DriverDate){$_.DriverDate.ToString('yyyy-MM-dd')}else{''} }}, DeviceClass | Sort-Object DeviceClass, DeviceName | ConvertTo-Json -Compress -Depth 3";

/// List the machine's real installed drivers.
#[tauri::command]
pub async fn health_list_drivers() -> Result<Vec<DriverInfo>, String> {
    tokio::task::spawn_blocking(query_drivers)
        .await
        .map_err(|error| error.to_string())?
}

/// Run the PowerShell query and turn its JSON into a deduplicated driver list.
fn query_drivers() -> Result<Vec<DriverInfo>, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            DRIVER_QUERY,
        ])
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let trimmed = stdout.trim();
    if trimmed.is_empty() || trimmed == "null" {
        return Ok(Vec::new());
    }
    let value: serde_json::Value = serde_json::from_str(trimmed).map_err(|error| error.to_string())?;
    let raws: Vec<RawDriver> = match value {
        serde_json::Value::Array(_) => {
            serde_json::from_value(value).map_err(|error| error.to_string())?
        }
        serde_json::Value::Object(_) => {
            vec![serde_json::from_value(value).map_err(|error| error.to_string())?]
        }
        _ => Vec::new(),
    };
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut drivers: Vec<DriverInfo> = Vec::new();
    for raw in raws {
        let name = raw.device_name.unwrap_or_default();
        if name.is_empty() || !seen.insert(name.clone()) {
            continue;
        }
        drivers.push(DriverInfo {
            name,
            provider: raw.provider.unwrap_or_default(),
            version: raw.driver_version.unwrap_or_default(),
            date: raw.date.unwrap_or_default(),
            device_class: raw.device_class.unwrap_or_default(),
        });
    }
    Ok(drivers)
}

/// Open the Windows Update panel — the safe, real place drivers actually get updated.
#[tauri::command]
pub fn health_open_windows_update() -> Result<(), String> {
    Command::new("cmd")
        .args(["/C", "start", "", "ms-settings:windowsupdate"])
        .spawn()
        .map(|_child| ())
        .map_err(|error| error.to_string())
}

/// Open a vendor's driver page (or any http(s) URL) in the default browser.
#[tauri::command]
pub fn health_open_url(url: String) -> Result<(), String> {
    // Only ever hand the shell an http(s) URL — never an arbitrary string that `start` could
    // interpret as a command.
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("URL invalide".to_string());
    }
    Command::new("cmd")
        .args(["/C", "start", "", &url])
        .spawn()
        .map(|_child| ())
        .map_err(|error| error.to_string())
}
