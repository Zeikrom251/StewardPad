//! Team: leagues, members, invites, the race session and the live stream (boards 04 to 07).
//! Each command calls the API through team/; the API checks every role and rule.

use tauri::{AppHandle, State};

use super::in_background;

use crate::api::wire::{InvitePreview, LeagueRole, MyLeague, SessionStatus, SessionView};
use crate::app::AppState;
use crate::error::AppResult;
use crate::team::members::{self, InviteInput, InviteLink};
use crate::team::{leagues, sessions, TeamView};

#[tauri::command]
pub fn team_get(state: State<AppState>) -> TeamView {
    state.lock().team_view()
}

#[tauri::command]
pub async fn team_leagues(app: AppHandle) -> AppResult<Vec<MyLeague>> {
    in_background(app, leagues::list).await
}

#[tauri::command]
pub async fn team_create_league(app: AppHandle, name: String) -> AppResult<MyLeague> {
    in_background(app, move |app| leagues::create(app, &name)).await
}

#[tauri::command]
pub async fn team_preview_invite(app: AppHandle, invite: String) -> AppResult<InvitePreview> {
    in_background(app, move |app| leagues::preview(app, &invite)).await
}

#[tauri::command]
pub async fn team_join(app: AppHandle, invite: String) -> AppResult<MyLeague> {
    in_background(app, move |app| leagues::join(app, &invite)).await
}

/// Follow this league's open session on this PC.
#[tauri::command]
pub async fn team_enter(app: AppHandle, league_id: String) -> AppResult<TeamView> {
    in_background(app, move |app| leagues::enter(app, &league_id)).await
}

/// Steward on your own again; the incidents stay on this PC.
#[tauri::command]
pub async fn team_leave_link(app: AppHandle) -> AppResult<TeamView> {
    in_background(app, move |app| Ok(leagues::leave_link(app))).await
}

#[tauri::command]
pub async fn team_sessions(app: AppHandle) -> AppResult<Vec<SessionView>> {
    in_background(app, sessions::list).await
}

#[tauri::command]
pub async fn team_open_session(app: AppHandle, title: Option<String>) -> AppResult<TeamView> {
    in_background(app, move |app| sessions::open(app, title.as_deref())).await
}

#[tauri::command]
pub async fn team_switch_session(app: AppHandle, session_id: String) -> AppResult<TeamView> {
    in_background(app, move |app| sessions::switch(app, &session_id)).await
}

#[tauri::command]
pub async fn team_set_session_status(app: AppHandle, status: SessionStatus) -> AppResult<TeamView> {
    in_background(app, move |app| sessions::set_status(app, status)).await
}

#[tauri::command]
pub async fn team_start_stream(app: AppHandle) -> AppResult<TeamView> {
    in_background(app, sessions::start_stream).await
}

#[tauri::command]
pub async fn team_stop_stream(app: AppHandle) -> AppResult<TeamView> {
    in_background(app, sessions::stop_stream).await
}

#[tauri::command]
pub async fn team_invite(app: AppHandle, input: InviteInput) -> AppResult<InviteLink> {
    in_background(app, move |app| members::invite(app, input)).await
}

#[tauri::command]
pub async fn team_change_role(app: AppHandle, user_id: String, role: LeagueRole) -> AppResult<()> {
    in_background(app, move |app| members::change_role(app, &user_id, role)).await
}

/// Removes a member, or leaves the league (your own id).
#[tauri::command]
pub async fn team_remove_member(app: AppHandle, user_id: String) -> AppResult<()> {
    in_background(app, move |app| members::remove(app, &user_id)).await
}

#[tauri::command]
pub async fn team_hand_over(app: AppHandle, user_id: String) -> AppResult<MyLeague> {
    in_background(app, move |app| members::hand_over(app, &user_id)).await
}

#[tauri::command]
pub async fn team_rename_league(app: AppHandle, name: String) -> AppResult<MyLeague> {
    in_background(app, move |app| members::rename(app, &name)).await
}

#[tauri::command]
pub async fn team_delete_league(app: AppHandle) -> AppResult<()> {
    in_background(app, members::delete).await
}
