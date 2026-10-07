//! Tauri commands — the old REST endpoints. Each one parses its typed input, calls one
//! core operation and pushes the resulting change to the UI. No domain logic here.

use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::account::AccountView;
use crate::app::{emit, emit_incidents, emit_team, AppState};
use crate::core::Core;
use crate::domain::{Incident, SessionInfo, StandingEntry};
use crate::error::AppResult;
use crate::incidents::input::{IncidentFields, MergeInput, QuickLogInput};
use crate::incidents::Listed;
use crate::settings::AppConfig;
use crate::share::ImportReport;
use crate::team::TeamView;

/// Everything the UI needs on start — so the window isn't blank until the next tick.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    session: SessionInfo,
    standings: Vec<StandingEntry>,
    incidents: Vec<Listed>,
    config: AppConfig,
    account: AccountView,
    team: TeamView,
}

/// Runs an incident mutation, then pushes the new list (and, in a league, the changes waiting
/// to be sent) to every window.
fn mutate<T>(app: &AppHandle, state: &State<AppState>, op: impl FnOnce(&mut Core) -> AppResult<T>) -> AppResult<T> {
    let mut core = state.lock();
    let result = op(&mut core)?;
    emit_incidents(app, &core);
    if core.link().is_some() {
        emit_team(app, &core);
    }
    Ok(result)
}

#[tauri::command]
pub fn get_snapshot(state: State<AppState>) -> Snapshot {
    let core = state.lock();
    Snapshot {
        session: core.session.clone(),
        standings: core.standings.clone(),
        incidents: core.listed(),
        config: core.config(),
        account: core.account.view(),
        team: core.team_view(),
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

/// Incidents page → Delete on the ticked rows: one change, one save, one list update.
#[tauri::command]
pub fn delete_incidents(app: AppHandle, state: State<AppState>, ids: Vec<String>) -> AppResult<()> {
    mutate(&app, &state, |core| core.remove_many(&ids))
}

#[tauri::command]
pub fn merge_incidents(app: AppHandle, state: State<AppState>, input: MergeInput) -> AppResult<Incident> {
    mutate(&app, &state, |core| core.merge(input))
}

/// Inspector → Claim: this steward joins the incident's reviewers.
#[tauri::command]
pub fn claim_incident(app: AppHandle, state: State<AppState>, id: String) -> AppResult<Incident> {
    mutate(&app, &state, |core| core.claim(&id))
}

#[tauri::command]
pub fn unclaim_incident(app: AppHandle, state: State<AppState>, id: String) -> AppResult<Incident> {
    mutate(&app, &state, |core| core.unclaim(&id))
}

/// "Clear all" and "Archive session" are the same safe operation: a copy goes to the
/// archive folder first, then the list resets to #1.
#[tauri::command]
pub fn archive_session(app: AppHandle, state: State<AppState>) -> AppResult<()> {
    mutate(&app, &state, |core| {
        core.check_solo("Clearing the session")?;
        let track = core.session.track_name.clone();
        core.archive(&track)
    })
}

/// Writes the session to disk now, skipping the debounce: the updater calls it right before
/// the installer closes the app, so the last edits are not lost.
#[tauri::command]
pub fn flush_session(state: State<AppState>) -> AppResult<()> {
    state.lock().flush()
}

/// Merges other stewards' session files into this session; the UI shows the report.
#[tauri::command]
pub fn import_sessions(app: AppHandle, state: State<AppState>, paths: Vec<PathBuf>) -> AppResult<ImportReport> {
    mutate(&app, &state, |core| {
        core.check_solo("Importing session files")?;
        core.import_sessions(&paths)
    })
}
