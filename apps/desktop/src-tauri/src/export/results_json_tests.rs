use super::build_results;
use crate::domain::{Penalty, PenaltyType, SessionInfo};
use crate::test_support::{car, incident};

#[test]
fn lists_every_decision_in_race_order_and_each_penalty_with_its_car() {
    let mut late = incident("late", 1);
    late.event_seconds = 900.0;
    let mut early = incident("early", 2);
    early.event_seconds = 100.0;
    early.cars = vec![car("38", "LMGT3")];
    early.steward_notes = "SECRET".into();
    early.penalty = Some(Penalty {
        kind: PenaltyType::DriveThrough,
        seconds: None,
        applied_to: "38".into(),
        served: true,
        notes: "INTERNAL".into(),
    });
    let file = build_results(&[late, early], &SessionInfo::disconnected(), "now".into());
    assert_eq!(file.decisions.iter().map(|d| d.number).collect::<Vec<_>>(), [2, 1]);
    assert_eq!(file.penalties.len(), 1);
    assert_eq!((file.penalties[0].car_class.as_str(), file.penalties[0].served), ("LMGT3", true));
    let json = serde_json::to_string(&file).expect("serialises");
    assert!(json.contains(r#""format":"stewardpad-results""#) && json.contains(r#""type":"DRIVE_THROUGH""#));
    assert!(!json.contains("SECRET") && !json.contains("INTERNAL"), "{json}");
}
