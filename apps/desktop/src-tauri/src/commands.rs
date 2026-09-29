//! Tauri commands — the old REST endpoints. Each one parses its typed input, calls one
//! core operation and pushes the resulting change to the UI. No domain logic here.

use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::app::{emit, emit_incidents, AppState};
use crate::core::{AppConfig, Core};
use crate::domain::{Incident, SessionInfo, StandingEntry};
use crate::error::{AppError, AppResult};
use crate::incidents::input::{ConfigInput, IncidentFields, MergeInput, QuickLogInput};
use crate::lmu::AdapterName;
use crate::rulebook::{check_rules, edited_rulebook, number_if_outline, read_rulebook, RulebookCheck};
use crate::share::ImportReport;

/// Everything the UI needs on start — so the window isn't blank until the next tick.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    session: SessionInfo,
    standings: Vec<StandingEntry>,
    incidents: Vec<Incident>,
    config: AppConfig,
}

/// Runs an incident mutation, then pushes the new list to every window.
fn mutate<T>(app: &AppHandle, state: &State<AppState>, op: impl FnOnce(&mut Core) -> AppResult<T>) -> AppResult<T> {
    let mut core = state.lock();
    let result = op(&mut core)?;
    emit_incidents(app, &core);
    Ok(result)
}

#[tauri::command]
pub fn get_snapshot(state: State<AppState>) -> Snapshot {
    let core = state.lock();
    Snapshot {
        session: core.session.clone(),
        standings: core.standings.clone(),
        incidents: core.list(),
        config: core.config(),
    }
}

/// Also returns merged children (audit trail), which the live list hides.
#[tauri::command]
pub fn get_incident(state: State<AppState>, id: String) -> AppResult<Incident> {
    state.lock().get(&id)
}

#[tauri::command]
pub fn quick_log(app: AppHandle, state: State<AppState>, input: QuickLogInput) -> AppResult<Incident> {
    mutate(&app, &state, |core| core.quick_log(input))
}

#[tauri::command]
pub fn create_incident(app: AppHandle, state: State<AppState>, input: IncidentFields) -> AppResult<Incident> {
    mutate(&app, &state, |core| core.create(input))
}

#[tauri::command]
pub fn update_incident(
    app: AppHandle,
    state: State<AppState>,
    id: String,
    input: IncidentFields,
) -> AppResult<Incident> {
    let (before, updated) = mutate(&app, &state, |core| {
        let before = core.get(&id)?.status;
        Ok((before, core.update(&id, input)?))
    })?;
    // The Announce page posts each status change to Discord; imports and merges don't come
    // here. The incident travels with the event, so the message never reads a stale list.
    if before != updated.status {
        emit(&app, "announcement:due", &AnnouncementDue { incident: updated.clone() });
    }
    Ok(updated)
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AnnouncementDue {
    incident: Incident,
}

#[tauri::command]
pub fn delete_incident(app: AppHandle, state: State<AppState>, id: String) -> AppResult<()> {
    mutate(&app, &state, |core| core.remove(&id))
}

#[tauri::command]
pub fn merge_incidents(app: AppHandle, state: State<AppState>, input: MergeInput) -> AppResult<Incident> {
    mutate(&app, &state, |core| core.merge(input))
}

/// "Clear all" and "Archive session" are the same safe operation: a copy goes to the
/// archive folder first, then the list resets to #1.
#[tauri::command]
pub fn archive_session(app: AppHandle, state: State<AppState>) -> AppResult<()> {
    mutate(&app, &state, |core| {
        let track = core.session.track_name.clone();
        core.archive(&track)
    })
}

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

/// Merges other stewards' session files into this session; the UI shows the report.
#[tauri::command]
pub fn import_sessions(app: AppHandle, state: State<AppState>, paths: Vec<PathBuf>) -> AppResult<ImportReport> {
    mutate(&app, &state, |core| core.import_sessions(&paths))
}
