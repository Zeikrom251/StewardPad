//! What the backend pushes to the UI. Same event names as the old Socket.IO gateway
//! (api.ts ServerEvents), plus the desktop's own.

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::core::Core;
use crate::incidents::LmuOutcome;

pub fn emit<T: Serialize + Clone>(app: &AppHandle, event: &str, payload: &T) {
    if let Err(error) = app.emit(event, payload.clone()) {
        eprintln!("[events] Failed to emit {event}: {error}");
    }
}

pub fn emit_incidents(app: &AppHandle, core: &Core) {
    emit(app, "incidents:update", &core.list());
}

pub fn emit_team(app: &AppHandle, core: &Core) {
    emit(app, "team:update", &core.team_view());
}

pub fn emit_account(app: &AppHandle, core: &Core) {
    emit(app, "account:update", &core.account.view());
}

pub fn emit_live(app: &AppHandle, core: &Core) {
    emit(app, "session:update", &core.session);
    emit(app, "standings:update", &core.standings);
}

pub fn emit_lmu_outcome(app: &AppHandle, core: &Core, outcome: &LmuOutcome) {
    if outcome.live_changed {
        emit_live(app, core);
    }
    if outcome.incidents_changed {
        emit_incidents(app, core);
    }
    if outcome.team_changed {
        emit_team(app, core);
    }
}
