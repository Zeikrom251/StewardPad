//! The state Tauri manages: the core behind its lock, and the running LMU adapter.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

use tauri::AppHandle;

use super::events::{emit, emit_live, emit_lmu_outcome};
use crate::core::Core;
use crate::lmu::{self, AdapterName};
use crate::settings::AppConfig;

pub type SharedCore = Arc<Mutex<Core>>;

pub struct AppState {
    pub(super) core: SharedCore,
    /// The stop flag of the adapter thread currently feeding the core.
    pub(super) lmu: Mutex<Arc<AtomicBool>>,
}

impl AppState {
    pub fn lock(&self) -> MutexGuard<'_, Core> {
        lock(&self.core)
    }

    /// Settings → Data source: stops the running adapter and starts the other one. The core
    /// lock is held throughout, and each adapter's sink checks its own stop flag under that
    /// lock — so a poll that finishes after the switch can never land.
    pub fn switch_adapter(&self, app: &AppHandle, adapter: AdapterName) -> AppConfig {
        let mut core = self.lock();
        if core.adapter() != adapter {
            let mut running = self.lmu.lock().unwrap_or_else(PoisonError::into_inner);
            running.store(true, Ordering::Relaxed);
            core.use_adapter(adapter);
            *running = start_adapter(app, &self.core, adapter);
            eprintln!("[lmu] Data source switched to {adapter:?}");
            emit_live(app, &core);
        }
        let config = core.config();
        emit(app, "config:update", &config);
        config
    }
}

// A panic on another thread poisons the mutex; the data is still consistent (every
// mutation completes under the lock), so keep going rather than lose the session.
pub fn lock(core: &SharedCore) -> MutexGuard<'_, Core> {
    core.lock().unwrap_or_else(PoisonError::into_inner)
}

/// Starts `adapter` feeding the core; returns the flag that stops it.
pub(super) fn start_adapter(app: &AppHandle, core: &SharedCore, adapter: AdapterName) -> Arc<AtomicBool> {
    let stop = Arc::new(AtomicBool::new(false));
    let (handle, core, stopped) = (app.clone(), core.clone(), stop.clone());
    lmu::start(adapter, stop.clone(), move |event| {
        let mut core = lock(&core);
        if stopped.load(Ordering::Relaxed) {
            return; // this source was switched off while the update was in flight
        }
        let outcome = core.apply_lmu(event);
        emit_lmu_outcome(&handle, &core, &outcome);
    });
    stop
}
