//! Pure incident rules — the load-bearing parts, each pinned by a test in rules_tests.rs.

use crate::domain::{wire_name, Incident, InvolvedCar, InvolvedRole, SessionInfo, SessionType, StandingEntry};
use crate::lmu::resolver::CollisionCar;
use crate::text::format_hms;

/// Prompt §7.3 — the look-back offset. The steward reacts after the moment, so the
/// incident is stamped `lookback` seconds before the keypress. Never below zero.
pub fn compute_event_seconds(current_elapsed: f64, lookback_seconds: f64) -> f64 {
    (current_elapsed - lookback_seconds).max(0.0)
}

/// "RACE 01:23:45 — Lap 42" — typed into the LMU replay scrubber.
pub fn build_replay_reference(session_type: SessionType, event_seconds: f64, lap: i64) -> String {
    format!("{} {} — Lap {lap}", wire_name(&session_type), format_hms(event_seconds))
}

/// The lap is historical (taken from the first car at log time). An incident with no cars
/// carries it only in its replay reference, so an edit reads it back instead of restamping.
pub fn lap_from_replay_reference(reference: &str) -> i64 {
    reference.rsplit_once("Lap ").and_then(|(_, lap)| lap.parse().ok()).unwrap_or(0)
}

// LMU exposes no session id, so a new session is inferred: track or session type changed,
// or the clock jumped backwards. Small jitter is tolerated — a real restart drops to ~0.
const CLOCK_REWIND_TOLERANCE_SECONDS: f64 = 5.0;

pub fn is_new_session(previous: &SessionInfo, current: &SessionInfo) -> bool {
    previous.track_name != current.track_name
        || previous.session_type != current.session_type
        || current.elapsed_seconds < previous.elapsed_seconds - CLOCK_REWIND_TOLERANCE_SECONDS
}

/// Merge primary: the explicit id if given (caller has checked it's a candidate),
/// otherwise the lowest sequence number.
pub fn select_primary<'a>(candidates: &'a [Incident], primary_id: Option<&str>) -> Option<&'a Incident> {
    match primary_id {
        Some(id) => candidates.iter().find(|i| i.id == id),
        None => candidates.iter().min_by_key(|i| i.sequence_number),
    }
}

/// Union of every car, deduped by number + class (a number alone isn't unique).
/// The primary's cars come first.
pub fn merge_cars(incidents: &[&Incident]) -> Vec<InvolvedCar> {
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();
    for car in incidents.iter().flat_map(|i| &i.cars) {
        if seen.insert((car.car_number.clone(), car.car_class.clone())) {
            result.push(car.clone());
        }
    }
    result
}

/// Merged children are audit trail only — hidden from the list and CSV.
pub fn is_active(incident: &Incident) -> bool {
    incident.merged_into_id.is_none()
}

/// Quick-log selection → stored cars, joined on slotID (never carNumber: two classes can
/// share a number). A slot that left the grid keeps its slotID as a stand-in, never a guess.
pub fn resolve_manual_cars(slot_ids: &[String], standings: &[StandingEntry]) -> Vec<InvolvedCar> {
    slot_ids
        .iter()
        .map(|slot_id| match standings.iter().find(|s| s.slot_id.to_string() == *slot_id) {
            Some(s) => involved(&s.car_number, &s.driver_name, &s.car_class, Some(s.laps_completed)),
            None => involved(slot_id, slot_id, "", None),
        })
        .collect()
}

/// LMU collision cars → stored cars, refreshed from current standings by slotID. If the
/// slot has since left the grid, the resolver's own snapshot is used — never a number lookup.
pub fn resolve_lmu_cars(cars: &[CollisionCar], standings: &[StandingEntry]) -> Vec<InvolvedCar> {
    cars.iter()
        .map(|car| match standings.iter().find(|s| s.slot_id == car.slot_id) {
            Some(s) => involved(&s.car_number, &s.driver_name, &s.car_class, Some(s.laps_completed)),
            None => involved(&car.car_number, &car.driver_name, &car.car_class, None),
        })
        .collect()
}

fn involved(car_number: &str, driver_name: &str, car_class: &str, lap: Option<i64>) -> InvolvedCar {
    InvolvedCar {
        car_number: car_number.to_string(),
        driver_name: driver_name.to_string(),
        car_class: car_class.to_string(),
        lap_at_incident: lap,
        role: InvolvedRole::Involved,
    }
}

#[cfg(test)]
#[path = "rules_tests.rs"]
mod tests;
