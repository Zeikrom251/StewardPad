use serde_json::json;

use crate::api::wire::{SessionStatus, SessionView, SyncedIncident};
use crate::core::Core;
use crate::domain::{IncidentStatus, IncidentType, SessionType};
use crate::store::{Paths, Saver, Store};
use crate::team::TeamLink;

fn linked_core() -> Core {
    let (saver, _changes) = Saver::channel();
    let paths = Paths::in_dir(&std::env::temp_dir().join(format!("stewardpad-apply-{}", std::process::id())));
    let mut core = Core::new(Store::empty(), paths, saver);
    let session = SessionView {
        id: "s1".into(),
        title: "Round 4".into(),
        track_name: "Spa".into(),
        kind: SessionType::Race,
        status: SessionStatus::Open,
        closed_at: None,
        incidents: 0,
    };
    core.store.team = Some(TeamLink::new("l1".into(), "Apex".into(), "u1".into(), session));
    core
}

fn remote(id: &str, version: u32, summary: &str) -> SyncedIncident {
    serde_json::from_value(json!({
        "id": id, "sessionId": "s1", "sequenceNumber": 3, "source": "STEWARD",
        "mergedIntoId": null, "mergedFromIds": [], "lmuKey": null,
        "eventSeconds": 100.0, "loggedAtSeconds": 110.0, "lookbackApplied": 10.0,
        "wallClock": "2026-10-05T12:00:00.000Z", "replayReference": "RACE 00:01:40 · Lap 2",
        "cars": [], "type": "CONTACT", "status": "NOTED", "summary": summary,
        "stewardNotes": "", "decision": "", "penalty": null, "rules": [],
        "loggedBy": "Alex", "reviewers": ["Alex"], "version": version, "deletedAt": null,
        "createdAt": "2026-10-05T12:00:00.000Z", "updatedAt": "2026-10-05T12:00:00.000Z"
    }))
    .expect("a synced incident")
}

#[test]
fn a_teammates_newer_copy_lands_and_an_older_one_is_ignored() {
    let mut core = linked_core();
    assert!(core.apply_remote(remote("a", 2, "Turn 1")));
    assert!(!core.apply_remote(remote("a", 1, "stale")));
    let incident = core.get("a").expect("stored");
    assert_eq!((incident.summary.as_str(), incident.version, incident.logged_by.as_str()), ("Turn 1", 2, "Alex"));
    assert_eq!(incident.kind, IncidentType::Contact);
    // This PC's next number comes after the league's.
    assert_eq!(core.store.next_sequence(), 4);
}

#[test]
fn this_pcs_unsent_edit_stays_on_top_of_a_teammates_copy() {
    let mut core = linked_core();
    core.apply_remote(remote("a", 2, "Turn 1"));
    let before = core.get("a").expect("stored");
    let mut after = before.clone();
    after.status = IncidentStatus::UnderInvestigation;
    core.store.save(after.clone());
    core.record_edited(&before, &after);
    assert!(core.apply_remote(remote("a", 3, "Turn 1, both cars")));
    let merged = core.get("a").expect("stored");
    assert_eq!(merged.summary, "Turn 1, both cars", "their field");
    assert_eq!(merged.status, IncidentStatus::UnderInvestigation, "this PC's unsent field");
}

#[test]
fn another_sessions_incident_or_a_deletion_is_handled() {
    let mut core = linked_core();
    let mut elsewhere = remote("b", 1, "");
    elsewhere.session_id = "s2".into();
    assert!(!core.apply_remote(elsewhere));
    core.apply_remote(remote("a", 1, ""));
    let mut deleted = remote("a", 2, "");
    deleted.deleted_at = Some("2026-10-05T12:05:00.000Z".into());
    assert!(core.apply_remote(deleted));
    assert!(core.get("a").is_err());
    assert_eq!(core.list().len(), 0);
}

#[test]
fn this_pcs_unsent_claim_stays_on_a_teammates_copy_and_is_queued() {
    let mut core = linked_core();
    core.store.config.steward_name = "Zeikr".into();
    core.apply_remote(remote("a", 2, "Turn 1"));
    assert_eq!(core.claim("a").expect("claims").reviewers, ["Alex", "Zeikr"]);
    assert!(core.apply_remote(remote("a", 3, "Turn 1, both cars")));
    assert_eq!(core.get("a").expect("stored").reviewers, ["Alex", "Zeikr"], "this PC's unsent claim");
    core.unclaim("a").expect("unclaims");
    assert!(core.apply_remote(remote("a", 4, "")));
    assert_eq!(core.get("a").expect("stored").reviewers, ["Alex"]);
    let queued = core.link().expect("linked").outbox.len();
    assert_eq!(queued, 2, "the claim, then the unclaim");
}
