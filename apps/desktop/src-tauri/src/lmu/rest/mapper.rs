//! Raw LMU JSON → domain types. The one place a game patch is allowed to break.

use std::collections::HashMap;

use super::parse::{RawSessionInfo, RawStandingEntry};
use crate::domain::{SessionInfo, SessionPhase, SessionType, StandingEntry};

/// LMU's carClass is the raw string off the vehicle files, not the WEC name the UI tints
/// on: a live ELMS grid at Monza sent "GT3" and "LMP2_ELMS". Unmapped values pass through —
/// a class with no tint is cosmetic; inventing a mapping nobody observed is a correctness bug.
pub fn normalize_car_class(raw: &str) -> String {
    match raw {
        "Hyper" => "HYPERCAR",
        "GT3" | "LMGT3" => "LMGT3",
        "LMP2_ELMS" | "LMP2" => "LMP2",
        other => other,
    }
    .to_string()
}

pub fn map_session_type(raw: &str) -> SessionType {
    let upper = raw.to_uppercase();
    if upper.starts_with("PRACTICE") || upper.starts_with("WARMUP") {
        SessionType::Practice
    } else if upper.starts_with("QUALIFY") {
        SessionType::Qualifying
    } else if upper.starts_with("RACE") {
        SessionType::Race
    } else {
        SessionType::Unknown
    }
}

/// rFactor 2's mGamePhase ordinal (InternalsPlugin.hpp, ScoringInfoV01): 5 green, 6 full
/// course yellow / safety car, 7 stopped, 8 over. 0–4 (pre-session, formation) and 9
/// (paused) carry no flag a steward acts on, so they fall through to yellowFlagState.
fn map_game_phase(game_phase: f64) -> SessionPhase {
    match game_phase as i64 {
        5 => SessionPhase::Green,
        6 => SessionPhase::Fcy,
        7 => SessionPhase::Red,
        8 => SessionPhase::Finished,
        _ => SessionPhase::Unknown,
    }
}

fn map_yellow_flag_state(state: &str) -> SessionPhase {
    if state == "NONE" {
        SessionPhase::Unknown
    } else if state.contains("FULL_COURSE") || state.contains("FCY") {
        SessionPhase::Fcy
    } else if state.contains("SAFETY") {
        SessionPhase::SafetyCar
    } else {
        SessionPhase::Yellow
    }
}

pub fn map_session_phase(game_phase: f64, yellow_flag_state: &str, on_unknown: &mut dyn FnMut(String)) -> SessionPhase {
    let from_phase = map_game_phase(game_phase);
    if from_phase != SessionPhase::Unknown {
        return from_phase;
    }
    let from_yellow = map_yellow_flag_state(yellow_flag_state);
    if from_yellow == SessionPhase::Unknown {
        on_unknown(game_phase.to_string());
    }
    from_yellow
}

pub fn map_session_info(raw: &RawSessionInfo, on_unknown_phase: &mut dyn FnMut(String)) -> SessionInfo {
    SessionInfo {
        connected: true,
        session_type: map_session_type(&raw.session),
        session_phase: map_session_phase(raw.game_phase, &raw.yellow_flag_state, on_unknown_phase),
        elapsed_seconds: raw.current_event_time,
        remaining_seconds: remaining_or_none(raw.end_event_time, raw.current_event_time),
        track_name: raw.track_name.clone(),
        server_name: (!raw.server_name.is_empty()).then(|| raw.server_name.clone()),
    }
}

/// A session can run past its end (observed −506.8 s in practice). None = no countdown:
/// a negative clock reads as a bug to the steward.
pub fn remaining_or_none(end_event_time: f64, current_event_time: f64) -> Option<f64> {
    let remaining = end_event_time - current_event_time;
    (end_event_time > 0.0 && remaining >= 0.0).then_some(remaining)
}

/// −1.0 is LMU's "no time yet" sentinel; 0.0 shows up the same way before a first lap.
fn positive(value: f64) -> Option<f64> {
    (value > 0.0).then_some(value)
}

/// LMU's sector fields are cumulative from lap start and there is no sector-3 field
/// (verified live: lastLapTime 89.956, sector1 22.828, sector2 56.996). An unknown earlier
/// sector makes later ones unknown; a negative result is nulled rather than shown.
pub fn derive_sectors(
    last_lap: Option<f64>,
    sector1: Option<f64>,
    sector2_cumulative: Option<f64>,
) -> [Option<f64>; 3] {
    let Some(s1) = sector1 else { return [None, None, None] };
    let Some(s2_cum) = sector2_cumulative else { return [Some(s1), None, None] };
    let non_negative = |v: f64| (v >= 0.0).then_some(v);
    let s3 = last_lap.and_then(|lap| non_negative(lap - s2_cum));
    [Some(s1), non_negative(s2_cum - s1), s3]
}

pub fn format_gap_to_leader(position: i64, laps_behind: i64, time_behind: f64) -> String {
    if position == 1 {
        return "Leader".into();
    }
    if laps_behind >= 1 {
        return format!("+{laps_behind} lap{}", if laps_behind > 1 { "s" } else { "" });
    }
    // LMU reports a negative delta on a rolling comparison — never render "+-34.584".
    if time_behind < 0.0 {
        format!("{time_behind:.3}")
    } else {
        format!("+{time_behind:.3}")
    }
}

/// positionInClass has no source field — ranked by overall position within carClass.
pub fn position_in_class(entries: &[RawStandingEntry]) -> HashMap<i64, i64> {
    let mut by_position: Vec<&RawStandingEntry> = entries.iter().collect();
    by_position.sort_by(|a, b| a.position.total_cmp(&b.position));
    let mut counters: HashMap<&str, i64> = HashMap::new();
    let mut result = HashMap::new();
    for entry in by_position {
        let next = counters.entry(entry.car_class.as_str()).or_insert(0);
        *next += 1;
        result.insert(entry.slot_id as i64, *next);
    }
    result
}

pub fn map_standings(raw: &[RawStandingEntry]) -> Vec<StandingEntry> {
    let class_rank = position_in_class(raw);
    raw.iter().map(|r| map_standing(r, class_rank.get(&(r.slot_id as i64)).copied().unwrap_or(0))).collect()
}

fn map_standing(raw: &RawStandingEntry, position_in_class: i64) -> StandingEntry {
    let last_lap = positive(raw.last_lap_time);
    let [sector1, sector2, sector3] =
        derive_sectors(last_lap, positive(raw.last_sector_time1), positive(raw.last_sector_time2));
    StandingEntry {
        slot_id: raw.slot_id as i64,
        position: raw.position as i64,
        position_in_class,
        car_number: raw.car_number.clone(),
        driver_name: raw.driver_name.clone(),
        team_name: raw.full_team_name.clone(),
        car_class: normalize_car_class(&raw.car_class),
        laps_completed: raw.laps_completed as i64,
        gap_to_leader: format_gap_to_leader(raw.position as i64, raw.laps_behind_leader as i64, raw.time_behind_leader),
        last_lap_seconds: last_lap,
        best_lap_seconds: positive(raw.best_lap_time),
        sector1,
        sector2,
        sector3,
        // No top-speed field exists on this endpoint — only an instantaneous velocity.
        top_speed_kph: None,
        in_pit: raw.pitting,
        pit_stops: raw.pitstops as i64,
    }
}

#[cfg(test)]
#[path = "mapper_tests.rs"]
mod tests;
