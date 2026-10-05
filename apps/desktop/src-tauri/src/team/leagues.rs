//! Joining and leaving leagues, and linking this PC's session to one (boards 04 and 04b).

use serde_json::json;
use tauri::{AppHandle, Manager};

use super::{engine, sessions, TeamLink, TeamView};
use crate::api::wire::{InvitePreview, LeagueView, MyLeague, SessionIncidents};
use crate::api::{Api, ApiError};
use crate::app::{emit_incidents, emit_team, AppState};
use crate::core::Core;
use crate::error::{AppError, AppResult, ErrorKind};

fn signed_in(core: &Core) -> AppResult<String> {
    core.account.my_id().map(str::to_string).ok_or_else(|| AppError::new(ErrorKind::SignedOut, "Sign in first"))
}

fn api(app: &AppHandle) -> &Api {
    &app.state::<AppState>().inner().api
}

pub fn list(app: &AppHandle) -> AppResult<Vec<MyLeague>> {
    Ok(api(app).get("/leagues")?)
}

pub fn create(app: &AppHandle, name: &str) -> AppResult<MyLeague> {
    let name = name.trim();
    if !(2..=60).contains(&name.chars().count()) {
        return Err(AppError::invalid("A league name is 2 to 60 characters"));
    }
    Ok(api(app).post("/leagues", &json!({ "name": name }))?)
}

/// The code from what the steward pasted: the website's link, the app's, or the bare code.
fn invite_code(input: &str) -> AppResult<String> {
    let input = input.trim();
    let code = input
        .rsplit_once("/join#")
        .map(|(_, code)| code)
        .or_else(|| input.strip_prefix("stewardpad://join?code="))
        .unwrap_or(input);
    let valid = code.len() == 22 && code.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-');
    valid.then(|| code.to_string()).ok_or_else(|| AppError::invalid("That isn't an invite link or code"))
}

pub fn preview(app: &AppHandle, invite: &str) -> AppResult<InvitePreview> {
    Ok(api(app).get(&format!("/invites/{}", invite_code(invite)?))?)
}

pub fn join(app: &AppHandle, invite: &str) -> AppResult<MyLeague> {
    Ok(api(app).post(&format!("/invites/{}/accept", invite_code(invite)?), &json!({}))?)
}

/// Board 04 → a league: this PC follows its open session (or opens one from the LMU session).
pub fn enter(app: &AppHandle, league_id: &str) -> AppResult<TeamView> {
    let state = app.state::<AppState>();
    let user_id = signed_in(&state.lock())?;
    let league: LeagueView = state.api.get(&format!("/leagues/{league_id}"))?;
    if !league.league.sync_on {
        return Err(AppError::invalid("Team sync is off: the league owner's subscription ended"));
    }
    let session = sessions::current_or_new(&state, league_id)?;
    {
        let mut core = state.lock();
        let link = TeamLink::new(league.league.id.clone(), league.league.name.clone(), user_id, session);
        core.link_to(link)?;
        core.team.league = Some(league);
        emit_incidents(app, &core);
    }
    engine::restart(app);
    Ok(state.team_view())
}

/// Back to stewarding on your own: the incidents stay on this PC, the link goes.
pub fn leave_link(app: &AppHandle) -> TeamView {
    let state = app.state::<AppState>();
    {
        let mut core = state.lock();
        core.store.team = None;
        core.changed();
    }
    engine::reconcile(app);
    state.team_view()
}

/// The league is gone for this PC (removed, deleted): stop syncing and say why.
pub fn left(app: &AppHandle, reason: &str) {
    leave_link(app);
    let state = app.state::<AppState>();
    let mut core = state.lock();
    core.team.notice = Some(reason.to_string());
    emit_team(app, &core);
}

/// The listener's first step: the league (roster, this PC's role) and the session's incidents.
pub(super) fn load(app: &AppHandle) -> Result<(), ApiError> {
    let state = app.state::<AppState>();
    let Some((league_id, session_id)) =
        state.lock().link().map(|l| (l.league_id.clone(), l.session_id().map(str::to_string)))
    else {
        return Ok(());
    };
    let league: LeagueView = state.api.get(&format!("/leagues/{league_id}"))?;
    let snapshot = match &session_id {
        Some(id) => Some(state.api.get::<SessionIncidents>(&format!("/sessions/{id}/incidents"))?),
        None => None,
    };
    let mut core = state.lock();
    core.team.league = Some(league);
    if let Some(snapshot) = snapshot {
        core.apply_snapshot(snapshot);
        emit_incidents(app, &core);
    }
    emit_team(app, &core);
    Ok(())
}

pub(super) fn refresh_roster(app: &AppHandle) {
    let state = app.state::<AppState>();
    let Some(league_id) = state.lock().link().map(|l| l.league_id.clone()) else { return };
    match state.api.get::<LeagueView>(&format!("/leagues/{league_id}")) {
        Ok(league) => {
            let mut core = state.lock();
            core.team.league = Some(league);
            emit_team(app, &core);
        }
        Err(error) => eprintln!("[sync] Could not refresh the roster: {error:?}"),
    }
}

impl Core {
    /// Follows another league session. The incidents of the one before go to the archive
    /// folder first; changes not yet sent stay queued (each knows where it goes).
    pub(crate) fn link_to(&mut self, mut next: TeamLink) -> AppResult<()> {
        if self.link().is_some_and(|l| l.league_id == next.league_id && l.session_id() == next.session_id()) {
            return Ok(());
        }
        if !self.store.all().is_empty() {
            let track = self.session.track_name.clone();
            self.archive(&track)?;
        }
        if let Some(previous) = self.store.team.take() {
            next.outbox = previous.outbox;
            if previous.league_id == next.league_id {
                next.revision = previous.revision;
            }
        }
        self.store.team = Some(next);
        self.changed();
        Ok(())
    }
}
