use super::merge_into;
use crate::domain::{Incident, IncidentSource, IncidentStatus};
use crate::store::Store;
use crate::test_support::incident;

const LATER: &str = "2026-09-28T10:00:00.000Z";
const LATEST: &str = "2026-09-28T11:00:00.000Z";

/// The same LMU contact as seen on one steward's PC: own id, same key.
fn lmu(id: &str, number: u32, key: &str) -> Incident {
    Incident { source: IncidentSource::Lmu, lmu_key: Some(key.into()), ..incident(id, number) }
}

fn treated(mut i: Incident, decision: &str, at: &str) -> Incident {
    i.status = IncidentStatus::PenaltyApplied;
    i.decision = decision.into();
    i.updated_at = at.into();
    i
}

fn store_with(incidents: Vec<Incident>) -> Store {
    let mut store = Store::empty();
    for i in incidents {
        store.next_sequence();
        store.save(i);
    }
    store
}

#[test]
fn takes_what_each_steward_treated_and_keeps_the_local_numbers() {
    // Steward 1 treated #1; steward 2 treated #2. Same contacts, different ids per PC.
    let mut mine = store_with(vec![treated(lmu("a1", 1, "k1"), "mine", LATER), lmu("a2", 2, "k2")]);
    let theirs = vec![lmu("b1", 1, "k1"), treated(lmu("b2", 2, "k2"), "theirs", LATER)];
    let outcome = merge_into(&mut mine, theirs);
    assert_eq!((outcome.added, outcome.updated, outcome.unchanged), (0, 1, 1));
    let second = mine.get("a2").expect("kept our id");
    assert_eq!((second.sequence_number, second.decision.as_str()), (2, "theirs"));
    assert_eq!(mine.get("a1").expect("ours").decision, "mine");
    assert!(outcome.conflicts.is_empty());
}

#[test]
fn both_edited_keeps_the_newer_edit_and_reports_a_conflict() {
    let mut mine = store_with(vec![treated(lmu("a1", 1, "k1"), "mine", LATEST)]);
    let outcome = merge_into(&mut mine, vec![treated(lmu("b1", 1, "k1"), "theirs", LATER)]);
    assert_eq!(outcome.conflicts, vec![1]);
    assert_eq!(mine.get("a1").expect("ours").decision, "mine");
}

#[test]
fn an_incident_only_they_logged_is_added_under_the_next_free_number() {
    let mut mine = store_with(vec![lmu("a1", 1, "k1"), lmu("a2", 2, "k2")]);
    let outcome = merge_into(&mut mine, vec![incident("theirs-manual", 2)]);
    assert_eq!(outcome.renumbered, vec![(2, 3)]);
    assert_eq!(mine.get("theirs-manual").expect("added").sequence_number, 3);
}

#[test]
fn importing_the_same_file_twice_changes_nothing() {
    let mut mine = store_with(vec![lmu("a1", 1, "k1")]);
    let file = vec![treated(lmu("b1", 1, "k1"), "theirs", LATER), incident("m", 2)];
    merge_into(&mut mine, file.clone());
    let again = merge_into(&mut mine, file);
    assert_eq!((again.added, again.updated), (0, 0));
    assert_eq!(mine.all().len(), 2);
}

#[test]
fn their_merge_links_point_at_our_ids_and_their_keys_are_marked_seen() {
    let mut mine = store_with(vec![lmu("a1", 1, "k1"), lmu("a2", 2, "k2")]);
    let mut primary = treated(lmu("b1", 1, "k1"), "merged", LATER);
    primary.merged_from_ids = vec!["b2".into()];
    let child = Incident { merged_into_id: Some("b1".into()), ..treated(lmu("b2", 2, "k2"), "", LATER) };
    merge_into(&mut mine, vec![primary, child]);
    assert_eq!(mine.get("a1").expect("primary").merged_from_ids, vec!["a2".to_string()]);
    assert_eq!(mine.get("a2").expect("child").merged_into_id.as_deref(), Some("a1"));
    assert!(mine.has_seen_lmu_key("k2"));
}
