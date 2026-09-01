//! A tiny LAN HTTP server so a phone on the same Wi-Fi can drive the RGB from its browser — no app
//! to install. It serves a self-contained mobile page and a small JSON API that reuses the exact
//! same RGB bridge as the desktop UI. It is a listener inside the already-running DeckPilot app
//! (a few KB, negligible cost), not a separate service.

use serde::Deserialize;
use tiny_http::{Header, Method, Request, Response, Server};

/// The LAN port the phone connects to (kept clear of OpenRGB's 6742).
const REMOTE_PORT: u16 = 6773;

/// The self-contained mobile remote page (matches the DeckPilot mobile mockup).
const MOBILE_HTML: &str = include_str!("remote/mobile.html");

/// Body of `POST /api/all` — one solid colour for the whole rig.
#[derive(Deserialize)]
struct AllColor {
    r: u8,
    g: u8,
    b: u8,
}

/// Body of `POST /api/slot` — one solid colour for a single component.
#[derive(Deserialize)]
struct SlotColor {
    slot: String,
    r: u8,
    g: u8,
    b: u8,
}

/// Body of `POST /api/gradient` — an ambiance spread across the rig.
#[derive(Deserialize)]
struct Gradient {
    colors: Vec<[u8; 3]>,
}

/// Start the LAN remote server on its own thread (best-effort; a bind failure just means no remote).
pub fn start() {
    std::thread::spawn(move || {
        let server = match Server::http(format!("0.0.0.0:{REMOTE_PORT}")) {
            Ok(server) => server,
            Err(_) => return,
        };
        for request in server.incoming_requests() {
            handle(request);
        }
    });
}

/// The phone-facing URL of this remote (LAN IP + port), for the desktop to display.
#[tauri::command]
pub fn remote_url() -> String {
    let ip = local_ip().unwrap_or_else(|| "127.0.0.1".to_string());
    format!("http://{ip}:{REMOTE_PORT}")
}

/// Best-effort LAN IPv4 of this machine (opens a UDP socket to read the chosen local address).
fn local_ip() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip().to_string())
}

/// Route one incoming request to the mobile page or the RGB API. Colour changes update the shared
/// engine state (the same one the desktop UI drives), so the effect engine renders them.
fn handle(mut request: Request) {
    let method = request.method().clone();
    let url = request.url().to_string();
    let path = url.split('?').next().unwrap_or("/");
    match (&method, path) {
        (Method::Get, "/") | (Method::Get, "/index.html") => {
            let _ = request.respond(html(MOBILE_HTML));
        }
        (Method::Post, "/api/all") => {
            let result = read_json::<AllColor>(&mut request)
                .map(|body| crate::rgb::engine_set_all(vec![[body.r, body.g, body.b]]));
            respond_result(request, result);
        }
        (Method::Post, "/api/slot") => {
            let result = read_json::<SlotColor>(&mut request)
                .map(|body| crate::rgb::engine_set_slot(body.slot, [body.r, body.g, body.b]));
            respond_result(request, result);
        }
        (Method::Post, "/api/gradient") => {
            let result =
                read_json::<Gradient>(&mut request).map(|body| crate::rgb::engine_set_all(body.colors));
            respond_result(request, result);
        }
        _ => {
            let _ = request.respond(Response::from_string("Not found").with_status_code(404));
        }
    }
}

/// Read and parse a JSON request body, returning `None` on any read/parse failure.
fn read_json<T: for<'de> Deserialize<'de>>(request: &mut Request) -> Option<T> {
    let mut body = String::new();
    request.as_reader().read_to_string(&mut body).ok()?;
    serde_json::from_str(&body).ok()
}

/// Answer an API call with a small JSON status (how many slots were updated, or an invalid-body error).
fn respond_result(request: Request, result: Option<usize>) {
    let body = match result {
        Some(updated) => format!("{{\"ok\":true,\"updated\":{updated}}}"),
        None => "{\"ok\":false,\"error\":\"requête invalide\"}".to_string(),
    };
    let _ = request.respond(json(body));
}

/// An HTML response with the right content type.
fn html(content: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let header = Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..])
        .expect("valid header");
    Response::from_string(content).with_header(header)
}

/// A JSON response with the right content type.
fn json(body: String) -> Response<std::io::Cursor<Vec<u8>>> {
    let header =
        Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).expect("valid header");
    Response::from_string(body).with_header(header)
}
