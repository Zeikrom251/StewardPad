use serde_json::json;

use super::Incident;

fn read(reviewers: Option<(&str, serde_json::Value)>) -> Incident {
    let mut value = json!({
        "id": "x", "sequenceNumber": 1, "eventSeconds": 1.0, "loggedAtSeconds": 1.0,
        "lookbackApplied": 0.0, "wallClock": "", "replayReference": "", "cars": [],
        "type": "OTHER", "status": "NOTED", "summary": "", "stewardNotes": "", "decision": "",
        "penalty": null, "loggedBy": "", "createdAt": "", "updatedAt": ""
    });
    if let Some((key, names)) = reviewers {
        value[key] = names;
    }
    serde_json::from_value(value).expect("an incident")
}

#[test]
fn reads_an_older_files_single_reviewer_as_the_first_claim() {
    assert_eq!(read(Some(("reviewedBy", json!("J")))).reviewers, ["J"]);
    assert!(read(Some(("reviewedBy", json!(null)))).reviewers.is_empty());
    assert!(read(None).reviewers.is_empty());
    assert_eq!(read(Some(("reviewers", json!(["A", "B"])))).reviewers, ["A", "B"]);
}
