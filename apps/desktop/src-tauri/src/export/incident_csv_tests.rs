use super::*;
use crate::domain::{Penalty, PenaltyType};
use crate::test_support::{car, incident};

fn sample() -> Incident {
    let mut i = incident("a", 1);
    i.cars = vec![car("77", "LMGT3"), car("8", "HYPERCAR")];
    i.steward_notes = "SECRET internal deliberation".into();
    i.decision = "5 second time penalty".into();
    i.penalty = Some(Penalty {
        kind: PenaltyType::TimePenalty,
        seconds: Some(5),
        applied_to: "77".into(),
        served: false,
        notes: String::new(),
    });
    i
}

#[test]
fn drivers_file_never_contains_steward_notes() {
    let csv = build_incident_csv(&[sample()], &[sample()], CsvVariant::Drivers, ';');
    assert!(!csv.contains("SECRET"));
    assert!(!csv.contains("Steward Notes"));
}

#[test]
fn full_file_keeps_steward_notes() {
    let csv = build_incident_csv(&[sample()], &[sample()], CsvVariant::Full, ';');
    assert!(csv.contains("SECRET internal deliberation"));
}

#[test]
fn formats_a_drivers_row_like_the_nest_server() {
    let csv = build_incident_csv(&[sample()], &[sample()], CsvVariant::Drivers, ';');
    let row = csv.split("\r\n").nth(1).unwrap_or_default();
    assert_eq!(
        row,
        "1;00:01:50;;77, 8;LMGT3, HYPERCAR;Driver 77, Driver 8;CONTACT;5 second time penalty;TIME_PENALTY 5s;NOTED"
    );
}

#[test]
fn resolves_merged_from_ids_to_sequence_numbers() {
    let mut primary = sample();
    primary.merged_from_ids = vec!["child".into(), "gone".into()];
    let child = incident("child", 4);
    let csv = build_incident_csv(&[primary.clone()], &[primary, child], CsvVariant::Full, ';');
    assert!(csv.contains("#4, #?"));
}

#[test]
fn writes_seconds_as_javascript_would() {
    let csv = build_incident_csv(&[sample()], &[sample()], CsvVariant::Full, ';');
    assert!(csv.contains(";110;120;10;"));
}
