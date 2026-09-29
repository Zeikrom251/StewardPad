use super::*;
use crate::domain::{Penalty, PenaltyType, RuleRef};
use crate::test_support::{car, incident};

fn sample() -> Incident {
    let mut i = incident("a", 1);
    i.cars = vec![car("77", "LMGT3"), car("8", "HYPERCAR")];
    i.cars[0].role = crate::domain::InvolvedRole::Caused;
    i.steward_notes = "SECRET internal deliberation".into();
    i.summary = "#77 cut across at T1".into();
    i.decision = "5 second time penalty".into();
    i.rules = vec![RuleRef { code: "3.2".into(), title: "Causing a collision".into() }];
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
fn steward_notes_stay_out_of_the_full_file_too() {
    let csv = build_incident_csv(&[sample()], &[sample()], CsvVariant::Full, ';');
    assert!(!csv.contains("SECRET"));
}

#[test]
fn drivers_file_carries_the_investigation() {
    let csv = build_incident_csv(&[sample()], &[sample()], CsvVariant::Drivers, ';');
    assert!(csv.contains(";Investigation;") && csv.contains("#77 cut across at T1"));
}

#[test]
fn formats_a_drivers_row_like_the_nest_server() {
    let csv = build_incident_csv(&[sample()], &[sample()], CsvVariant::Drivers, ';');
    let row = csv.split("\r\n").nth(1).unwrap_or_default();
    assert_eq!(
        row,
        "1;00:01:50;;77, 8;LMGT3, HYPERCAR;Driver 77, Driver 8;#77 Driver 77;;CONTACT;3.2 Causing a collision;#77 cut across at T1;5 second time penalty;TIME_PENALTY 5s;NOTED"
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
