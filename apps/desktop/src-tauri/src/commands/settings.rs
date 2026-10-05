//! Settings: the config and the data source.

use tauri::{AppHandle, State};

use crate::app::{emit, AppState};
use crate::error::AppResult;
use crate::lmu::AdapterName;
use crate::settings::{AppConfig, ConfigInput};

/// Settings → Data source. Takes effect at once and is saved with the session.
#[tauri::command]
pub fn set_adapter(app: AppHandle, state: State<AppState>, adapter: AdapterName) -> AppConfig {
    state.switch_adapter(&app, adapter)
}

#[tauri::command]
pub fn update_config(app: AppHandle, state: State<AppState>, input: ConfigInput) -> AppResult<AppConfig> {
    let config = state.lock().update_config(input)?;
    emit(&app, "config:update", &config);
    Ok(config)
}
