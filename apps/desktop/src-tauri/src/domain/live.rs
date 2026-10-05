//! Live timing: the session and the standings, as LMU (or the league's stream) reports them.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SessionType {
    Practice,
    Qualifying,
    Race,
    Unknown,
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SessionPhase {
    Green,
    Yellow,
    Fcy,
    SafetyCar,
    Red,
    Finished,
    Unknown,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub connected: bool,
    pub session_type: SessionType,
    pub session_phase: SessionPhase,
    /// Canonical timestamp source for every incident, float seconds.
    pub elapsed_seconds: f64,
    pub remaining_seconds: Option<f64>,
    pub track_name: String,
    pub server_name: Option<String>,
}

impl SessionInfo {
    /// Before the first LMU update arrives.
    pub fn disconnected() -> Self {
        Self {
            connected: false,
            session_type: SessionType::Unknown,
            session_phase: SessionPhase::Unknown,
            elapsed_seconds: 0.0,
            remaining_seconds: None,
            track_name: String::new(),
            server_name: None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StandingEntry {
    /// LMU slotID — unique per car for the session. Car numbers are NOT unique,
    /// so this, never carNumber, is the identity for keys and lookups.
    pub slot_id: i64,
    pub position: i64,
    pub position_in_class: i64,
    pub car_number: String,
    pub driver_name: String,
    pub team_name: String,
    /// HYPERCAR | LMP2 | LMGT3 | ...
    pub car_class: String,
    pub laps_completed: i64,
    pub gap_to_leader: String,
    pub last_lap_seconds: Option<f64>,
    pub best_lap_seconds: Option<f64>,
    pub sector1: Option<f64>,
    pub sector2: Option<f64>,
    pub sector3: Option<f64>,
    pub top_speed_kph: Option<f64>,
    pub in_pit: bool,
    pub pit_stops: i64,
}
