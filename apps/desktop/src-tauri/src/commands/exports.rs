//! The save and export commands: every file StewardPad writes where the steward chose.
//! Save targets come from the native Save dialog, and each command accepts only its own
//! extension, so a save can never be pointed at the live session file or anything else.

use std::path::{Path, PathBuf};

use tauri::State;

use crate::app::AppState;
use crate::core::Core;
use crate::domain::Incident;
use crate::error::{AppError, AppResult};
use crate::export::{build_incident_csv, build_results, CsvDelimiter, CsvExport, CsvVariant};
use crate::incidents::rules::is_active;
use crate::store::disk::write_atomic;
use crate::text::{slugify, UtcTime};

fn build_export(core: &Core, variant: CsvVariant, delimiter: CsvDelimiter) -> CsvExport {
    let active: Vec<Incident> = core.store.all().iter().filter(|i| is_active(i)).cloned().collect();
    let csv = build_incident_csv(&active, core.store.all(), variant, delimiter.as_char());
    let filename = format!("lmu-incidents-{}-{}.csv", slugify(&core.session.track_name), UtcTime::now().date());
    CsvExport { csv, filename }
}

#[tauri::command]
pub fn export_csv(state: State<AppState>, variant: CsvVariant, delimiter: CsvDelimiter) -> CsvExport {
    build_export(&state.lock(), variant, delimiter)
}

fn save_as(path: &Path, extension: &str, content: &str) -> AppResult<()> {
    if !path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case(extension)) {
        return Err(AppError::invalid(format!("this file is saved as .{extension}")));
    }
    write_atomic(path, content).map_err(|e| AppError::io(&format!("Could not save {}", path.display()), e))
}

#[tauri::command]
pub fn save_csv(state: State<AppState>, variant: CsvVariant, delimiter: CsvDelimiter, path: PathBuf) -> AppResult<()> {
    let export = build_export(&state.lock(), variant, delimiter);
    save_as(&path, "csv", &export.csv)
}

/// Decisions and penalties as versioned JSON, for a league website or bot (export/).
#[tauri::command]
pub fn save_results_json(state: State<AppState>, path: PathBuf) -> AppResult<()> {
    let core = state.lock();
    let active: Vec<Incident> = core.store.all().iter().filter(|i| is_active(i)).cloned().collect();
    let file = build_results(&active, &core.session, UtcTime::now().iso());
    drop(core);
    let json = serde_json::to_string_pretty(&file).map_err(|e| AppError::io("Could not build the results file", e))?;
    save_as(&path, "json", &json)
}

/// The decisions document, rendered by the UI (it holds the labels and the Markdown).
#[tauri::command]
pub fn save_html(path: PathBuf, content: String) -> AppResult<()> {
    save_as(&path, "html", &content)
}

/// Every incident with every field, for another steward to import (share/).
#[tauri::command]
pub fn save_session_file(state: State<AppState>, path: PathBuf) -> AppResult<()> {
    let file = state.lock().session_file();
    let json = serde_json::to_string_pretty(&file).map_err(|e| AppError::io("Could not build the session file", e))?;
    save_as(&path, "json", &json)
}

/// Rules page → Save as .md: the book as the steward sees it, to send back to the league.
#[tauri::command]
pub fn save_markdown(path: PathBuf, content: String) -> AppResult<()> {
    save_as(&path, "md", &content)
}
