//! The league's rule book: import, edit (checked and numbered as the steward types), remove.

use std::path::PathBuf;

use tauri::{AppHandle, State};

use crate::app::{emit, AppState};
use crate::error::{AppError, AppResult};
use crate::rulebook::{check_rules, edited_rulebook, number_if_outline, read_rulebook, RulebookCheck};
use crate::settings::AppConfig;

/// Settings → Rule book: reads a text/Markdown file; its numbered lines become the rules.
#[tauri::command]
pub fn import_rulebook(app: AppHandle, state: State<AppState>, path: PathBuf) -> AppResult<AppConfig> {
    let rulebook = read_rulebook(&path)?;
    let config = state.lock().set_rulebook(Some(rulebook));
    emit(&app, "config:update", &config);
    Ok(config)
}

/// Rules page → Edit, while typing: every line that breaks the structure.
#[tauri::command]
pub fn check_rulebook(text: String) -> RulebookCheck {
    check_rules(&text)
}

/// Rules page → Edit → "Number it": full rule numbers for a pasted Google Docs / Word list.
#[tauri::command]
pub fn number_rulebook(text: String) -> String {
    number_if_outline(&text)
}

/// Rules page → Edit → Save: the edited Markdown replaces the book if it has no problem.
#[tauri::command]
pub fn save_rulebook(app: AppHandle, state: State<AppState>, text: String) -> AppResult<AppConfig> {
    let mut core = state.lock();
    let name =
        core.config().rulebook.map(|book| book.name).ok_or_else(|| AppError::invalid("Import a rule book first"))?;
    let config = core.set_rulebook(Some(edited_rulebook(name, text)?));
    drop(core);
    emit(&app, "config:update", &config);
    Ok(config)
}

#[tauri::command]
pub fn remove_rulebook(app: AppHandle, state: State<AppState>) -> AppConfig {
    let config = state.lock().set_rulebook(None);
    emit(&app, "config:update", &config);
    config
}
