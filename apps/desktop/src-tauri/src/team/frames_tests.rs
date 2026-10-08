use std::sync::mpsc::sync_channel;

use crate::lmu::AdapterName;
use crate::team::Streaming;
use crate::test_support::linked_core;

#[test]
fn a_release_build_streams_the_game_never_the_simulator() {
    let mut core = linked_core();
    let (frames, sent) = sync_channel(1);
    core.team.streaming = Some(Streaming { stream_id: "st1".into(), seq: 0 });
    core.team.frames = Some(frames);
    core.use_adapter(AdapterName::Mock);
    core.offer_frame();
    // Dev builds stream the simulator, so a league can be tried without the game.
    assert_eq!(sent.try_recv().is_ok(), cfg!(debug_assertions));
    core.use_adapter(AdapterName::Rest);
    core.offer_frame();
    assert!(sent.try_recv().is_ok());
}
