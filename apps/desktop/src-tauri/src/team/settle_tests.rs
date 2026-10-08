use serde_json::json;

use super::Step;
use crate::api::ApiError;
use crate::core::Core;
use crate::incidents::input::IncidentFields;
use crate::test_support::{linked_core, synced};

/// A league incident "a" at version 1, then this PC's edit of its summary, sent.
fn edited() -> (Core, super::Pending) {
    let mut core = linked_core();
    core.apply_remote(synced("a", 1, "Turn 1"));
    let fields: IncidentFields = serde_json::from_value(json!({ "summary": "Mine" })).expect("fields");
    core.update("a", fields).expect("edits");
    let sent = core.next_outgoing().expect("queued");
    (core, sent)
}

fn queued(core: &Core) -> usize {
    core.link().expect("linked").outbox.len()
}

#[test]
fn a_refused_edit_stays_on_this_pc_even_under_a_teammates_newer_copy() {
    let (mut core, sent) = edited();
    let closed = ApiError::from_answer(409, r#"{"message":"Closed","errorCode":"SESSION_CLOSED"}"#);
    assert_eq!(core.settle(&sent, Err(closed)), Step::Next);
    assert_eq!(queued(&core), 0);
    core.apply_remote(synced("a", 2, "Theirs"));
    assert_eq!(core.get("a").expect("kept").summary, "Mine");
}

#[test]
fn an_answer_this_version_cannot_read_still_means_the_league_took_the_change() {
    let (mut core, sent) = edited();
    let odd = ApiError::Unreadable { status: 200, detail: "missing field `version`".into() };
    assert_eq!(core.settle(&sent, Err(odd)), Step::Next);
    assert_eq!(queued(&core), 0, "never sent again and again");
    assert!(core.team.notice.is_none());
}

#[test]
fn a_change_the_server_keeps_failing_on_is_given_up_but_a_server_down_never_is() {
    let (mut core, sent) = edited();
    for _ in 0..30 {
        assert_eq!(core.settle(&sent, Err(ApiError::from_answer(502, "Bad gateway"))), Step::Retry);
    }
    assert_eq!(queued(&core), 1);
    let failing = || Err(ApiError::from_answer(500, r#"{"message":"Internal server error"}"#));
    for _ in 1..super::GIVE_UP_AFTER {
        assert_eq!(core.settle(&sent, failing()), Step::Retry);
    }
    assert_eq!(core.settle(&sent, failing()), Step::Next);
    assert_eq!(queued(&core), 0);
    assert!(core.team.notice.is_some());
    assert_eq!(core.get("a").expect("kept").summary, "Mine");
}
