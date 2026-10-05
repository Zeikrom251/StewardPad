//! Tauri commands — the old REST endpoints, by area. Each one parses its typed input, calls
//! one core operation and pushes the resulting change to the UI. No domain logic here.

pub mod account;
pub mod exports;
pub mod incidents;
pub mod rulebook;
pub mod settings;
pub mod team;

use tauri::AppHandle;

use crate::error::{AppError, AppResult};

/// API calls wait on the network: they run on a blocking worker, never on the UI's thread.
pub(crate) async fn in_background<T: Send + 'static>(
    app: AppHandle,
    work: impl FnOnce(&AppHandle) -> AppResult<T> + Send + 'static,
) -> AppResult<T> {
    tauri::async_runtime::spawn_blocking(move || work(&app))
        .await
        .map_err(|e| AppError::io("A background task stopped", e))?
}
