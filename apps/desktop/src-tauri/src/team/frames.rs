//! Streaming this PC's timing to the league (board 07: one stream per league). Each LMU tick
//! becomes a frame; a thread uploads it gzipped. A slow upload drops a frame rather than queue
//! them: the next one is the whole picture anyway.

use std::sync::mpsc::{sync_channel, Receiver};

use tauri::{AppHandle, Manager};

use super::Streaming;
use crate::api::wire::TimingFrame;
use crate::app::{emit_team, AppState};
use crate::core::Core;

/// The API takes 128 cars a frame; LMU grids are smaller.
const MAX_CARS: usize = 128;

pub(super) fn start(app: &AppHandle, stream_id: String) {
    let (frames, incoming) = sync_channel::<TimingFrame>(1);
    {
        let state = app.state::<AppState>();
        let mut core = state.lock();
        core.team.streaming = Some(Streaming { stream_id: stream_id.clone(), seq: 0 });
        core.team.frames = Some(frames);
    }
    let app = app.clone();
    let spawned = std::thread::Builder::new().name("frames".into()).spawn(move || upload(&app, &stream_id, incoming));
    if let Err(error) = spawned {
        eprintln!("[stream] Could not start the uploader: {error}");
    }
}

fn upload(app: &AppHandle, stream_id: &str, incoming: Receiver<TimingFrame>) {
    let path = format!("/streams/{stream_id}/frame");
    let mut offline = false;
    for frame in incoming {
        let state = app.state::<AppState>();
        let Err(error) = state.api.put_gzipped(&path, &frame) else {
            offline = false;
            continue;
        };
        if error.is_transient() {
            if !offline {
                eprintln!("[stream] Frames aren't getting through; still trying");
            }
            offline = true;
            continue;
        }
        // STREAM_ENDED, NOT_STREAMER, a removed member: this stream is over.
        let mut core = state.lock();
        if core.team.streaming.as_ref().is_some_and(|s| s.stream_id == stream_id) {
            core.stop_streaming_here();
            core.team.notice = Some("Your stream ended: start it again from the Team page".into());
            emit_team(app, &core);
        }
        return;
    }
}

impl Core {
    /// After each LMU tick, while this PC streams: the frame for the uploader.
    pub(crate) fn offer_frame(&mut self) {
        let (Some(streaming), Some(frames)) = (self.team.streaming.as_mut(), self.team.frames.as_ref()) else {
            return;
        };
        streaming.seq += 1;
        let frame = TimingFrame {
            seq: streaming.seq,
            session: self.session.clone(),
            standings: self.standings.iter().take(MAX_CARS).cloned().collect(),
        };
        // Full: the uploader is still on the last one; this frame is skipped, the next isn't.
        let _ = frames.try_send(frame);
    }

    /// Dropping the frames' sender ends the uploader.
    pub(super) fn stop_streaming_here(&mut self) {
        self.team.streaming = None;
        self.team.frames = None;
    }
}
