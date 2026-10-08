//! Incidents and what they hold: cars, penalty, rules.

use serde::{Deserialize, Deserializer, Serialize};

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IncidentType {
    Contact,
    OffTrack,
    TrackLimits,
    UnsafeRejoin,
    UnsafePitRelease,
    Blocking,
    DangerousDriving,
    FalseStart,
    SpeedingPitLane,
    FcyInfringement,
    Other,
}

/// Mirrors real race control flow — the steward will recognise these.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IncidentStatus {
    Noted,
    UnderInvestigation,
    NoFurtherAction,
    PenaltyApplied,
    Dismissed,
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PenaltyType {
    Warning,
    Reprimand,
    TimePenalty,
    DriveThrough,
    StopGo,
    GridPenaltyNextRace,
    Disqualification,
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InvolvedRole {
    Reported,
    Reporter,
    Involved,
    /// The car the stewards hold responsible.
    Caused,
    /// The car that suffered from it (spun, lost places, forced off).
    Affected,
}

/// 'LMU' incidents are auto-created from LMU's incidents feed; never client-writable.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IncidentSource {
    #[default]
    Steward,
    Lmu,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InvolvedCar {
    pub car_number: String,
    pub driver_name: String,
    /// carNumber alone is not unique — two classes can share a number.
    /// '' for incidents persisted before this field existed.
    #[serde(default)]
    pub car_class: String,
    pub lap_at_incident: Option<i64>,
    pub role: InvolvedRole,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Penalty {
    #[serde(rename = "type")]
    pub kind: PenaltyType,
    /// Required for TIME_PENALTY and STOP_GO.
    pub seconds: Option<i64>,
    pub applied_to: String,
    pub served: bool,
    pub notes: String,
}

/// A rule from the league's rule book, copied onto the incident (code + title) so an
/// export stays right even after the rule book is replaced.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuleRef {
    pub code: String,
    pub title: String,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Incident {
    pub id: String,
    /// Human-facing: #1, #2, #3 — never reused.
    pub sequence_number: u32,
    #[serde(default)]
    pub source: IncidentSource,
    /// Set on a child merged into a primary: hidden from the list and CSV, kept as audit trail.
    #[serde(default)]
    pub merged_into_id: Option<String>,
    #[serde(default)]
    pub merged_from_ids: Vec<String>,
    /// The LMU contact it came from — identical on every steward's PC in the session, so a
    /// shared session file recognises the same incident. None for steward-logged ones.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lmu_key: Option<String>,
    /// When it HAPPENED, after the look-back offset.
    pub event_seconds: f64,
    /// When the steward pressed the key.
    pub logged_at_seconds: f64,
    /// eventSeconds = loggedAtSeconds - this.
    pub lookback_applied: f64,
    pub wall_clock: String,
    /// e.g. "RACE 01:23:45 — Lap 42" — typed into the LMU replay scrubber.
    pub replay_reference: String,
    pub cars: Vec<InvolvedCar>,
    #[serde(rename = "type")]
    pub kind: IncidentType,
    pub status: IncidentStatus,
    pub summary: String,
    /// Internal findings — never leaves the tool in the drivers CSV.
    pub steward_notes: String,
    /// Published wording, goes to drivers.
    pub decision: String,
    pub penalty: Option<Penalty>,
    /// Rules the steward found broken. Absent on older files.
    #[serde(default)]
    pub rules: Vec<RuleRef>,
    pub logged_by: String,
    /// The stewards on it, in the order they claimed it: a claim or an edit adds one, and each
    /// removes only their own. An older file's single `reviewedBy` reads as the first claim.
    #[serde(default, alias = "reviewedBy", deserialize_with = "names")]
    pub reviewers: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    /// The league's version of it (team sync): 0 while it exists on this PC only.
    #[serde(default, skip_serializing_if = "is_zero")]
    pub version: u32,
    /// Two stewards changed the same field: this PC's newer edit was kept.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub edited_twice: bool,
}

fn is_zero(value: &u32) -> bool {
    *value == 0
}

/// `["A", "B"]`, or an older file's `"A"` or `null`.
fn names<'de, D: Deserializer<'de>>(de: D) -> Result<Vec<String>, D::Error> {
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Names {
        Many(Vec<String>),
        One(String),
    }
    Ok(match Option::<Names>::deserialize(de)? {
        Some(Names::Many(names)) => names,
        Some(Names::One(name)) => vec![name],
        None => Vec::new(),
    })
}

#[cfg(test)]
#[path = "incident_tests.rs"]
mod tests;
