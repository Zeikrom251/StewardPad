use serde_json::json;

use super::*;
use crate::domain::IncidentSource;

fn fields(pairs: &[(&str, serde_json::Value)]) -> Fields {
    pairs.iter().map(|(k, v)| (k.to_string(), v.clone())).collect()
}

fn create(outbox: &mut Outbox, id: &str) {
    outbox.push(Op::Create {
        session_id: "s".into(),
        incident_id: id.into(),
        source: IncidentSource::Steward,
        lmu_key: None,
        fields: fields(&[("summary", json!("")), ("status", json!("NOTED"))]),
    });
}

#[test]
fn an_edit_before_the_create_is_sent_rides_with_it() {
    let mut outbox = Outbox::default();
    create(&mut outbox, "a");
    outbox.edit("a", 0, fields(&[("summary", json!("Contact at T1"))]));
    assert_eq!(outbox.len(), 1);
    assert_eq!(outbox.pending_fields("a")["summary"], json!("Contact at T1"));
}

#[test]
fn once_sent_an_item_is_frozen_and_the_next_edit_queues() {
    let mut outbox = Outbox::default();
    outbox.edit("a", 3, fields(&[("summary", json!("one"))]));
    outbox.front_mut().expect("queued").sent = true;
    outbox.edit("a", 3, fields(&[("summary", json!("two"))]));
    outbox.edit("a", 3, fields(&[("decision", json!("No action"))]));
    assert_eq!(outbox.len(), 2, "the second and third edit fold together");
    let pending = outbox.pending_fields("a");
    assert_eq!((pending["summary"].clone(), pending["decision"].clone()), (json!("two"), json!("No action")));
}

#[test]
fn deleting_an_incident_the_league_never_saw_sends_nothing() {
    let mut outbox = Outbox::default();
    create(&mut outbox, "a");
    outbox.edit("a", 0, fields(&[("summary", json!("x"))]));
    outbox.delete("a");
    assert_eq!(outbox.len(), 0);
    create(&mut outbox, "b");
    outbox.front_mut().expect("queued").sent = true;
    outbox.edit("b", 0, fields(&[("summary", json!("y"))]));
    outbox.delete("b");
    let kinds: Vec<_> = (0..outbox.len()).map(|_| outbox.pop_front().expect("item").op).collect();
    assert!(matches!(kinds.as_slice(), [Op::Create { .. }, Op::Delete { .. }]), "{kinds:?}");
}

#[test]
fn this_pcs_own_write_moves_the_base_of_the_edits_behind_it() {
    let mut outbox = Outbox::default();
    outbox.edit("a", 4, fields(&[("summary", json!("one"))]));
    outbox.front_mut().expect("queued").sent = true;
    outbox.edit("a", 4, fields(&[("summary", json!("two"))]));
    outbox.pop_front();
    outbox.rebase("a", 4, 5);
    assert!(matches!(outbox.front().map(|p| &p.op), Some(Op::Edit { base_version: 5, .. })));
}

#[test]
fn a_renamed_incident_takes_its_queued_changes_along() {
    let mut outbox = Outbox::default();
    create(&mut outbox, "mine");
    outbox.front_mut().expect("queued").sent = true;
    outbox.edit("mine", 0, fields(&[("summary", json!("x"))]));
    outbox.pop_front();
    outbox.rename("mine", "league");
    assert!(outbox.has_pending("league") && !outbox.has_pending("mine"));
    outbox.forget("league");
    assert_eq!(outbox.len(), 0);
}

#[test]
fn the_queue_survives_the_session_file() {
    let mut outbox = Outbox::default();
    create(&mut outbox, "a");
    outbox.push(Op::Merge { incident_id: "a".into(), child_ids: vec!["b".into()] });
    let json = serde_json::to_string(&outbox).expect("saves");
    assert!(json.contains(r#""kind":"merge""#) && json.contains(r#""childIds":["b"]"#));
    assert_eq!(serde_json::from_str::<Outbox>(&json).expect("restores"), outbox);
}

#[test]
fn a_claim_and_an_unclaim_ask_the_league_with_their_op_id() {
    let mut outbox = Outbox::default();
    outbox.push(Op::Claim { incident_id: "a".into() });
    outbox.push(Op::Unclaim { incident_id: "a".into() });
    assert_eq!(outbox.pending_claim("a"), Some(false), "the latest one counts");
    let claim = outbox.pop_front().expect("queued");
    let (method, path, body) = crate::team::sender::request_of(&claim);
    assert_eq!((method, path.as_str(), body), ("POST", "/incidents/a/claim", json!({ "opId": claim.op_id })));
    let unclaim = outbox.pop_front().expect("queued");
    let (method, path, _) = crate::team::sender::request_of(&unclaim);
    assert_eq!((method, path), ("DELETE", format!("/incidents/a/claim?opId={}", unclaim.op_id)));
}

#[test]
fn a_child_the_league_deleted_leaves_the_unsent_merge_and_an_empty_merge_goes() {
    let mut outbox = Outbox::default();
    outbox.push(Op::Merge { incident_id: "p".into(), child_ids: vec!["a".into(), "b".into()] });
    outbox.forget("a");
    assert_eq!(
        outbox.front().map(|item| &item.op),
        Some(&Op::Merge { incident_id: "p".into(), child_ids: vec!["b".into()] })
    );
    outbox.forget("b");
    assert_eq!(outbox.len(), 0, "a merge of nothing would be refused");
}

#[test]
fn a_refused_change_stays_on_top_until_this_pc_changes_that_field_again() {
    let mut outbox = Outbox::default();
    outbox.keep("a", fields(&[("summary", json!("Refused")), ("decision", json!("Kept"))]));
    assert_eq!(outbox.len(), 0, "nothing left to send");
    assert!(outbox.has_pending("a"));
    outbox.edit("a", 2, fields(&[("summary", json!("Newer"))]));
    let pending = outbox.pending_fields("a");
    assert_eq!((pending["summary"].clone(), pending["decision"].clone()), (json!("Newer"), json!("Kept")));
    outbox.pop_front();
    assert_eq!(outbox.pending_fields("a").get("summary"), None, "the newer value is the league's now");
    outbox.forget("a");
    assert!(!outbox.has_pending("a"));
}
