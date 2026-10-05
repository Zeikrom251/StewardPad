use serde_json::json;

use super::*;

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
