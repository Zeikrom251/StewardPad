//! Everything LMU-related sits behind this module (prompt §7.1 — the adapter boundary).
//! Adapters run on their own thread and hand mapped updates to a sink; nothing outside
//! `rest/` ever sees a raw LMU field name.

mod mock;
pub mod resolver;
mod rest;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use serde::{Deserialize, Serialize};

use crate::domain::{SessionInfo, StandingEntry};
use resolver::LmuCollision;

pub struct LmuUpdate {
    pub session: SessionInfo,
    pub standings: Vec<StandingEntry>,
    /// Every collision in LMU's cumulative feed, already resolved — callers dedupe by key.
    pub collisions: Vec<LmuCollision>,
}

pub enum LmuEvent {
    Update(LmuUpdate),
    /// Sent once per connected → disconnected transition, never once per failed poll.
    Disconnected,
}

/// The data source, chosen in Settings and saved with the session. The simulator is the
/// default: a fresh install has something to train on before the game is running.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "lowercase")]
pub enum AdapterName {
    #[default]
    Mock,
    Rest,
}

/// Starts the adapter on a background thread, running until `stop` is set (the steward
/// switched source). It never blocks startup: LMU being unreachable must not stop
/// incident management.
pub fn start(adapter: AdapterName, stop: Arc<AtomicBool>, sink: impl FnMut(LmuEvent) + Send + 'static) {
    std::thread::Builder::new()
        .name(format!("lmu-{adapter:?}").to_lowercase())
        .spawn(move || match adapter {
            AdapterName::Mock => mock::run(&stop, sink),
            AdapterName::Rest => rest::run(&stop, sink),
        })
        .expect("failed to spawn the LMU adapter thread");
}
