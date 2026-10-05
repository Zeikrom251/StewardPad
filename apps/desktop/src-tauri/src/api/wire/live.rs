//! Live timing and the live events' payloads (GET /leagues/:id/events).

use serde::{Deserialize, Serialize};

use super::{LiveMember, LiveStream, SessionView, SyncedIncident};
use crate::domain::{SessionInfo, StandingEntry};

/// PUT /streams/:id/frame: the whole picture, about once a second.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TimingFrame {
    pub seq: u32,
    pub session: SessionInfo,
    pub standings: Vec<StandingEntry>,
}

#[derive(Deserialize)]
pub struct Hello {
    pub stream: Option<LiveStream>,
    /// A keyframe (`type: key`), parsed by team/timing.rs.
    pub timing: Option<serde_json::Value>,
    pub online: Vec<String>,
}

#[derive(Deserialize)]
pub struct IncidentEvent {
    pub revision: String,
    pub incident: SyncedIncident,
}

#[derive(Deserialize)]
pub struct StreamEvent {
    /// started | ended
    pub change: String,
    pub stream: LiveStream,
    /// stopped | replaced | dropped | removed | session_closed
    pub reason: Option<String>,
}

#[derive(Deserialize)]
pub struct SessionEvent {
    /// opened | closed | deleted
    pub change: String,
    pub session: SessionView,
}

#[derive(Deserialize)]
pub struct MemberEvent {
    /// joined | role_changed | removed
    pub change: String,
    pub member: LiveMember,
}

#[derive(Deserialize)]
pub struct Presence {
    pub online: Vec<String>,
}
