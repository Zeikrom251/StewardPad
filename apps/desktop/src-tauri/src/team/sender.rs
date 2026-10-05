//! The outbox sender: one thread while this PC is linked and signed in. It sends the queued
//! changes one at a time, in order, and keeps each until the league answers it.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{Receiver, RecvTimeoutError};
use std::sync::Arc;
use std::time::Duration;

use tauri::{AppHandle, Manager};

use super::outbox::Pending;
use super::settle::{request_of, Step};
use crate::api::wire::SyncedIncident;
use crate::api::{Api, ApiResult};
use crate::app::{emit_incidents, emit_team, AppState};

/// Nothing queued: wait for a change (a wake), or look again now and then.
const IDLE: Duration = Duration::from_secs(30);
const FIRST_RETRY: Duration = Duration::from_secs(1);
const LONGEST_RETRY: Duration = Duration::from_secs(30);
/// The owner's subscription ended: ask again every few minutes in case it came back.
const HOLD: Duration = Duration::from_secs(5 * 60);

pub(super) fn run(app: AppHandle, stop: Arc<AtomicBool>, wake: Receiver<()>) {
    let mut pause = Duration::ZERO;
    while !stop.load(Ordering::Relaxed) {
        if !pause.is_zero() && wait(&wake, pause) {
            return;
        }
        let state = app.state::<AppState>();
        let Some(item) = state.lock().next_outgoing() else {
            pause = IDLE;
            continue;
        };
        let answer = send(&state.api, &item);
        if stop.load(Ordering::Relaxed) {
            return;
        }
        let step = {
            let mut core = state.lock();
            let step = core.settle(&item, answer);
            emit_incidents(&app, &core);
            emit_team(&app, &core);
            step
        };
        pause = match step {
            Step::Next => Duration::ZERO,
            Step::Retry => (pause * 2).clamp(FIRST_RETRY, LONGEST_RETRY),
            Step::Hold => HOLD,
            Step::SignedOut => return crate::account::service::expire(&app),
        };
    }
}

/// Sleeps until `pause` ends or a change wakes it early. True when the engine stopped.
fn wait(wake: &Receiver<()>, pause: Duration) -> bool {
    match wake.recv_timeout(pause) {
        Ok(()) => {
            while wake.try_recv().is_ok() {}
            false
        }
        Err(RecvTimeoutError::Timeout) => false,
        Err(RecvTimeoutError::Disconnected) => true,
    }
}

pub(super) fn send(api: &Api, item: &Pending) -> ApiResult<SyncedIncident> {
    let (method, path, body) = request_of(item);
    match method {
        "POST" => api.post(&path, &body),
        "PATCH" => api.patch(&path, &body),
        _ => api.delete(&path),
    }
}
