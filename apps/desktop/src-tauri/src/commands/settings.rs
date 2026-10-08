//! Settings: the config and the data source.

use tauri::{AppHandle, State};

use crate::app::{emit, AppState};
use crate::error::AppResult;
use crate::lmu::AdapterName;
use crate::settings::{AppConfig, ConfigInput};
use crate::team::sessions;

/// Settings → Data source. Takes effect at once and is saved with the session.
#[tauri::command]
pub fn set_adapter(app: AppHandle, state: State<AppState>, adapter: AdapterName) -> AppConfig {
    let config = state.switch_adapter(&app, adapter);
    let mut core = state.lock();
    if core.streams_nothing() {
        // Its teammates would watch a frozen clock until the API drops the silent stream (30 s).
        core.team.notice = Some("Streaming stopped: the league gets the game’s timing, not the simulator’s".into());
        drop(core);
        tauri::async_runtime::spawn_blocking(move || {
            if let Err(error) = sessions::stop_stream(&app) {
                eprintln!("[stream] Could not stop the stream: {}", error.message);
            }
        });
    }
    config
}

#[tauri::command]
pub fn update_config(app: AppHandle, state: State<AppState>, input: ConfigInput) -> AppResult<AppConfig> {
    let config = state.lock().update_config(input)?;
    emit(&app, "config:update", &config);
    Ok(config)
}
