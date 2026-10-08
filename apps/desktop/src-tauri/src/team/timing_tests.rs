use serde_json::json;

use super::*;
use crate::domain::SessionType;
use crate::test_support::{session, standing};

fn key(seq: u32) -> Value {
    let frame = TimingFrame {
        seq,
        session: session("Spa", SessionType::Race, 3600.0),
        standings: vec![standing(1, "7", "A", "HYPERCAR"), standing(2, "8", "B", "HYPERCAR")],
    };
    let mut value = serde_json::to_value(frame).expect("frame");
    value["type"] = json!("key");
    value["streamId"] = json!("s1");
    value
}

#[test]
fn a_delta_moves_cars_adds_and_removes_on_top_of_its_base() {
    let held = apply_timing(None, &key(10)).expect("a keyframe always applies");
    let delta = json!({
        "type": "delta", "streamId": "s1", "seq": 11, "baseSeq": 10,
        "session": { "elapsedSeconds": 3601.0 },
        "changed": [
            { "slotId": 1, "gapToLeader": "+0.400", "lastLapSeconds": null },
            serde_json::to_value(standing(3, "51", "C", "LMGT3")).expect("car"),
        ],
        "removed": [2]
    });
    let (stream, frame) = apply_timing(Some(&held), &delta).expect("applies on frame 10");
    assert_eq!((stream.as_str(), frame.seq, frame.session.elapsed_seconds), ("s1", 11, 3601.0));
    assert_eq!(frame.session.track_name, "Spa");
    let slots: Vec<i64> = frame.standings.iter().map(|c| c.slot_id).collect();
    assert_eq!(slots, vec![1, 3]);
    assert_eq!(frame.standings[0].gap_to_leader, "+0.400");
    assert_eq!(frame.standings[0].driver_name, "A");
}

#[test]
fn a_delta_without_its_base_waits_for_the_next_keyframe() {
    let held = apply_timing(None, &key(10)).expect("keyframe");
    let skipped = json!({ "type": "delta", "streamId": "s1", "seq": 13, "baseSeq": 12 });
    assert!(apply_timing(Some(&held), &skipped).is_none());
    let other_stream = json!({ "type": "delta", "streamId": "s2", "seq": 11, "baseSeq": 10 });
    assert!(apply_timing(Some(&held), &other_stream).is_none());
    assert!(apply_timing(None, &json!({ "type": "delta", "streamId": "s1", "seq": 1, "baseSeq": 0 })).is_none());
}
