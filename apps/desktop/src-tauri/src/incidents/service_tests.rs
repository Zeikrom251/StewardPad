use serde_json::json;

use crate::core::Core;
use crate::domain::{IncidentSource, IncidentType, SessionType};
use crate::incidents::input::{IncidentFields, MergeInput, QuickLogInput};
use crate::lmu::resolver::{CollisionCar, LmuCollision};
use crate::lmu::{AdapterName, LmuEvent, LmuUpdate};
use crate::store::{Paths, Saver, Store};
use crate::test_support::{session, standing};

fn core(name: &str) -> (Core, std::path::PathBuf) {
    let dir = std::env::temp_dir().join(format!("stewardpad-core-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let (saver, _) = Saver::channel();
    let mut core = Core::new(Store::empty(), Paths::in_dir(&dir), AdapterName::Mock, saver);
    core.apply_lmu(update("Monza", 120.0, vec![]));
    (core, dir)
}

fn update(track: &str, elapsed: f64, collisions: Vec<LmuCollision>) -> LmuEvent {
    let mut car = standing(4, "7", "Anton Saxe", "HYPERCAR");
    car.laps_completed = 9;
    LmuEvent::Update(LmuUpdate {
        session: session(track, SessionType::Race, elapsed),
        standings: vec![car],
        collisions,
    })
}

fn off_track(et: f64) -> LmuCollision {
    let car = CollisionCar {
        slot_id: 4,
        car_number: "7".into(),
        driver_name: "Anton Saxe".into(),
        car_class: "HYPERCAR".into(),
    };
    LmuCollision {
        key: format!("4|Immovable@{}", (et * 100.0) as i64),
        et,
        kind: IncidentType::OffTrack,
        cars: vec![car],
        unresolved_other: None,
    }
}

fn fields(value: serde_json::Value) -> IncidentFields {
    serde_json::from_value(value).expect("valid fields")
}

#[test]
fn quick_log_stamps_the_look_back_and_keeps_both_timestamps() {
    let (mut core, _) = core("quick");
    let incident = core.quick_log(QuickLogInput { slot_ids: vec!["4".into()], logged_by: None }).expect("logs");
    assert_eq!((incident.event_seconds, incident.logged_at_seconds, incident.lookback_applied), (110.0, 120.0, 10.0));
    assert_eq!(incident.replay_reference, "RACE 00:01:50 — Lap 9");
    assert_eq!(incident.sequence_number, 1);
}

#[test]
fn a_time_nudge_moves_event_seconds_but_never_the_recorded_look_back() {
    let (mut core, _) = core("nudge");
    let logged = core.quick_log(QuickLogInput::default()).expect("logs");
    let nudged = core.update(&logged.id, fields(json!({ "eventSeconds": 105.0 }))).expect("updates");
    assert_eq!(nudged.event_seconds, 105.0);
    assert_eq!(nudged.lookback_applied, 10.0);
    assert_eq!(nudged.replay_reference, "RACE 00:01:45 — Lap 9");
}

#[test]
fn an_update_leaves_absent_fields_alone_and_clears_explicit_nulls() {
    let (mut core, _) = core("partial");
    let penalty = json!({ "type": "WARNING", "seconds": null, "appliedTo": "7", "served": false, "notes": "" });
    let created =
        core.create(fields(json!({ "summary": "kept", "penalty": penalty, "reviewedBy": "J" }))).expect("creates");
    let edited = core.update(&created.id, fields(json!({ "decision": "Warning" }))).expect("updates");
    assert_eq!((edited.summary.as_str(), edited.penalty.is_some()), ("kept", true));
    let cleared = core.update(&created.id, fields(json!({ "penalty": null, "reviewedBy": null }))).expect("updates");
    assert_eq!((cleared.penalty, cleared.reviewed_by), (None, None));
}

#[test]
fn rejects_invalid_input_instead_of_half_applying_it() {
    let (mut core, _) = core("invalid");
    assert!(core.create(fields(json!({ "eventSeconds": -1.0 }))).is_err());
    assert!(serde_json::from_value::<IncidentFields>(json!({ "status": "MADE_UP" })).is_err());
    assert!(serde_json::from_value::<IncidentFields>(json!({ "unknownField": 1 })).is_err());
    assert!(core.list().is_empty());
}

#[test]
fn merge_folds_children_into_the_lowest_numbered_primary() {
    let (mut core, _) = core("merge");
    let first = core.create(fields(json!({ "cars": [{ "carNumber": "7", "driverName": "A", "carClass": "HYPERCAR", "lapAtIncident": 9, "role": "INVOLVED" }] }))).expect("creates");
    let second = core.create(fields(json!({ "cars": [{ "carNumber": "8", "driverName": "B", "carClass": "HYPERCAR", "lapAtIncident": 9, "role": "INVOLVED" }] }))).expect("creates");
    let merged = core
        .merge(MergeInput { incident_ids: vec![second.id.clone(), first.id.clone()], primary_id: None })
        .expect("merges");
    assert_eq!(merged.id, first.id);
    assert_eq!(merged.cars.len(), 2);
    assert_eq!(core.list().len(), 1, "the child is hidden from the list");
    let again = core.merge(MergeInput { incident_ids: vec![second.id.clone(), first.id], primary_id: None });
    assert!(again.is_err(), "a merged child can't be merged again");
}

#[test]
fn lmu_collisions_become_incidents_once_with_no_look_back() {
    let (mut core, _) = core("ingest");
    let outcome = core.apply_lmu(update("Monza", 125.0, vec![off_track(121.5)]));
    assert!(outcome.incidents_changed);
    core.apply_lmu(update("Monza", 126.0, vec![off_track(121.5)])); // cumulative feed repeats it
    let list = core.list();
    assert_eq!(list.len(), 1);
    assert_eq!((list[0].event_seconds, list[0].lookback_applied, list[0].source), (121.5, 0.0, IncidentSource::Lmu));
}

#[test]
fn a_new_session_archives_the_old_one_and_restarts_numbering() {
    let (mut core, dir) = core("archive");
    core.quick_log(QuickLogInput::default()).expect("logs");
    core.apply_lmu(update("Sebring", 5.0, vec![]));
    assert!(core.list().is_empty());
    assert_eq!(core.quick_log(QuickLogInput::default()).expect("logs").sequence_number, 1);
    let archived = std::fs::read_dir(dir.join("archive")).expect("archive dir").count();
    assert_eq!(archived, 1);
}

#[test]
fn clearing_keeps_lmu_keys_so_the_cumulative_feed_does_not_resurrect_incidents() {
    let (mut core, _) = core("keys");
    core.apply_lmu(update("Monza", 125.0, vec![off_track(121.5)]));
    core.archive("Monza").expect("archives");
    core.apply_lmu(update("Monza", 126.0, vec![off_track(121.5)]));
    assert!(core.list().is_empty());
}
