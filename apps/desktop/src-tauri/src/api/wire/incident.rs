//! Incidents as the league holds them, and the fields a PC may set (IncidentFields).

use serde::Deserialize;
use serde_json::{Map, Value};

use crate::domain::{Incident, IncidentSource, IncidentStatus, IncidentType, InvolvedCar, Penalty, RuleRef};

/// What a steward sets; the server numbers, stamps and versions the rest. The keys of
/// `IncidentFields` in packages/types, as the domain Incident serializes them.
pub const FIELD_KEYS: [&str; 13] = [
    "eventSeconds",
    "loggedAtSeconds",
    "lookbackApplied",
    "wallClock",
    "replayReference",
    "cars",
    "type",
    "status",
    "summary",
    "stewardNotes",
    "decision",
    "penalty",
    "rules",
];

pub type Fields = Map<String, Value>;

fn as_map(incident: &Incident) -> Fields {
    match serde_json::to_value(incident) {
        Ok(Value::Object(map)) => map,
        _ => Fields::new(),
    }
}

/// Every field a PC sends when it logs the incident.
pub fn fields_of(incident: &Incident) -> Fields {
    let all = as_map(incident);
    FIELD_KEYS.iter().filter_map(|key| all.get(*key).map(|value| (key.to_string(), value.clone()))).collect()
}

/// The fields an edit changed, with their new values: all an IncidentEdit carries.
pub fn changed_fields(before: &Incident, after: &Incident) -> Fields {
    let (old, new) = (fields_of(before), fields_of(after));
    new.into_iter().filter(|(key, value)| old.get(key) != Some(value)).collect()
}

/// Puts `fields` on the incident: a teammate's copy keeps this PC's unsent changes on top.
/// One field at a time: a value that no longer fits loses only itself, never the others.
pub fn overlay(incident: &mut Incident, fields: &Fields) {
    for (key, value) in fields {
        let mut map = as_map(incident);
        map.insert(key.clone(), value.clone());
        match serde_json::from_value(Value::Object(map)) {
            Ok(merged) => *incident = merged,
            Err(error) => eprintln!("[sync] Could not keep this PC's {key} on #{}: {error}", incident.sequence_number),
        }
    }
}

/// An incident as the API answers and broadcasts it.
#[derive(Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SyncedIncident {
    pub id: String,
    pub session_id: String,
    pub sequence_number: u32,
    pub source: IncidentSource,
    pub merged_into_id: Option<String>,
    pub merged_from_ids: Vec<String>,
    pub lmu_key: Option<String>,
    pub event_seconds: f64,
    pub logged_at_seconds: f64,
    pub lookback_applied: f64,
    pub wall_clock: String,
    pub replay_reference: String,
    pub cars: Vec<InvolvedCar>,
    #[serde(rename = "type")]
    pub kind: IncidentType,
    pub status: IncidentStatus,
    pub summary: String,
    pub steward_notes: String,
    pub decision: String,
    pub penalty: Option<Penalty>,
    pub rules: Vec<RuleRef>,
    pub logged_by: Option<String>,
    pub reviewers: Vec<String>,
    pub version: u32,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl SyncedIncident {
    /// The local copy. LMU contacts read "LMU" as on a solo PC; a deleted account reads "".
    pub fn into_incident(self) -> Incident {
        let logged_by = match self.source {
            IncidentSource::Lmu => "LMU".to_string(),
            IncidentSource::Steward => self.logged_by.unwrap_or_default(),
        };
        Incident {
            id: self.id,
            sequence_number: self.sequence_number,
            source: self.source,
            merged_into_id: self.merged_into_id,
            merged_from_ids: self.merged_from_ids,
            lmu_key: self.lmu_key,
            event_seconds: self.event_seconds,
            logged_at_seconds: self.logged_at_seconds,
            lookback_applied: self.lookback_applied,
            wall_clock: self.wall_clock,
            replay_reference: self.replay_reference,
            cars: self.cars,
            kind: self.kind,
            status: self.status,
            summary: self.summary,
            steward_notes: self.steward_notes,
            decision: self.decision,
            penalty: self.penalty,
            rules: self.rules,
            logged_by,
            reviewers: self.reviewers,
            created_at: self.created_at,
            updated_at: self.updated_at,
            version: self.version,
            edited_twice: false,
        }
    }
}

/// GET /sessions/:id/incidents: every incident, and the league revision it was read at.
#[derive(Deserialize)]
pub struct SessionIncidents {
    pub revision: String,
    pub incidents: Vec<SyncedIncident>,
}
