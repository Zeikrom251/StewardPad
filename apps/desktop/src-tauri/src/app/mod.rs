//! Startup wiring: restore the session file, start the saver and the LMU adapter, and hand
//! the shared core to Tauri.

mod events;
mod state;

use std::sync::{Arc, Mutex};

use tauri::Manager;

use crate::core::Core;
use crate::store::{disk, Paths, Saver, Store};

pub use events::{emit, emit_incidents};
pub use state::AppState;
use state::{lock, start_adapter, SharedCore};

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
