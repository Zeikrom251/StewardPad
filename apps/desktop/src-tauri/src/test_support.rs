//! Builders for tests only — a full Incident / StandingEntry with overridable fields.

use crate::domain::*;

pub fn incident(id: &str, sequence_number: u32) -> Incident {
    Incident {
        id: id.to_string(),
        sequence_number,
        source: IncidentSource::Steward,
        merged_into_id: None,
        merged_from_ids: vec![],
        event_seconds: 110.0,
        logged_at_seconds: 120.0,
        lookback_applied: 10.0,
        wall_clock: "2026-09-28T09:00:00.000Z".into(),
        replay_reference: "RACE 00:01:50 — Lap 3".into(),
        cars: vec![],
        kind: IncidentType::Contact,
        status: IncidentStatus::Noted,
        summary: String::new(),
        steward_notes: String::new(),
        decision: String::new(),
        penalty: None,
        logged_by: "Steward".into(),
        reviewed_by: None,
        created_at: "2026-09-28T09:00:00.000Z".into(),
        updated_at: "2026-09-28T09:00:00.000Z".into(),
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
