use super::*;
use crate::lmu::rest::parse::{parse_session_info, parse_standings};

fn close(actual: Option<f64>, expected: f64) -> bool {
    actual.is_some_and(|v| (v - expected).abs() < 1e-6)
}

// Real values from a live lap (car #8, Monza).
#[test]
fn converts_cumulative_sector_times_to_per_sector() {
    let [s1, s2, s3] = derive_sectors(Some(89.956), Some(22.828), Some(56.996));
    assert_eq!(s1, Some(22.828));
    assert!(close(s2, 34.168));
    assert!(close(s3, 32.96));
}

#[test]
fn an_unknown_earlier_sector_makes_later_ones_unknown() {
    assert_eq!(derive_sectors(Some(89.956), None, Some(56.996)), [None, None, None]);
    assert_eq!(derive_sectors(Some(89.956), Some(22.828), None), [Some(22.828), None, None]);
    assert_eq!(derive_sectors(None, Some(22.828), Some(56.996))[2], None);
}

#[test]
fn nulls_sectors_that_would_be_negative() {
    assert_eq!(derive_sectors(Some(50.0), Some(30.0), Some(20.0))[1], None);
    assert_eq!(derive_sectors(Some(40.0), Some(10.0), Some(45.0))[2], None);
}

#[test]
fn formats_the_gap_to_the_leader() {
    assert_eq!(format_gap_to_leader(1, 0, 0.0), "Leader");
    assert_eq!(format_gap_to_leader(2, 1, 40.0), "+1 lap");
    assert_eq!(format_gap_to_leader(5, 3, 40.0), "+3 laps");
    assert_eq!(format_gap_to_leader(2, 0, 1.234), "+1.234");
    assert_eq!(format_gap_to_leader(5, 0, -34.584), "-34.584");
}

#[test]
fn reports_no_countdown_once_a_session_runs_past_its_end() {
    assert_eq!(remaining_or_none(1800.0, 2306.8), None);
    assert!(close(remaining_or_none(1800.0, 1712.4), 87.6));
    assert_eq!(remaining_or_none(0.0, 500.0), None);
}

#[test]
fn normalizes_the_class_strings_a_live_elms_grid_sends() {
    assert_eq!(normalize_car_class("GT3"), "LMGT3");
    assert_eq!(normalize_car_class("LMP2_ELMS"), "LMP2");
    assert_eq!(normalize_car_class("Hyper"), "HYPERCAR");
    assert_eq!(normalize_car_class("LMGT3_2027"), "LMGT3_2027");
}

#[test]
fn maps_a_real_live_standings_payload() {
    let raw: serde_json::Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/live-standings.json")).expect("fixture");
    let entries = map_standings(&parse_standings(&raw).expect("parses").entries);
    let classes: Vec<&str> = entries.iter().map(|e| e.car_class.as_str()).collect();
    assert_eq!(classes, ["LMGT3", "LMP2", "LMGT3", "LMGT3"]);
    let by_number = |n: &str| entries.iter().find(|e| e.car_number == n).expect("car present");
    assert_eq!(by_number("37").gap_to_leader, "Leader");
    assert_eq!(by_number("77").gap_to_leader, "+5 laps");
    assert_eq!(by_number("76").gap_to_leader, "+36.326");
    // A car with no completed lap shows no time, not LMU's −1 sentinel.
    assert_eq!(by_number("15").last_lap_seconds, None);
    assert_eq!(by_number("15").sector1, None);
    assert!(by_number("15").in_pit);
}

#[test]
fn maps_a_real_live_session_info_payload() {
    let raw: serde_json::Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/live-session-info.json")).expect("fixture");
    let mut unknown = Vec::new();
    let info = map_session_info(&parse_session_info(&raw).expect("parses"), &mut |v| unknown.push(v));
    assert!(unknown.is_empty());
    assert_eq!(info.session_type, SessionType::Practice);
    assert_eq!(info.session_phase, SessionPhase::Green);
    assert_eq!(info.server_name, None, "'' is offline/solo, not a server name");
    assert!(close(info.remaining_seconds, 914.8));
}

#[test]
fn maps_the_game_phase_ordinals_a_steward_acts_on() {
    let phase = |p: f64| map_session_phase(p, "NONE", &mut |_| {});
    assert_eq!(phase(5.0), SessionPhase::Green);
    assert_eq!(phase(6.0), SessionPhase::Fcy);
    assert_eq!(phase(7.0), SessionPhase::Red);
    assert_eq!(phase(8.0), SessionPhase::Finished);
    for ordinal in [0.0, 1.0, 2.0, 3.0, 4.0, 9.0] {
        assert_eq!(phase(ordinal), SessionPhase::Unknown);
    }
}

#[test]
fn falls_back_to_yellow_flag_state_when_game_phase_carries_no_flag() {
    assert_eq!(map_session_phase(3.0, "PENDING", &mut |_| {}), SessionPhase::Yellow);
}

#[test]
fn ranks_position_in_class_by_overall_position() {
    let raw: serde_json::Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/live-standings.json")).expect("fixture");
    let entries = map_standings(&parse_standings(&raw).expect("parses").entries);
    let lmp2 = entries.iter().find(|e| e.car_class == "LMP2").expect("one LMP2");
    assert_eq!(lmp2.position_in_class, 1);
    let mut gt3: Vec<(i64, i64)> =
        entries.iter().filter(|e| e.car_class == "LMGT3").map(|e| (e.position, e.position_in_class)).collect();
    gt3.sort();
    assert_eq!(gt3.iter().map(|(_, c)| *c).collect::<Vec<_>>(), [1, 2, 3]);
}
