//! The outbox sender: one thread while this PC is linked and signed in. It sends the queued
//! changes one at a time, in order, and keeps each until the league answers it.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{Receiver, RecvTimeoutError};
use std::sync::Arc;
use std::time::Duration;

use serde_json::Value;
use tauri::{AppHandle, Manager};

use super::outbox::{Op, Pending};
use super::settle::Step;
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

/// The request a queued change makes: method, path and body.
pub(super) fn request_of(item: &Pending) -> (&'static str, String, Value) {
    let op_id = &item.op_id;
    match &item.op {
        Op::Create { session_id, incident_id, source, lmu_key, fields } => {
            let mut body = serde_json::json!({ "opId": op_id, "id": incident_id, "source": source, "fields": fields });
            if let Some(key) = lmu_key {
                body["lmuKey"] = Value::String(key.clone());
            }
            ("POST", format!("/sessions/{session_id}/incidents"), body)
        }
        Op::Edit { incident_id, base_version, fields } => (
            "PATCH",
            format!("/incidents/{incident_id}"),
            serde_json::json!({ "opId": op_id, "baseVersion": base_version, "fields": fields }),
        ),
        Op::Delete { incident_id } => ("DELETE", format!("/incidents/{incident_id}?opId={op_id}"), Value::Null),
        Op::Merge { incident_id, child_ids } => (
            "POST",
            format!("/incidents/{incident_id}/merge"),
            serde_json::json!({ "opId": op_id, "childIds": child_ids }),
        ),
        Op::Claim { incident_id } => {
            ("POST", format!("/incidents/{incident_id}/claim"), serde_json::json!({ "opId": op_id }))
        }
        Op::Unclaim { incident_id } => ("DELETE", format!("/incidents/{incident_id}/claim?opId={op_id}"), Value::Null),
    }
}
