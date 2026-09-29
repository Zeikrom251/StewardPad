//! Startup wiring: restore the session file, start the saver and the LMU adapter,
//! and hand the shared core to Tauri. Also the events pushed to the UI.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::core::{AppConfig, Core};
use crate::incidents::LmuOutcome;
use crate::lmu::{self, AdapterName};
use crate::store::{disk, Paths, Saver, Store};

type SharedCore = Arc<Mutex<Core>>;

pub struct AppState {
    core: SharedCore,
    /// The stop flag of the adapter thread currently feeding the core.
    lmu: Mutex<Arc<AtomicBool>>,
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
            emit(app, "session:update", &core.session);
            emit(app, "standings:update", &core.standings);
        }
        let config = core.config();
        emit(app, "config:update", &config);
        config
    }
}

// A panic on another thread poisons the mutex; the data is still consistent (every
// mutation completes under the lock), so keep going rather than lose the session.
fn lock(core: &SharedCore) -> MutexGuard<'_, Core> {
    core.lock().unwrap_or_else(PoisonError::into_inner)
}

/// Starts `adapter` feeding the core; returns the flag that stops it.
fn start_adapter(app: &AppHandle, core: &SharedCore, adapter: AdapterName) -> Arc<AtomicBool> {
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

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let paths = Paths::in_dir(&app.path().app_data_dir()?);
    eprintln!("[store] Session file: {}", paths.current_session.display());
    let store = disk::restore(&paths.current_session).map_or_else(Store::empty, Store::from_state);
    let (saver, changes) = Saver::channel();
    let adapter = store.config.adapter;
    let core = Core::new(store, paths, saver);
    if let Err(error) = core.create_export_dir() {
        eprintln!("[export] {}", error.message);
    }
    let core: SharedCore = Arc::new(Mutex::new(core));

    let for_saver = core.clone();
    std::thread::Builder::new().name("saver".into()).spawn(move || {
        // Written while holding the lock: a snapshot taken before a clear must never land
        // on disk after it and resurrect the cleared incidents.
        disk::run_saver(changes, || {
            if let Err(error) = lock(&for_saver).flush() {
                eprintln!("[store] {}", error.message);
            }
        });
    })?;

    let lmu = Mutex::new(start_adapter(app.handle(), &core, adapter));
    app.manage(AppState { core, lmu });
    Ok(())
}

fn emit_lmu_outcome(app: &AppHandle, core: &Core, outcome: &LmuOutcome) {
    if outcome.live_changed {
        emit(app, "session:update", &core.session);
        emit(app, "standings:update", &core.standings);
    }
    if outcome.incidents_changed {
        emit_incidents(app, core);
    }
}

/// Same event names as the old Socket.IO gateway (api.ts ServerEvents).
pub fn emit_incidents(app: &AppHandle, core: &Core) {
    emit(app, "incidents:update", &core.list());
}

pub fn emit<T: Serialize + Clone>(app: &AppHandle, event: &str, payload: &T) {
    if let Err(error) = app.emit(event, payload.clone()) {
        eprintln!("[events] Failed to emit {event}: {error}");
    }
}
