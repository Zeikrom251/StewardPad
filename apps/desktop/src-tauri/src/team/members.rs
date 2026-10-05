//! The league's members and invites (board 06): head stewards invite and re-role, the owner
//! renames, hands over or deletes the league. The API checks every role; the UI only hides.

use serde::Deserialize;
use serde_json::json;
use tauri::{AppHandle, Manager};

use super::leagues;
use crate::api::wire::{CreatedInvite, LeagueRole, MyLeague};
use crate::app::AppState;
use crate::error::{AppError, AppResult};

fn league_id(app: &AppHandle) -> AppResult<String> {
    let state = app.state::<AppState>();
    let id = state.lock().link().map(|l| l.league_id.clone());
    id.ok_or_else(|| AppError::invalid("Pick a league first"))
}

#[derive(Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InviteInput {
    pub role: Option<LeagueRole>,
    pub max_uses: Option<u32>,
    pub expires_in_hours: Option<u32>,
}

#[derive(serde::Serialize)]
pub struct InviteLink {
    pub code: String,
    /// The website's join page: the code rides in the fragment, out of server logs.
    pub url: String,
}

pub fn invite(app: &AppHandle, input: InviteInput) -> AppResult<InviteLink> {
    let state = app.state::<AppState>();
    let created: CreatedInvite = state.api.post(&format!("/leagues/{}/invites", league_id(app)?), &input)?;
    let url = format!("{}/join#{}", state.api.site(), created.code);
    Ok(InviteLink { code: created.code, url })
}

pub fn change_role(app: &AppHandle, user_id: &str, role: LeagueRole) -> AppResult<()> {
    let state = app.state::<AppState>();
    let path = format!("/leagues/{}/members/{user_id}", league_id(app)?);
    state.api.patch::<_, serde_json::Value>(&path, &json!({ "role": role }))?;
    leagues::refresh_roster(app);
    Ok(())
}

/// Removes a member — or, for yourself, leaves the league.
pub fn remove(app: &AppHandle, user_id: &str) -> AppResult<()> {
    let state = app.state::<AppState>();
    state.api.delete::<()>(&format!("/leagues/{}/members/{user_id}", league_id(app)?))?;
    if state.lock().account.my_id() == Some(user_id) {
        leagues::left(app, "You left the league");
    } else {
        leagues::refresh_roster(app);
    }
    Ok(())
}

pub fn hand_over(app: &AppHandle, user_id: &str) -> AppResult<MyLeague> {
    let state = app.state::<AppState>();
    let league = state.api.post(&format!("/leagues/{}/owner", league_id(app)?), &json!({ "userId": user_id }))?;
    leagues::refresh_roster(app);
    Ok(league)
}

pub fn rename(app: &AppHandle, name: &str) -> AppResult<MyLeague> {
    let state = app.state::<AppState>();
    let league: MyLeague =
        state.api.patch(&format!("/leagues/{}", league_id(app)?), &json!({ "name": name.trim() }))?;
    if let Some(link) = state.lock().link_mut() {
        link.league_name = league.name.clone();
    }
    leagues::refresh_roster(app);
    Ok(league)
}

/// Deletes the league with every session and incident it holds on the server; each PC keeps
/// its own session file.
pub fn delete(app: &AppHandle) -> AppResult<()> {
    let state = app.state::<AppState>();
    state.api.delete::<()>(&format!("/leagues/{}", league_id(app)?))?;
    leagues::left(app, "The league was deleted");
    Ok(())
}
