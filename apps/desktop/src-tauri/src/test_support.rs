//! Builders for tests only — a full Incident / StandingEntry with overridable fields, and a
//! core in a league.

use serde_json::json;

use crate::api::wire::{SessionStatus, SessionView, SyncedIncident};
use crate::core::Core;
use crate::domain::*;
use crate::store::{Paths, Saver, Store};
use crate::team::TeamLink;

pub fn incident(id: &str, sequence_number: u32) -> Incident {
    Incident {
        id: id.to_string(),
        sequence_number,
        source: IncidentSource::Steward,
        merged_into_id: None,
        merged_from_ids: vec![],
        lmu_key: None,
        event_seconds: 110.0,
        logged_at_seconds: 120.0,
        lookback_applied: 10.0,
        wall_clock: "2026-09-28T09:00:00.000Z".into(),
        replay_reference: "RACE 00:01:50 · Lap 3".into(),
        cars: vec![],
        kind: IncidentType::Contact,
        status: IncidentStatus::Noted,
        summary: String::new(),
        steward_notes: String::new(),
        decision: String::new(),
        penalty: None,
        rules: vec![],
        logged_by: "Steward".into(),
        reviewers: Vec::new(),
        created_at: "2026-09-28T09:00:00.000Z".into(),
        updated_at: "2026-09-28T09:00:00.000Z".into(),
        version: 0,
        edited_twice: false,
    }
}

pub fn car(number: &str, class: &str) -> InvolvedCar {
    InvolvedCar {
        car_number: number.into(),
        driver_name: format!("Driver {number}"),
        car_class: class.into(),
        lap_at_incident: None,
        role: InvolvedRole::Involved,
    }
}

pub fn standing(slot_id: i64, car_number: &str, driver_name: &str, car_class: &str) -> StandingEntry {
    StandingEntry {
        slot_id,
        position: 0,
        position_in_class: 0,
        car_number: car_number.into(),
        driver_name: driver_name.into(),
        team_name: String::new(),
        car_class: car_class.into(),
        laps_completed: 3,
        gap_to_leader: String::new(),
        last_lap_seconds: None,
        best_lap_seconds: None,
        sector1: None,
        sector2: None,
        sector3: None,
        top_speed_kph: None,
        in_pit: false,
        pit_stops: 0,
    }
}

pub fn session(track: &str, session_type: SessionType, elapsed_seconds: f64) -> SessionInfo {
    SessionInfo {
        connected: true,
        session_type,
        session_phase: SessionPhase::Green,
        elapsed_seconds,
        remaining_seconds: None,
        track_name: track.into(),
        server_name: None,
    }
}

/// A core in league "Apex" (user u1), following its open session "s1".
pub fn linked_core() -> Core {
    let (saver, _changes) = Saver::channel();
    let paths = Paths::in_dir(&std::env::temp_dir().join(format!("stewardpad-linked-{}", std::process::id())));
    let mut core = Core::new(Store::empty(), paths, saver);
    let session = SessionView {
        id: "s1".into(),
        title: "Round 4".into(),
        track_name: "Spa".into(),
        kind: SessionType::Race,
        status: SessionStatus::Open,
        closed_at: None,
        incidents: 0,
    };
    core.store.team = Some(TeamLink::new("l1".into(), "Apex".into(), "u1".into(), session));
    core
}

/// The league's copy of incident `id` in session "s1", as the API sends it.
pub fn synced(id: &str, version: u32, summary: &str) -> SyncedIncident {
    serde_json::from_value(synced_json(id, version, summary)).expect("a synced incident")
}

pub fn synced_json(id: &str, version: u32, summary: &str) -> serde_json::Value {
    json!({
        "id": id, "sessionId": "s1", "sequenceNumber": 3, "source": "STEWARD",
        "mergedIntoId": null, "mergedFromIds": [], "lmuKey": null,
        "eventSeconds": 100.0, "loggedAtSeconds": 110.0, "lookbackApplied": 10.0,
        "wallClock": "2026-10-05T12:00:00.000Z", "replayReference": "RACE 00:01:40 · Lap 2",
        "cars": [], "type": "CONTACT", "status": "NOTED", "summary": summary,
        "stewardNotes": "", "decision": "", "penalty": null, "rules": [],
        "loggedBy": "Alex", "reviewers": ["Alex"], "version": version, "deletedAt": null,
        "createdAt": "2026-10-05T12:00:00.000Z", "updatedAt": "2026-10-05T12:00:00.000Z"
    })
}
