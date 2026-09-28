//! Narrows raw `/rest/*` JSON to the exact fields the mapper needs. This file and
//! `mapper.rs` are the only two allowed to know an LMU field name — a game patch breaks
//! parsing here, nothing downstream. Names are copied from live captures, never guessed
//! (tests/fixtures/live-*.json).

use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::Value;

use crate::lmu::resolver::RawLmuContact;

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RawSessionInfo {
    pub current_event_time: f64,
    pub end_event_time: f64,
    pub track_name: String,
    pub server_name: String,
    pub session: String,
    pub yellow_flag_state: String,
    /// A NUMBER, and it lives here on sessionInfo. LMU serializes yellowFlagState as an
    /// enum name but gamePhase as its raw ordinal — inconsistent, but it's what the game sends.
    pub game_phase: f64,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RawStandingEntry {
    #[serde(rename = "slotID")]
    pub slot_id: f64,
    pub position: f64,
    pub car_number: String,
    pub driver_name: String,
    pub full_team_name: String,
    pub car_class: String,
    pub laps_completed: f64,
    pub last_lap_time: f64,
    pub best_lap_time: f64,
    pub last_sector_time1: f64,
    pub last_sector_time2: f64,
    pub pitting: bool,
    pub pitstops: f64,
    pub time_behind_leader: f64,
    pub laps_behind_leader: f64,
}

pub struct ListParse<T> {
    pub entries: Vec<T>,
    pub skipped: usize,
}

pub fn parse_session_info(payload: &Value) -> Option<RawSessionInfo> {
    RawSessionInfo::deserialize(payload).ok()
}

pub fn parse_standings(payload: &Value) -> Option<ListParse<RawStandingEntry>> {
    parse_list(payload)
}

pub fn parse_incidents(payload: &Value) -> Option<ListParse<RawLmuContact>> {
    parse_list(payload)
}

// One bad entry must not cost the whole list: unparseable items are skipped and
// counted. `None` means the payload itself wasn't an array at all.
fn parse_list<T: DeserializeOwned>(payload: &Value) -> Option<ListParse<T>> {
    let items = payload.as_array()?;
    let entries: Vec<T> = items.iter().filter_map(|item| T::deserialize(item).ok()).collect();
    let skipped = items.len() - entries.len();
    Some(ListParse { entries, skipped })
}

/// Describes an unparseable payload for a log line — keys/length/type only, never values.
pub fn describe_shape(value: &Value) -> String {
    match value {
        Value::Null => "null".into(),
        Value::Array(items) => format!("Array({})", items.len()),
        Value::Object(map) => format!("{{{}}}", map.keys().cloned().collect::<Vec<_>>().join(", ")),
        Value::String(_) => "string".into(),
        Value::Number(_) => "number".into(),
        Value::Bool(_) => "boolean".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn live(name: &str) -> Value {
        let raw = match name {
            "session" => include_str!("../../../tests/fixtures/live-session-info.json"),
            _ => include_str!("../../../tests/fixtures/live-standings.json"),
        };
        serde_json::from_str(raw).expect("fixture parses")
    }

    #[test]
    fn parses_a_real_live_session_info_payload() {
        let parsed = parse_session_info(&live("session")).expect("live sessionInfo must parse");
        assert_eq!(parsed.game_phase, 5.0);
        assert_eq!(parsed.session, "PRACTICE1");
        assert_eq!(parsed.track_name, "Autodromo Nazionale Monza");
    }

    #[test]
    fn parses_a_real_live_standings_payload_with_nothing_skipped() {
        let parsed = parse_standings(&live("standings")).expect("live standings must parse");
        assert_eq!(parsed.skipped, 0, "no real car may be dropped");
        assert_eq!(parsed.entries.len(), 4);
    }

    #[test]
    fn skips_a_malformed_entry_and_keeps_the_rest() {
        let mut list = live("standings");
        list[1]["slotID"] = json!("not-a-number");
        let parsed = parse_standings(&list).expect("still an array");
        assert_eq!((parsed.entries.len(), parsed.skipped), (3, 1));
    }

    #[test]
    fn returns_none_only_when_the_payload_is_not_an_array() {
        assert!(parse_standings(&json!({ "not": "an array" })).is_none());
        assert!(parse_standings(&Value::Null).is_none());
    }

    #[test]
    fn describes_shape_without_leaking_values() {
        assert_eq!(describe_shape(&json!([1, 2, 3])), "Array(3)");
        assert_eq!(describe_shape(&json!({ "foo": "secret" })), "{foo}");
        assert_eq!(describe_shape(&json!("oops")), "string");
        assert_eq!(describe_shape(&Value::Null), "null");
    }
}
