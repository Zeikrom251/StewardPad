//! The league's race sessions and its live stream, as the Team page drives them.

use serde_json::json;
use tauri::{AppHandle, Manager, State};

use super::{engine, frames, TeamLink, TeamView};
use crate::api::wire::{LiveStream, SessionStatus, SessionView};
use crate::app::{emit_team, AppState};
use crate::core::Core;
use crate::domain::wire_name;
use crate::error::{AppError, AppResult};
use crate::text::UtcTime;

fn linked(core: &Core) -> AppResult<TeamLink> {
    core.link().cloned().ok_or_else(|| AppError::invalid("Pick a league first"))
}

/// "Spa · Race · 5 Oct 2026", from what LMU (or the simulator) reports now.
fn new_session_body(core: &Core, title: Option<&str>) -> serde_json::Value {
    let track = core.session.track_name.trim();
    let track = if track.is_empty() { "Unknown track" } else { track };
    let kind = wire_name(&core.session.session_type);
    let default_title = format!("{track} · {} · {}", title_case(&kind), UtcTime::now().date());
    let title: String =
        title.map(str::trim).filter(|t| !t.is_empty()).unwrap_or(&default_title).chars().take(80).collect();
    let mut body = json!({ "title": title, "trackName": track.chars().take(80).collect::<String>(), "type": kind });
    if let Some(server) = core.session.server_name.as_deref().filter(|s| !s.is_empty()) {
        body["serverName"] = json!(server.chars().take(80).collect::<String>());
    }
    body
}

fn title_case(word: &str) -> String {
    let lower = word.to_lowercase();
    let mut chars = lower.chars();
    chars.next().map(|first| first.to_uppercase().chain(chars).collect()).unwrap_or_default()
}

/// The league's newest open session, or a new one from the LMU session.
pub(super) fn current_or_new(state: &State<AppState>, league_id: &str) -> AppResult<SessionView> {
    let sessions: Vec<SessionView> = state.api.get(&format!("/leagues/{league_id}/sessions"))?;
    if let Some(open) = sessions.into_iter().find(|s| s.status == SessionStatus::Open) {
        return Ok(open);
    }
    let body = new_session_body(&state.lock(), None);
    Ok(state.api.post(&format!("/leagues/{league_id}/sessions"), &body)?)
}

pub fn list(app: &AppHandle) -> AppResult<Vec<SessionView>> {
    let state = app.state::<AppState>();
    let link = linked(&state.lock())?;
    Ok(state.api.get(&format!("/leagues/{}/sessions", link.league_id))?)
}

/// A new session for the league (the next race), followed at once.
pub fn open(app: &AppHandle, title: Option<&str>) -> AppResult<TeamView> {
    let state = app.state::<AppState>();
    let (link, body) = {
        let core = state.lock();
        (linked(&core)?, new_session_body(&core, title))
    };
    let session: SessionView = state.api.post(&format!("/leagues/{}/sessions", link.league_id), &body)?;
    follow(app, link, session)
}

pub fn switch(app: &AppHandle, session_id: &str) -> AppResult<TeamView> {
    let state = app.state::<AppState>();
    let link = linked(&state.lock())?;
    let session =
        list(app)?.into_iter().find(|s| s.id == session_id).ok_or_else(|| AppError::not_found("No such session"))?;
    follow(app, link, session)
}

fn follow(app: &AppHandle, link: TeamLink, session: SessionView) -> AppResult<TeamView> {
    let state = app.state::<AppState>();
    state.lock().link_to(TeamLink::new(link.league_id, link.league_name, link.user_id, session))?;
    engine::restart(app);
    Ok(state.team_view())
}

/// Head stewards close a session (read-only from then on) or reopen it.
pub fn set_status(app: &AppHandle, status: SessionStatus) -> AppResult<TeamView> {
    let state = app.state::<AppState>();
    let session_id =
        linked(&state.lock())?.session_id().map(str::to_string).ok_or_else(|| AppError::invalid("No session"))?;
    let session: SessionView = state.api.patch(&format!("/sessions/{session_id}"), &json!({ "status": status }))?;
    let mut core = state.lock();
    if let Some(link) = core.link_mut() {
        link.session = Some(session);
    }
    core.changed();
    emit_team(app, &core);
    Ok(core.team_view())
}

/// This PC streams its timing to the league; the game (or the simulator) must be running.
pub fn start_stream(app: &AppHandle) -> AppResult<TeamView> {
    let state = app.state::<AppState>();
    let (link, ready) = {
        let core = state.lock();
        (linked(&core)?, core.session.connected && core.feeds_league())
    };
    if !ready {
        return Err(AppError::invalid(
            "Start Le Mans Ultimate first (Settings → Data source): the stream sends its timing",
        ));
    }
    let session_id = link.session_id().ok_or_else(|| AppError::invalid("Open a session first"))?;
    let stream: LiveStream =
        state.api.post(&format!("/leagues/{}/streams", link.league_id), &json!({ "sessionId": session_id }))?;
    frames::start(app, stream.id.clone());
    let mut core = state.lock();
    core.team.stream = Some(stream);
    core.team.remote = None;
    emit_team(app, &core);
    Ok(core.team_view())
}

/// Stops this PC's stream, or — head stewards — someone else's.
pub fn stop_stream(app: &AppHandle) -> AppResult<TeamView> {
    let state = app.state::<AppState>();
    let stream_id = state
        .lock()
        .team
        .stream
        .as_ref()
        .map(|s| s.id.clone())
        .ok_or_else(|| AppError::invalid("Nobody is streaming"))?;
    match state.api.delete::<()>(&format!("/streams/{stream_id}")) {
        Ok(()) => {}
        Err(error) if error.status() == Some(404) => {}
        Err(error) => return Err(error.into()),
    }
    let mut core = state.lock();
    core.stop_streaming_here();
    core.team.stream = None;
    emit_team(app, &core);
    Ok(core.team_view())
}
