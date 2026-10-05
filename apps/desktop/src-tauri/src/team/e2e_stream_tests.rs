//! Live timing between two PCs, against a running API (see e2e_tests.rs).

use serde_json::json;

use super::e2e_tests::{crew, delete_league, drain, events};
use super::Streaming;
use crate::api::wire::{LiveStream, TimingFrame};
use crate::domain::SessionType;
use crate::test_support::{session, standing};

fn frame(seq: u32, gap: &str) -> TimingFrame {
    let mut leader = standing(1, "7", "K. Brennan", "HYPERCAR");
    leader.position = 1;
    let mut second = standing(2, "51", "L. Moreau", "HYPERCAR");
    (second.position, second.gap_to_leader) = (2, gap.to_string());
    TimingFrame {
        seq,
        session: session("Spa", SessionType::Race, 3600.0 + f64::from(seq)),
        standings: vec![leader, second],
    }
}

#[test]
#[ignore = "needs a local API and two seeded accounts"]
fn a_streaming_pcs_timing_becomes_the_clock_on_the_others() {
    let Some((mut owner, steward, league, session_view)) = crew() else { return };
    let live = events(&owner, &league);
    let body = json!({ "sessionId": session_view.id });
    let stream: LiveStream = steward.api.post(&format!("/leagues/{}/streams", league.id), &body).expect("streams");
    let path = format!("/streams/{}/frame", stream.id);
    steward.api.put_gzipped(&path, &frame(1, "+4.812")).expect("first frame");
    drain(&mut owner, &live);
    assert!(owner.core.watching(), "the owner watches the steward's stream");
    steward.api.put_gzipped(&path, &frame(2, "+4.500")).expect("second frame");
    let names = drain(&mut owner, &live);
    assert!(names.iter().any(|n| n == "timing"), "{names:?}");
    assert_eq!(owner.core.session.elapsed_seconds, 3602.0, "the streamer's clock");
    assert_eq!(owner.core.standings[1].gap_to_leader, "+4.500");

    // This PC isn't the streamer: frames it offers go nowhere, and a stop ends the watching.
    owner.core.team.streaming = None::<Streaming>;
    steward.api.delete::<()>(&format!("/streams/{}", stream.id)).expect("stops");
    drain(&mut owner, &live);
    assert!(!owner.core.watching());
    delete_league(&owner, &league);
}
