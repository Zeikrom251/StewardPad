use serde_json::json;

use crate::api::events::SseEvent;
use crate::api::wire::{LiveStream, Person};
use crate::core::Core;
use crate::test_support::{linked_core, synced_json};

fn event(name: &str, data: serde_json::Value) -> SseEvent {
    SseEvent { name: name.into(), data: data.to_string(), id: None }
}

fn stream(id: &str) -> LiveStream {
    LiveStream {
        id: id.into(),
        session_id: "s1".into(),
        streamer: Person { id: "u2".into(), display_name: "Karim".into() },
        started_at: "2026-10-05T12:00:00.000Z".into(),
        last_frame_at: None,
    }
}

/// Watching Karim's stream "x1": his clock is this PC's.
fn watching() -> Core {
    let mut core = linked_core();
    core.team.stream = Some(stream("x1"));
    core.session.connected = true;
    core.session.track_name = "Spa".into();
    assert!(core.watching());
    core
}

fn ended(id: &str) -> SseEvent {
    event("stream", json!({ "change": "ended", "stream": stream(id), "reason": "stopped" }))
}

#[test]
fn when_the_watched_stream_ends_its_clock_leaves_this_pc() {
    let mut core = watching();
    let changed = core.on_live_event("l1", &ended("x1"));
    assert!(changed.live);
    assert!(!core.watching());
    assert!(!core.session.connected, "this PC can't stream a teammate's frozen clock");
    assert!(core.standings.is_empty());
}

#[test]
fn another_stream_ending_leaves_the_watched_one_alone() {
    let mut core = watching();
    core.on_live_event("l1", &ended("x0"));
    assert!(core.watching());
    assert!(core.session.connected);
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
