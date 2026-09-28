//! The app's one piece of shared state: the store plus the live session and standings.
//! Lives behind a Mutex (see app.rs); every mutation schedules a debounced save.

use serde::Serialize;

use crate::domain::{SessionInfo, StandingEntry};
use crate::error::{AppError, AppResult};
use crate::incidents::input::ConfigInput;
use crate::lmu::AdapterName;
use crate::store::{disk, Paths, PersistedState, Saver, Store};
use crate::text::{slugify, UtcTime};

pub struct Core {
    pub(crate) store: Store,
    pub(crate) session: SessionInfo,
    pub(crate) standings: Vec<StandingEntry>,
    /// Seeded by the first LMU update after start: a restart mid-session must keep the
    /// incidents it just restored, not archive them as a "new session".
    pub(crate) last_session: Option<SessionInfo>,
    paths: Paths,
    adapter: AdapterName,
    saver: Saver,
}

/// The config the UI sees (api.ts AppConfig): archiveDir always resolved to a real path.
#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub lookback_seconds: u32,
    pub steward_name: String,
    pub adapter: AdapterName,
    pub archive_dir: String,
}

impl Core {
    pub fn new(store: Store, paths: Paths, adapter: AdapterName, saver: Saver) -> Self {
        Self {
            store,
            session: SessionInfo::disconnected(),
            standings: Vec::new(),
            last_session: None,
            paths,
            adapter,
            saver,
        }
    }

    /// Call after every store mutation: the saver writes the full state 500 ms later.
    pub(crate) fn changed(&self) {
        self.saver.schedule();
    }

    pub fn config(&self) -> AppConfig {
        let config = &self.store.config;
        AppConfig {
            lookback_seconds: config.lookback_seconds,
            steward_name: config.steward_name.clone(),
            adapter: self.adapter,
            archive_dir: self.archive_dir().display().to_string(),
        }
    }

    pub fn update_config(&mut self, input: ConfigInput) -> AppResult<AppConfig> {
        input.validate()?;
        let config = &mut self.store.config;
        if let Some(seconds) = input.lookback_seconds {
            config.lookback_seconds = seconds;
        }
        if let Some(name) = input.steward_name {
            config.steward_name = name;
        }
        if let Some(dir) = input.archive_dir {
            config.archive_dir = (!dir.trim().is_empty()).then_some(dir);
        }
        self.changed();
        Ok(self.config())
    }

    pub fn snapshot(&self) -> PersistedState {
        self.store.snapshot()
    }

    /// Writes the current state now, bypassing the debounce (archive needs it on disk first).
    pub fn flush(&self) -> AppResult<()> {
        disk::write_state(&self.paths.current_session, &self.snapshot())
            .map_err(|e| AppError::io("Saving the session failed", e))
    }

    /// Copies the session file to the archive folder, then clears the store. A session with
    /// no incidents leaves no archive file — nothing worth keeping, just reset.
    pub fn archive(&mut self, track_name: &str) -> AppResult<()> {
        self.flush()?;
        if !self.store.all().is_empty() {
            let file = format!("{}-{}.json", UtcTime::now().archive_stamp(), slugify(track_name));
            let target = self.archive_dir().join(file);
            disk::copy_ensuring_dir(&self.paths.current_session, &target)
                .map_err(|e| AppError::io("Archiving the session failed", e))?;
            eprintln!("[store] Archived {} incidents to {}", self.store.all().len(), target.display());
        }
        self.store.clear_incidents();
        self.flush()
    }

    fn archive_dir(&self) -> std::path::PathBuf {
        match &self.store.config.archive_dir {
            Some(dir) => dir.into(),
            None => self.paths.default_archive_dir.clone(),
        }
    }
}
