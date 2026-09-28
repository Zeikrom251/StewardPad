//! Startup wiring: restore the session file, start the saver and the LMU adapter,
//! and hand the shared core to Tauri. Also the events pushed to the UI.

use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::core::Core;
use crate::incidents::LmuOutcome;
use crate::lmu::{self, AdapterName};
use crate::store::{disk, Paths, Saver, Store};

type SharedCore = Arc<Mutex<Core>>;

pub struct AppState {
    core: SharedCore,
}

impl AppState {
    pub fn lock(&self) -> MutexGuard<'_, Core> {
        lock(&self.core)
    }
}

// A panic on another thread poisons the mutex; the data is still consistent (every
// mutation completes under the lock), so keep going rather than lose the session.
fn lock(core: &SharedCore) -> MutexGuard<'_, Core> {
    core.lock().unwrap_or_else(PoisonError::into_inner)
}

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let paths = Paths::in_dir(&app.path().app_data_dir()?);
    eprintln!("[store] Session file: {}", paths.current_session.display());
    let store = disk::restore(&paths.current_session).map_or_else(Store::empty, Store::from_state);
    let (saver, changes) = Saver::channel();
    let adapter = AdapterName::from_env();
    let core: SharedCore = Arc::new(Mutex::new(Core::new(store, paths, adapter, saver)));

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

    let handle = app.handle().clone();
    let for_lmu = core.clone();
    lmu::start(adapter, move |event| {
        let mut core = lock(&for_lmu);
        let outcome = core.apply_lmu(event);
        emit_lmu_outcome(&handle, &core, &outcome);
    });

    app.manage(AppState { core });
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
