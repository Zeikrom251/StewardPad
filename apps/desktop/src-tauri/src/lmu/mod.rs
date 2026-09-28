//! Everything LMU-related sits behind this module (prompt §7.1 — the adapter boundary).
//! Adapters run on their own thread and hand mapped updates to a sink; nothing outside
//! `rest/` ever sees a raw LMU field name.

mod mock;
pub mod resolver;
mod rest;

use serde::Serialize;

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

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum AdapterName {
    Mock,
    Rest,
}

impl AdapterName {
    /// LMU_ADAPTER=rest reads the game; anything else runs the simulator (the default).
    pub fn from_env() -> Self {
        match std::env::var("LMU_ADAPTER").as_deref() {
            Ok("rest") => AdapterName::Rest,
            _ => AdapterName::Mock,
        }
    }
}

/// Starts the adapter on a background thread. It never returns and never blocks startup:
/// LMU being unreachable must not stop incident management.
pub fn start(adapter: AdapterName, sink: impl FnMut(LmuEvent) + Send + 'static) {
    std::thread::Builder::new()
        .name(format!("lmu-{adapter:?}").to_lowercase())
        .spawn(move || match adapter {
            AdapterName::Mock => mock::run(sink),
            AdapterName::Rest => rest::run(sink),
        })
        .expect("failed to spawn the LMU adapter thread");
}
