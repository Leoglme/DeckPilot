//! Bridge to the OpenRGB SDK server for real hardware RGB control, plus DeckPilot's own software
//! effect engine.
//!
//! DeckPilot launches the OpenRGB server itself (headless) so the user never has to. Live effects
//! (breathing, wave, cycle…) are NOT delegated to each controller's firmware — those run on
//! independent clocks that never stay in sync and can't drive the HID watercooling. Instead a
//! single engine computes each animation frame and pushes it to EVERY component sampled from one
//! shared clock, so the whole rig breathes/waves as one. Verified live on Léo's rig.

use hidapi::HidApi;
use openrgb2::{Color, Controller, ControllerGroup, OpenRgbClient};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::OnceLock;
use std::time::Instant;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};

/// The Aorus Liquid Cooler 280 pump RGB — a Gigabyte HID controller that no third-party tool
/// (OpenRGB, SignalRGB, liquidctl) supports. Reverse-engineered from its USB traffic: a HID
/// feature report per zone, `[zone] 0x01 R G B R G B` (standard RGB, the triplet repeated).
const AIO_VID: u16 = 0x1044;
const AIO_PID: u16 = 0x7A46;
const AIO_ZONES: [u8; 4] = [0xb0, 0xb1, 0xb2, 0xb3];

const SDK_ADDR: &str = "127.0.0.1:6742";

/// Locate an `OpenRGB.exe` on disk — an installed copy, or a portable build in Downloads.
fn find_openrgb() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(program_files) = std::env::var("ProgramFiles") {
        candidates.push(PathBuf::from(format!("{program_files}\\OpenRGB\\OpenRGB.exe")));
    }
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        candidates.push(PathBuf::from(format!("{local}\\OpenRGB\\OpenRGB.exe")));
    }
    for candidate in &candidates {
        if candidate.exists() {
            return Some(candidate.clone());
        }
    }
    if let Ok(profile) = std::env::var("USERPROFILE") {
        let downloads = PathBuf::from(format!("{profile}\\Downloads"));
        if let Some(found) = search_openrgb(&downloads, 3) {
            return Some(found);
        }
    }
    None
}

/// Recursively look for `OpenRGB.exe` up to `depth` folders below `dir`.
fn search_openrgb(dir: &PathBuf, depth: u8) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;
    let mut subdirs: Vec<PathBuf> = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file()
            && path
                .file_name()
                .is_some_and(|name| name.eq_ignore_ascii_case("OpenRGB.exe"))
        {
            return Some(path);
        }
        if path.is_dir() {
            subdirs.push(path);
        }
    }
    if depth == 0 {
        return None;
    }
    for sub in subdirs {
        if let Some(found) = search_openrgb(&sub, depth - 1) {
            return Some(found);
        }
    }
    None
}

/// Open a fresh connection to the OpenRGB SDK server, launching it headless once if it is not
/// already running. Used only to (re)establish the shared connection in `get_controllers`.
async fn connect() -> Result<OpenRgbClient, String> {
    if let Ok(client) = OpenRgbClient::connect().await {
        return Ok(client);
    }
    if let Some(exe) = find_openrgb() {
        let _ = Command::new(exe)
            .args(["--server", "--startminimized"])
            .spawn();
        for _ in 0..30 {
            sleep(Duration::from_millis(250)).await;
            if let Ok(client) = OpenRgbClient::connect().await {
                return Ok(client);
            }
        }
    }
    OpenRgbClient::connect().await.map_err(|error| {
        format!("Serveur OpenRGB injoignable sur {SDK_ADDR} ({error}). OpenRGB est-il installé ?")
    })
}

/// The one long-lived OpenRGB connection, reused by every command. Reconnecting per command makes
/// OpenRGB log "recv_select failed receiving magic, closing listener" on each *disconnect* (it is
/// waiting for the next packet's magic when the socket drops) — the console spam — so we keep a
/// single connection open for the whole app lifetime instead.
fn client_cell() -> &'static Mutex<Option<OpenRgbClient>> {
    static CLIENT: OnceLock<Mutex<Option<OpenRgbClient>>> = OnceLock::new();
    CLIENT.get_or_init(|| Mutex::new(None))
}

/// Fetch the controllers over the shared, persistent connection, reconnecting once if it dropped
/// (e.g. OpenRGB was restarted). Never opens a throwaway connection that would spam the log.
async fn get_controllers() -> Result<ControllerGroup, String> {
    let mut guard = client_cell().lock().await;
    if guard.is_none() {
        *guard = Some(connect().await?);
    }
    if let Some(client) = guard.as_ref() {
        if let Ok(controllers) = client.get_all_controllers().await {
            return Ok(controllers);
        }
    }
    let fresh = connect().await?;
    let controllers = fresh
        .get_all_controllers()
        .await
        .map_err(|error| error.to_string())?;
    *guard = Some(fresh);
    Ok(controllers)
}

/// A real RGB controller detected by OpenRGB, with its LED count.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RgbDevice {
    name: String,
    led_count: usize,
}

/// List the RGB controllers OpenRGB currently detects, with their LED counts.
#[tauri::command]
pub async fn rgb_get_devices() -> Result<Vec<RgbDevice>, String> {
    let controllers = get_controllers().await?;
    let devices = controllers
        .iter()
        .map(|controller| RgbDevice {
            name: controller.name().to_string(),
            led_count: controller.num_leds(),
        })
        .collect();
    Ok(devices)
}

/// Default LED count applied to an unconfigured addressable (ARGB) zone so its fans/strips
/// light up — OpenRGB cannot auto-detect this for Gen1 headers, so DeckPilot picks a sane
/// value instead of forcing the user through OpenRGB's manual "resize zones" dialog.
const DEFAULT_ARGB_ZONE_SIZE: usize = 24;

/// Prepare every detected device for live control: put it in a controllable (Direct) mode so
/// colours actually apply (else e.g. the GPU ignores them), and give every unconfigured
/// addressable zone a default size so its fans/strips light up without OpenRGB's manual dialog.
/// Returns how many zones were configured. This is what makes the rig plug-and-play.
#[tauri::command]
pub async fn rgb_prepare_devices() -> Result<usize, String> {
    let controllers = get_controllers().await?;
    let mut configured: usize = 0;
    for controller in controllers.iter() {
        let _ = controller.set_controllable_mode().await;
        let targets: Vec<(usize, usize)> = controller
            .get_all_zones()
            .filter(|zone| zone.leds_max() > zone.leds_min() && zone.num_leds() == 0)
            .map(|zone| {
                let size = DEFAULT_ARGB_ZONE_SIZE.min(zone.leds_max()).max(zone.leds_min());
                (zone.zone_id(), size.max(1))
            })
            .collect();
        for (zone_id, size) in targets {
            if let Ok(zone) = controller.get_zone(zone_id) {
                if zone.resize(size).await.is_ok() {
                    configured += 1;
                }
            }
        }
    }
    Ok(configured)
}

/// Whether the Aorus AIO pump is connected (its HID control interface is present).
#[tauri::command]
pub async fn rgb_aio_present() -> Result<bool, String> {
    tokio::task::spawn_blocking(|| {
        let api = HidApi::new().map_err(|error| error.to_string())?;
        let present = api.device_list().any(|device| {
            device.vendor_id() == AIO_VID
                && device.product_id() == AIO_PID
                && device.interface_number() == 1
        });
        Ok::<bool, String>(present)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Whether an OpenRGB controller `name` is the graphics card — the only controller the engine
/// drives whole, since every other slot (motherboard, fans) lives on the board controller.
fn controller_is_gpu(name: &str) -> bool {
    let haystack = name.to_lowercase();
    ["rtx", "gtx", "geforce", "radeon", "nvidia", "graphics", "gpu", "arc a"]
        .iter()
        .any(|keyword| haystack.contains(keyword))
}

// ---------------------------------------------------------------------------------------------
// Effect engine
// ---------------------------------------------------------------------------------------------

/// One slot's live look, as the front resolves it: which effect to animate, its base colour(s)
/// (1 = solid, 2-3 = gradient/scene), its brightness and whether it is lit.
#[derive(Clone, serde::Deserialize)]
pub struct SlotAnim {
    slot: String,
    effect: String,
    colors: Vec<[u8; 3]>,
    brightness: u8,
    on: bool,
}

/// The whole rig's desired look — the single source of truth both engine loops render from.
#[derive(Default)]
struct EngineState {
    slots: Vec<SlotAnim>,
}

/// The shared, live target state pushed by the front (`rgb_set_state`) and read every frame.
fn engine_state() -> &'static std::sync::Mutex<EngineState> {
    static STATE: OnceLock<std::sync::Mutex<EngineState>> = OnceLock::new();
    STATE.get_or_init(|| std::sync::Mutex::new(EngineState::default()))
}

/// Seconds since the engine started — the one clock BOTH loops sample, so every device shows the
/// same phase of the same effect and the rig stays perfectly in sync.
fn engine_clock() -> f32 {
    static CLOCK: OnceLock<Instant> = OnceLock::new();
    CLOCK.get_or_init(Instant::now).elapsed().as_secs_f32()
}

/// A snapshot of the current per-slot state (brief lock, never held across a write).
fn current_slots() -> Vec<SlotAnim> {
    engine_state()
        .lock()
        .map(|state| state.slots.clone())
        .unwrap_or_default()
}

/// The animation config for a physical slot (`gpu`, `mobo`, `fans`, `aio`) in a state snapshot.
fn find_slot<'a>(slots: &'a [SlotAnim], id: &str) -> Option<&'a SlotAnim> {
    slots.iter().find(|slot| slot.slot == id)
}

/// A Corsair RS120 fan mirrors an 8-LED block, so an addressable zone repeats its pattern every
/// 8 LEDs — each fan then shows the WHOLE gradient/wave instead of a thin slice.
const FAN_PERIOD: usize = 8;

const T_BREATHE: f32 = 3.2;
const T_WAVE: f32 = 2.6;
const T_CYCLE: f32 = 6.0;
const T_REACT: f32 = 1.15;

/// Fractional part of `x` (its position within a 0-1 cycle).
fn frac(x: f32) -> f32 {
    x - x.floor()
}

/// Linear blend between two colours (`f` = 0 → `a`, 1 → `b`).
fn lerp(a: [u8; 3], b: [u8; 3], f: f32) -> [u8; 3] {
    let mix = |x: u8, y: u8| -> u8 {
        (x as f32 + (y as f32 - x as f32) * f)
            .round()
            .clamp(0.0, 255.0) as u8
    };
    [mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2])]
}

/// Scale a colour's brightness by `f` (0 → black, 1 → unchanged).
fn scale(c: [u8; 3], f: f32) -> [u8; 3] {
    let mul = |x: u8| -> u8 { (x as f32 * f).round().clamp(0.0, 255.0) as u8 };
    [mul(c[0]), mul(c[1]), mul(c[2])]
}

/// Colour at position `p` (0-1) along a gradient (clamped at the ends).
fn grad01(colors: &[[u8; 3]], p: f32) -> [u8; 3] {
    match colors.len() {
        0 => [0, 0, 0],
        1 => colors[0],
        n => {
            let seg = p.clamp(0.0, 1.0) * (n - 1) as f32;
            let low = seg.floor() as usize;
            let high = (low + 1).min(n - 1);
            lerp(colors[low], colors[high], seg - low as f32)
        }
    }
}

/// Colour at position `p` along a gradient that WRAPS (last colour blends back to the first) — the
/// shape a wave scrolls through so it has no seam.
fn grad_cyclic(colors: &[[u8; 3]], p: f32) -> [u8; 3] {
    match colors.len() {
        0 => [0, 0, 0],
        1 => colors[0],
        n => {
            let seg = frac(p) * n as f32;
            let low = (seg.floor() as usize) % n;
            let high = (low + 1) % n;
            lerp(colors[low], colors[high], seg - seg.floor())
        }
    }
}

/// Convert HSV (all 0-1) to RGB — used by the rainbow `cycle` effect.
fn hsv_to_rgb(h: f32, s: f32, v: f32) -> [u8; 3] {
    let h6 = frac(h) * 6.0;
    let sector = h6.floor() as i32;
    let f = h6 - sector as f32;
    let p = v * (1.0 - s);
    let q = v * (1.0 - s * f);
    let t = v * (1.0 - s * (1.0 - f));
    let (r, g, b) = match sector.rem_euclid(6) {
        0 => (v, t, p),
        1 => (q, v, p),
        2 => (p, v, t),
        3 => (p, q, v),
        4 => (t, p, v),
        _ => (v, p, q),
    };
    [
        (r * 255.0).round() as u8,
        (g * 255.0).round() as u8,
        (b * 255.0).round() as u8,
    ]
}

/// The colour of one LED for a slot at time `t`: applies the slot's effect over its base colours,
/// then its brightness. LED `index` of `count`; `mirrored` repeats the pattern every fan block.
fn led_color(anim: &SlotAnim, index: usize, count: usize, t: f32) -> [u8; 3] {
    if !anim.on || anim.colors.is_empty() {
        return [0, 0, 0];
    }
    let mirrored = count > FAN_PERIOD;
    let period = if mirrored { FAN_PERIOD } else { count.max(1) };
    let local = if mirrored { index % FAN_PERIOD } else { index };
    let along = if period > 1 {
        local as f32 / (period - 1) as f32
    } else {
        0.0
    };
    let base = match anim.effect.as_str() {
        "breathing" => {
            let breath = 0.12 + 0.88 * (0.5 - 0.5 * (std::f32::consts::TAU * t / T_BREATHE).cos());
            scale(grad01(&anim.colors, along), breath)
        }
        "wave" => {
            // The colours flow along the LEDs, riding a bright band — a gradient visibly streams,
            // a solid colour still shimmers with the moving band.
            let phase = along - t / T_WAVE;
            let band = 0.4 + 0.6 * (0.5 + 0.5 * (std::f32::consts::TAU * phase).cos());
            scale(grad_cyclic(&anim.colors, phase), band)
        }
        "cycle" => hsv_to_rgb(t / T_CYCLE + along * 0.15, 1.0, 1.0),
        "reactive" => {
            // A snappy pulse: instant flash, quick decay, never fully dark.
            let pulse = (-5.0 * frac(t / T_REACT)).exp().max(0.06);
            scale(grad01(&anim.colors, along), pulse)
        }
        _ => grad01(&anim.colors, along),
    };
    scale(base, anim.brightness as f32 / 100.0)
}

/// Build a controller's full LED frame at time `t`. The GPU renders whole from the `gpu` slot; the
/// motherboard composes per zone — addressable (ARGB) zones are the fans, the rest is the board.
fn controller_frame(controller: &Controller, slots: &[SlotAnim], t: f32) -> Vec<[u8; 3]> {
    let mut leds: Vec<[u8; 3]> = Vec::with_capacity(controller.num_leds());
    if controller_is_gpu(controller.name()) {
        let anim = find_slot(slots, "gpu");
        let count = controller.num_leds();
        for i in 0..count {
            leds.push(anim.map(|a| led_color(a, i, count, t)).unwrap_or([0, 0, 0]));
        }
    } else {
        let mobo = find_slot(slots, "mobo");
        let fans = find_slot(slots, "fans");
        for zone in controller.get_all_zones() {
            let count = zone.num_leds();
            let addressable = zone.leds_max() > zone.leds_min();
            let anim = if addressable { fans } else { mobo };
            for i in 0..count {
                leds.push(anim.map(|a| led_color(a, i, count, t)).unwrap_or([0, 0, 0]));
            }
        }
    }
    leds.resize(controller.num_leds(), [0, 0, 0]);
    leds
}

/// The four AIO pump zone colours at time `t`, from the `aio` slot (the effect spreads over the
/// four zones just like the LEDs of any other component).
fn aio_frame(slots: &[SlotAnim]) -> [[u8; 3]; 4] {
    let t = engine_clock();
    let anim = find_slot(slots, "aio");
    let mut out = [[0u8; 3]; 4];
    if let Some(a) = anim {
        for (zone, cell) in out.iter_mut().enumerate() {
            *cell = led_color(a, zone, AIO_ZONES.len(), t);
        }
    }
    out
}

/// Push the rig's whole desired look to the engine. The front calls this whenever anything changes
/// (a colour, a scene, an effect, brightness, on/off); the engine loops animate from it.
#[tauri::command]
pub async fn rgb_set_state(slots: Vec<SlotAnim>) -> Result<(), String> {
    let mut state = engine_state().lock().map_err(|error| error.to_string())?;
    state.slots = slots;
    Ok(())
}

/// Overwrite every slot with one static look — the entry point the LAN remote drives the rig
/// through, so its writes go through the same engine as the desktop UI instead of fighting it.
pub fn engine_set_all(colors: Vec<[u8; 3]>) -> usize {
    let mut state = match engine_state().lock() {
        Ok(state) => state,
        Err(_) => return 0,
    };
    state.slots = ["gpu", "mobo", "fans", "aio"]
        .iter()
        .map(|slot| SlotAnim {
            slot: (*slot).to_string(),
            effect: "static".to_string(),
            colors: colors.clone(),
            brightness: 100,
            on: true,
        })
        .collect();
    state.slots.len()
}

/// Set one slot to a static colour, adding it if the rig has no state yet (LAN remote entry point).
pub fn engine_set_slot(slot: String, color: [u8; 3]) -> usize {
    let mut state = match engine_state().lock() {
        Ok(state) => state,
        Err(_) => return 0,
    };
    if let Some(existing) = state.slots.iter_mut().find(|item| item.slot == slot) {
        existing.effect = "static".to_string();
        existing.colors = vec![color];
        existing.on = true;
    } else {
        state.slots.push(SlotAnim {
            slot,
            effect: "static".to_string(),
            colors: vec![color],
            brightness: 100,
            on: true,
        });
    }
    1
}

/// The OpenRGB half of the engine: render the GPU + motherboard every frame from the shared state.
/// A frame that matches the last one is skipped (so a static look isn't hammered onto the GPU's
/// slow I2C). The controller layout is re-fetched every ~1.5 s — this picks up the fan zones once
/// `prepare_devices` has sized them, re-writes every LED so a dropped write self-heals, and
/// transparently reconnects if OpenRGB was restarted.
async fn engine_openrgb_loop() {
    let mut controllers: Option<ControllerGroup> = None;
    let mut cache: HashMap<String, Vec<[u8; 3]>> = HashMap::new();
    let mut last_refresh = f32::NEG_INFINITY;
    loop {
        let slots = current_slots();
        if !slots.is_empty() {
            let t = engine_clock();
            if t - last_refresh > 1.5 {
                controllers = None; // force a fresh layout fetch + a full re-write
                last_refresh = t;
            }
            if controllers.is_none() {
                controllers = get_controllers().await.ok();
                cache.clear();
            }
            if let Some(group) = &controllers {
                let mut dropped = false;
                for controller in group.iter() {
                    let frame = controller_frame(controller, &slots, t);
                    let key = controller.name().to_string();
                    if cache.get(&key) == Some(&frame) {
                        continue;
                    }
                    let leds: Vec<Color> = frame
                        .iter()
                        .map(|c| Color {
                            r: c[0],
                            g: c[1],
                            b: c[2],
                        })
                        .collect();
                    let mut command = controller.cmd();
                    if command.set_leds(leds).is_ok() && command.execute().await.is_ok() {
                        cache.insert(key, frame);
                    } else {
                        dropped = true;
                    }
                }
                if dropped {
                    controllers = None; // reconnect / re-fetch on the next frame
                }
            }
        }
        sleep(Duration::from_millis(60)).await;
    }
}

/// The AIO half of the engine: a dedicated thread that keeps the pump's HID handle open and writes
/// its four zones every frame (opening it once, not per frame, keeps the animation cheap). It
/// samples the SAME clock as the OpenRGB loop, so the watercooling stays in step with the rig.
fn engine_aio_thread() {
    std::thread::spawn(move || {
        let mut api = match HidApi::new() {
            Ok(api) => api,
            Err(_) => return,
        };
        let mut device: Option<hidapi::HidDevice> = None;
        loop {
            let slots = current_slots();
            let wants_aio = find_slot(&slots, "aio").is_some();
            if wants_aio {
                if device.is_none() {
                    let _ = api.refresh_devices();
                    if let Some(path) = api
                        .device_list()
                        .find(|d| {
                            d.vendor_id() == AIO_VID
                                && d.product_id() == AIO_PID
                                && d.interface_number() == 1
                        })
                        .map(|d| d.path().to_owned())
                    {
                        device = api.open_path(&path).ok();
                    }
                }
                if let Some(handle) = &device {
                    let frame = aio_frame(&slots);
                    for (index, zone) in AIO_ZONES.iter().enumerate() {
                        let c = frame[index];
                        let report = [0x00u8, *zone, 0x01, c[0], c[1], c[2], c[0], c[1], c[2]];
                        if handle.send_feature_report(&report).is_err() {
                            device = None; // pump unplugged / handle stale — re-open next frame
                            break;
                        }
                    }
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(33));
        }
    });
}

/// Start both halves of the effect engine (idempotent enough for a single boot call). The clock is
/// primed here so the very first pushed state animates from t≈0.
pub fn start_engine() {
    let _ = engine_clock();
    tauri::async_runtime::spawn(engine_openrgb_loop());
    engine_aio_thread();
}
