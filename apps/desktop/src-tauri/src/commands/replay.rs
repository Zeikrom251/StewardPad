//! The game's replay: the inspector's Go to moves it to an incident's time and follows a car.

use tauri::AppHandle;

use super::in_background;
use crate::error::AppResult;
use crate::lmu;

#[tauri::command]
pub async fn go_to_replay(app: AppHandle, seconds: f64, slot_id: Option<i64>) -> AppResult<()> {
    in_background(app, move |_| lmu::seek_replay(seconds, slot_id)).await
}
