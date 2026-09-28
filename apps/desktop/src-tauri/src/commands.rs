//! Tauri commands — the old REST endpoints. Each one parses its typed input, calls one
//! core operation and pushes the resulting change to the UI. No domain logic here.

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::app::{emit, emit_incidents, AppState};
use crate::core::{AppConfig, Core};
use crate::domain::{Incident, SessionInfo, StandingEntry};
use crate::error::AppResult;
use crate::export::{build_incident_csv, CsvDelimiter, CsvExport, CsvVariant};
use crate::incidents::input::{ConfigInput, IncidentFields, MergeInput, QuickLogInput};
use crate::incidents::rules::is_active;
use crate::text::{slugify, UtcTime};

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
    mutate(&app, &state, |core| core.update(&id, input))
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

#[tauri::command]
pub fn update_config(app: AppHandle, state: State<AppState>, input: ConfigInput) -> AppResult<AppConfig> {
    let config = state.lock().update_config(input)?;
    emit(&app, "config:update", &config);
    Ok(config)
}

#[tauri::command]
pub fn export_csv(state: State<AppState>, variant: CsvVariant, delimiter: CsvDelimiter) -> CsvExport {
    let core = state.lock();
    let active: Vec<Incident> = core.store.all().iter().filter(|i| is_active(i)).cloned().collect();
    let csv = build_incident_csv(&active, core.store.all(), variant, delimiter.as_char());
    let filename = format!("lmu-incidents-{}-{}.csv", slugify(&core.session.track_name), UtcTime::now().date());
    CsvExport { csv, filename }
}
