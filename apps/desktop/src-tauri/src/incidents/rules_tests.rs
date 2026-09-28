use super::*;
use crate::test_support::{car, incident, session, standing};

#[test]
fn subtracts_lookback_from_elapsed_time() {
    assert_eq!(compute_event_seconds(120.0, 10.0), 110.0);
    assert_eq!(compute_event_seconds(42.0, 0.0), 42.0);
}

#[test]
fn clamps_event_seconds_to_zero_when_lookback_exceeds_elapsed() {
    assert_eq!(compute_event_seconds(5.0, 10.0), 0.0);
}

#[test]
fn formats_the_replay_reference_and_reads_its_lap_back() {
    let reference = build_replay_reference(SessionType::Race, 3725.0, 42);
    assert_eq!(reference, "RACE 01:02:05 — Lap 42");
    assert_eq!(lap_from_replay_reference(&reference), 42);
    assert_eq!(lap_from_replay_reference("unparseable"), 0);
}

#[test]
fn detects_a_new_session_by_track_type_or_clock_reset() {
    let base = session("Monza", SessionType::Race, 600.0);
    assert!(!is_new_session(&base, &session("Monza", SessionType::Race, 601.0)));
    assert!(!is_new_session(&base, &session("Monza", SessionType::Race, 599.0)), "jitter is not a restart");
    assert!(is_new_session(&base, &session("Monza", SessionType::Qualifying, 600.0)));
    assert!(is_new_session(&base, &session("Sebring", SessionType::Race, 600.0)));
    assert!(is_new_session(&base, &session("Monza", SessionType::Race, 3.0)));
}

#[test]
fn selects_the_lowest_sequence_number_unless_told_otherwise() {
    let candidates = [incident("a", 5), incident("b", 2)];
    assert_eq!(select_primary(&candidates, None).map(|i| i.id.as_str()), Some("b"));
    assert_eq!(select_primary(&candidates, Some("a")).map(|i| i.id.as_str()), Some("a"));
}

#[test]
fn merges_cars_by_number_and_class() {
    let mut first = incident("a", 1);
    first.cars = vec![car("77", "GT3"), car("88", "GT3")];
    let mut second = incident("b", 2);
    second.cars = vec![car("77", "GT3"), car("77", "HYPER"), car("99", "HYPER")];
    let merged = merge_cars(&[&first, &second]);
    let keys: Vec<(&str, &str)> = merged.iter().map(|c| (c.car_number.as_str(), c.car_class.as_str())).collect();
    assert_eq!(keys, [("77", "GT3"), ("88", "GT3"), ("77", "HYPER"), ("99", "HYPER")]);
}

#[test]
fn merged_children_are_inactive() {
    let mut child = incident("a", 1);
    assert!(is_active(&child));
    child.merged_into_id = Some("b".into());
    assert!(!is_active(&child));
}

fn grid() -> Vec<crate::domain::StandingEntry> {
    let mut vignal = standing(2, "77", "Tristan Vignal", "HYPERCAR");
    vignal.laps_completed = 12;
    vec![standing(1, "77", "Ryan Chikhi", "LMGT3"), vignal]
}

// Regression: two cars sharing #77. Selecting the second must not resolve to the first.
#[test]
fn quick_log_cars_resolve_by_slot_id_not_car_number() {
    let cars = resolve_manual_cars(&["2".into()], &grid());
    assert_eq!(cars[0].driver_name, "Tristan Vignal");
    assert_eq!(cars[0].car_class, "HYPERCAR");
    assert_eq!(cars[0].lap_at_incident, Some(12));
    assert_eq!(resolve_manual_cars(&["1".into()], &grid())[0].driver_name, "Ryan Chikhi");
}

#[test]
fn a_departed_slot_degrades_to_its_slot_id_never_a_guess() {
    let cars = resolve_manual_cars(&["99".into()], &grid());
    assert_eq!((cars[0].driver_name.as_str(), cars[0].car_class.as_str(), cars[0].lap_at_incident), ("99", "", None));
}

#[test]
fn lmu_cars_resolve_by_slot_id_and_fall_back_to_the_resolver_snapshot() {
    let collision_car = |slot_id, name: &str| CollisionCar {
        slot_id,
        car_number: "77".into(),
        driver_name: name.into(),
        car_class: "HYPERCAR".into(),
    };
    let cars = resolve_lmu_cars(&[collision_car(2, "Tristan Vignal")], &grid());
    assert_eq!(cars[0].driver_name, "Tristan Vignal");
    assert_eq!(cars[0].lap_at_incident, Some(12));
    let departed = resolve_lmu_cars(&[collision_car(99, "Departed Driver")], &[]);
    assert_eq!((departed[0].driver_name.as_str(), departed[0].lap_at_incident), ("Departed Driver", None));
}
