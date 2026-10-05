//! Leagues, their members, invites and race sessions (docs/sync-api.md).

use serde::{Deserialize, Serialize};

use crate::domain::SessionType;

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeagueRole {
    Steward,
    HeadSteward,
    Owner,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Person {
    pub id: String,
    pub display_name: String,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LiveStream {
    pub id: String,
    pub session_id: String,
    pub streamer: Person,
    pub started_at: String,
    pub last_frame_at: Option<String>,
}

/// GET /leagues: a league the steward belongs to.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MyLeague {
    pub id: String,
    pub name: String,
    pub role: LeagueRole,
    /// Sync runs while the owner's subscription does.
    pub sync_on: bool,
    pub owner: Person,
    pub members: u32,
    pub stream: Option<LiveStream>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LiveMember {
    pub user_id: String,
    pub display_name: String,
    pub role: LeagueRole,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MemberView {
    pub user_id: String,
    pub display_name: String,
    pub role: LeagueRole,
    pub discord_username: String,
    pub joined_at: String,
}

/// GET /leagues/:id
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LeagueView {
    #[serde(flatten)]
    pub league: MyLeague,
    pub roster: Vec<MemberView>,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct InvitePreview {
    pub league: InvitedLeague,
    pub role: LeagueRole,
    pub invited_by: Option<String>,
    pub expires_at: String,
    pub places_left: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub struct InvitedLeague {
    pub name: String,
    pub members: u32,
}

/// POST /leagues/:id/invites: the code is in this answer only.
#[derive(Deserialize)]
pub struct CreatedInvite {
    pub code: String,
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Open,
    Closed,
}

/// A race session the league stewards together (GET /leagues/:id/sessions).
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SessionView {
    pub id: String,
    pub title: String,
    pub track_name: String,
    #[serde(rename = "type")]
    pub kind: SessionType,
    pub status: SessionStatus,
    pub closed_at: Option<String>,
    /// Absent from live events, present in REST answers.
    #[serde(default)]
    pub incidents: u32,
}
