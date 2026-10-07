//! stewardpad:// links from the website, opened by the browser (registered by the installer;
//! a second launch hands its link to this window through the single-instance plugin).
//! - `stewardpad://signed-in?code=…&state=…`: the desktop sign-in's one-time code (board 10).
//! - `stewardpad://join?code=…`: an invite (board 11); the UI shows it before joining.

use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

use super::events::emit;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Message {
    message: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct JoinRequested {
    invite: String,
}

pub fn listen(app: &tauri::App) {
    #[cfg(debug_assertions)]
    register_for_development(app);
    let handle = app.handle().clone();
    app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
            open(&handle, url.as_str());
        }
    });
    // Started by a link rather than already running.
    if let Ok(Some(urls)) = app.deep_link().get_current() {
        for url in urls {
            open(app.handle(), url.as_str());
        }
    }
}

/// A dev build registers stewardpad:// for itself (an installed one: its installer).
#[cfg(debug_assertions)]
fn register_for_development(app: &tauri::App) {
    if let Err(error) = app.deep_link().register_all() {
        eprintln!("[links] stewardpad:// isn't registered for this dev build: {error}");
    }
    #[cfg(target_os = "linux")]
    if let Err(error) = register_in_windows() {
        eprintln!("[links] stewardpad:// isn't registered in Windows for this WSL build: {error}");
    }
}

/// Under WSL the browser is Windows', which never reads the Linux registration: the link is
/// registered for the current Windows user too (as `register_all` does on Windows), starting
/// this build through `wsl.exe --exec` (no shell, so the link arrives whole). That launch shares
/// this D-Bus session, so the single-instance plugin hands the link to the open window.
#[cfg(all(debug_assertions, target_os = "linux"))]
fn register_in_windows() -> std::io::Result<()> {
    let Some(distro) = std::env::var_os("WSL_DISTRO_NAME") else { return Ok(()) };
    let exe = std::env::current_exe()?;
    let start =
        format!(r#""C:\Windows\System32\wsl.exe" -d {} --exec "{}" "%1""#, distro.to_string_lossy(), exe.display());
    let key = r"HKCU\Software\Classes\stewardpad";
    let command_key = format!(r"{key}\shell\open\command");
    let values: [&[&str]; 3] = [
        &[key, "/ve", "/d", "URL:StewardPad (WSL development)"],
        &[key, "/v", "URL Protocol", "/d", ""],
        &[&command_key, "/ve", "/d", &start],
    ];
    for value in values {
        let out = std::process::Command::new("reg.exe").arg("add").args(value).arg("/f").output()?;
        if !out.status.success() {
            return Err(std::io::Error::other(String::from_utf8_lossy(&out.stderr).trim().to_string()));
        }
    }
    Ok(())
}

pub fn open(app: &AppHandle, url: &str) {
    focus(app);
    let url = &as_written(url);
    if url.starts_with("stewardpad://signed-in?") {
        let (app, url) = (app.clone(), url.to_string());
        std::thread::spawn(move || {
            if let Err(error) = crate::account::service::redeem(&app, &url) {
                emit(&app, "account:failed", &Message { message: error.message });
            }
        });
    } else if url.starts_with("stewardpad://join?") {
        emit(app, "join:requested", &JoinRequested { invite: url.to_string() });
    } else {
        eprintln!("[links] Ignoring a stewardpad:// link this version doesn't know");
    }
}

/// The link as the website wrote it: Windows hands some over with a slash before the query
/// (`stewardpad://signed-in/?code=…`).
fn as_written(url: &str) -> String {
    ["signed-in", "join"].iter().fold(url.to_string(), |url, host| {
        url.replacen(&format!("stewardpad://{host}/?"), &format!("stewardpad://{host}?"), 1)
    })
}

pub fn focus(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let shown = window.unminimize().and_then(|()| window.show()).and_then(|()| window.set_focus());
        if let Err(error) = shown {
            eprintln!("[links] Could not bring the window forward: {error}");
        }
    }
}

#[cfg(test)]
#[path = "links_tests.rs"]
mod tests;
