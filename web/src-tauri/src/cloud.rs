//! Cloud relay client — keeps the desktop connected to deckpilote.dibodev.fr so the deployed
//! mobile PWA can drive RGB without a LAN URL.

use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;

/// Production PWA + relay origin.
const CLOUD_BASE: &str = "https://deckpilote.dibodev.fr";

/// Poll interval while talking to the cloud relay.
const POLL_INTERVAL: Duration = Duration::from_millis(800);

/// Colour command delivered by the cloud relay.
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum RelayCommand {
    #[serde(rename = "all")]
    All { r: u8, g: u8, b: u8 },
    #[serde(rename = "slot")]
    Slot {
        slot: String,
        r: u8,
        g: u8,
        b: u8,
    },
    #[serde(rename = "gradient")]
    Gradient { colors: Vec<[u8; 3]> },
}

/// Body of `GET /api/relay/poll`.
#[derive(Debug, Deserialize)]
struct PollResponse {
    commands: Vec<RelayCommand>,
}

/// Start the cloud relay loop on a background thread (best-effort).
pub fn start() {
    std::thread::spawn(|| {
        let token = load_or_create_token();
        let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(12)).build();
        let base = cloud_base();
        loop {
            let register_url = format!("{base}/api/relay/register");
            let _ = agent.post(&register_url).send_json(serde_json::json!({ "token": &token }));

            let poll_url = format!("{base}/api/relay/poll?token={token}");
            if let Ok(response) = agent.get(&poll_url).call() {
                if let Ok(body) = response.into_json::<PollResponse>() {
                    for command in body.commands {
                        execute(command);
                    }
                }
            }

            std::thread::sleep(POLL_INTERVAL);
        }
    });
}

/// Return the persistent pairing token for the settings screen.
#[tauri::command]
pub fn pairing_token() -> String {
    load_or_create_token()
}

/// Return the PWA URL pre-filled with the pairing token for QR / copy.
#[tauri::command]
pub fn pwa_url() -> String {
    format!("{}/?pair={}", cloud_base(), load_or_create_token())
}

/// Resolve the relay origin (env override for local dev).
fn cloud_base() -> String {
    std::env::var("DECKPILOT_CLOUD_URL").unwrap_or_else(|_| CLOUD_BASE.to_string())
}

/// Execute one relayed colour command through the shared RGB engine.
fn execute(command: RelayCommand) {
    match command {
        RelayCommand::All { r, g, b } => {
            crate::rgb::engine_set_all(vec![[r, g, b]]);
        }
        RelayCommand::Slot { slot, r, g, b } => {
            crate::rgb::engine_set_slot(slot, [r, g, b]);
        }
        RelayCommand::Gradient { colors } => {
            crate::rgb::engine_set_all(colors);
        }
    }
}

/// Load the pairing token from disk, or create and persist a new one.
fn load_or_create_token() -> String {
    let path = token_path();
    if let Ok(existing) = fs::read_to_string(&path) {
        let trimmed = existing.trim().to_lowercase();
        if trimmed.len() >= 6 {
            return trimmed;
        }
    }

    let token = generate_token();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(&path, &token);
    token
}

/// Persistent pairing token location under the user's config dir.
fn token_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("fr.dibodev.deckpilot").join("pairing_token.txt")
}

/// Generate an 8-character pairing code without ambiguous characters.
fn generate_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    const CHARSET: &[u8] = b"abcdefghjkmnpqrstuvwxyz23456789";
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos() as u64)
        .unwrap_or(42);
    let mut token = String::with_capacity(8);
    let mut n = seed;
    for _ in 0..8 {
        token.push(CHARSET[(n % CHARSET.len() as u64) as usize] as char);
        n = n.wrapping_mul(1_103_515_245).wrapping_add(12_345);
    }
    token
}
