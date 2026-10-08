use serde_json::json;

use crate::api::events::SseEvent;
use crate::test_support::{linked_core, synced_json};

fn event(name: &str, data: serde_json::Value) -> SseEvent {
    SseEvent { name: name.into(), data: data.to_string(), id: None }
}

#[test]
fn an_event_from_a_league_this_pc_left_is_ignored() {
    let mut core = linked_core();
    let incident = json!({ "revision": "90", "incident": synced_json("a", 1, "") });
    core.on_live_event("l0", &event("incident", incident));
    assert!(core.get("a").is_err());
    assert_eq!(core.link().expect("linked").revision, "0", "the next Last-Event-ID stays right");
}

#[test]
fn a_session_deleted_while_offline_unlinks_the_session_not_the_league() {
    let mut core = linked_core();
    core.link_mut().expect("linked").outbox.delete("x");
    core.lose_session();
    let link = core.link().expect("still in the league");
    assert!(link.session.is_none());
    assert_eq!(link.outbox.len(), 1, "nothing queued is lost");
    assert!(core.team.notice.is_some());
}
