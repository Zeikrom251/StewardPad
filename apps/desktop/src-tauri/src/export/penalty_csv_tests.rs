use crate::domain::{Incident, IncidentStatus, Penalty, PenaltyType, RuleRef};
use crate::export::{build_incident_csv, CsvVariant};
use crate::test_support::{car, incident};

fn penalised(id: &str, seq: u32, applied_to: &str) -> Incident {
    let mut i = incident(id, seq);
    i.cars = vec![car("77", "LMGT3"), car("8", "HYPERCAR")];
    i.status = IncidentStatus::PenaltyApplied;
    i.rules = vec![RuleRef { code: "3.3.c".into(), title: "Causing a collision".into() }];
    i.decision = "Contact &amp; spin".into();
    i.penalty = Some(Penalty {
        kind: PenaltyType::TimePenalty,
        seconds: Some(5),
        applied_to: applied_to.into(),
        served: false,
        notes: "INTERNAL penalty note".into(),
    });
    i
}

#[test]
fn one_row_per_penalised_car_in_incident_order_with_its_class_and_driver() {
    let unpenalised = incident("x", 1);
    let csv = build_incident_csv(
        &[penalised("b", 7, "8"), unpenalised, penalised("a", 3, "77")],
        &[],
        CsvVariant::Penalties,
        ';',
    );
    let rows: Vec<&str> = csv.trim_end().split("\r\n").skip(1).collect();
    assert_eq!(rows.len(), 2, "{csv}");
    assert!(
        rows[0].starts_with("3;")
            && rows[0].contains(";77;LMGT3;Driver 77;TIME_PENALTY;5;No;3.3.c Causing a collision;Contact & spin;")
    );
    assert!(rows[1].starts_with("7;") && rows[1].contains(";8;HYPERCAR;Driver 8;"));
}

#[test]
fn the_penalty_sheet_keeps_penalty_notes_private() {
    let csv = build_incident_csv(&[penalised("a", 3, "77")], &[], CsvVariant::Penalties, ';');
    assert!(!csv.contains("INTERNAL"));
}
