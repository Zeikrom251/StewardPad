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
    if let Err(error) = app.deep_link().register_all() {
        eprintln!("[links] stewardpad:// isn't registered for this dev build: {error}");
    }
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

pub fn open(app: &AppHandle, url: &str) {
    focus(app);
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

pub fn focus(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let shown = window.unminimize().and_then(|()| window.show()).and_then(|()| window.set_focus());
        if let Err(error) = shown {
            eprintln!("[links] Could not bring the window forward: {error}");
        }
    }
}
