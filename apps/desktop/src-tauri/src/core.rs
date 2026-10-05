//! The app's one piece of shared state: the store plus the live session and standings.
//! Lives behind a Mutex (see app/); every mutation schedules a debounced save.

use crate::account::AccountState;
use crate::domain::{SessionInfo, StandingEntry};
use crate::error::{AppError, AppResult};
use crate::store::{disk, Paths, PersistedState, Saver, Store};
use crate::team::TeamLive;
use crate::text::{slugify, UtcTime};

pub struct Core {
    pub(crate) store: Store,
    pub(crate) session: SessionInfo,
    pub(crate) standings: Vec<StandingEntry>,
    /// Seeded by the first LMU update after start: a restart mid-session must keep the
    /// incidents it just restored, not archive them as a "new session".
    pub(crate) last_session: Option<SessionInfo>,
    pub(crate) paths: Paths,
    saver: Saver,
    /// The signed-in account (Team), in memory only.
    pub(crate) account: AccountState,
    pub(crate) team: TeamLive,
}

impl Core {
    pub fn new(store: Store, paths: Paths, saver: Saver) -> Self {
        Self {
            store,
            session: SessionInfo::disconnected(),
            standings: Vec::new(),
            last_session: None,
            paths,
            saver,
            account: AccountState::default(),
            team: TeamLive::default(),
        }
    }

    /// Call after every store mutation: the saver writes the full state 500 ms later.
    pub(crate) fn changed(&self) {
        self.saver.schedule();
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
}
