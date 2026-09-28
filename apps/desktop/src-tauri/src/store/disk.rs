//! Disk side of persistence: atomic writes, restore on start, and the debounced saver
//! thread (prompt §7.4 — after every mutation, 500 ms later, full state, never partial).

use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::time::Duration;

use super::state::PersistedState;
use crate::text::UtcTime;

pub const DEBOUNCE: Duration = Duration::from_millis(500);

pub struct Paths {
    pub current_session: PathBuf,
    pub default_archive_dir: PathBuf,
}

impl Paths {
    pub fn in_dir(data_dir: &Path) -> Self {
        Self { current_session: data_dir.join("current-session.json"), default_archive_dir: data_dir.join("archive") }
    }
}

/// Write `.tmp`, then rename over the real file: a crash mid-write never leaves a torn file.
pub fn write_atomic(path: &Path, content: &str) -> io::Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, content)?;
    fs::rename(&tmp, path)
}

pub fn write_state(path: &Path, state: &PersistedState) -> io::Result<()> {
    let json = serde_json::to_string_pretty(state).map_err(io::Error::other)?;
    write_atomic(path, &json)
}

/// Restores the previous run. An unreadable file is moved aside (never deleted, never
/// overwritten) so the steward starts working and the data can still be recovered by hand.
pub fn restore(path: &Path) -> Option<PersistedState> {
    let raw = match fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return None,
        Err(e) => {
            eprintln!("[store] Cannot read {}: {e} — starting empty", path.display());
            return None;
        }
    };
    match serde_json::from_str::<PersistedState>(&raw) {
        Ok(state) => {
            eprintln!("[store] Restored {} incidents from previous run", state.incidents.len());
            Some(state)
        }
        Err(e) => {
            set_aside_corrupt(path, &e.to_string());
            None
        }
    }
}

fn set_aside_corrupt(path: &Path, reason: &str) {
    let aside = path.with_file_name(format!("current-session.corrupt-{}.json", UtcTime::now().archive_stamp()));
    match fs::rename(path, &aside) {
        Ok(()) => eprintln!(
            "[store] {} is unreadable ({reason}) — moved to {} and starting empty",
            path.display(),
            aside.display()
        ),
        Err(e) => eprintln!("[store] {} is unreadable ({reason}) and could not be moved aside: {e}", path.display()),
    }
}

pub fn copy_ensuring_dir(from: &Path, to: &Path) -> io::Result<()> {
    if let Some(dir) = to.parent() {
        fs::create_dir_all(dir)?;
    }
    fs::copy(from, to).map(|_| ())
}

/// Coalesces bursts of mutations into one write, 500 ms after the first. Never writes
/// on an idle timer — the thread sleeps on the channel until something changes.
#[derive(Clone)]
pub struct Saver(Sender<()>);

impl Saver {
    pub fn channel() -> (Saver, Receiver<()>) {
        let (tx, rx) = channel();
        (Saver(tx), rx)
    }

    pub fn schedule(&self) {
        // Err only means the saver thread is gone (app shutting down); nothing to do then.
        let _ = self.0.send(());
    }
}

/// Runs the saver loop: wait for a change, let the burst settle, write one snapshot.
pub fn run_saver(changes: Receiver<()>, mut write_snapshot: impl FnMut()) {
    while changes.recv().is_ok() {
        std::thread::sleep(DEBOUNCE);
        while changes.try_recv().is_ok() {}
        write_snapshot();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("stewardpad-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn writes_atomically_and_leaves_no_tmp_file() {
        let paths = Paths::in_dir(&temp_dir("atomic"));
        write_atomic(&paths.current_session, "{}").expect("writes");
        assert_eq!(fs::read_to_string(&paths.current_session).expect("reads"), "{}");
        assert!(!paths.current_session.with_extension("json.tmp").exists());
    }

    #[test]
    fn restores_an_older_server_file_missing_the_newer_fields() {
        let paths = Paths::in_dir(&temp_dir("legacy"));
        let legacy = r#"{"incidents":[{"id":"x","sequenceNumber":1,"eventSeconds":1,"loggedAtSeconds":1,"lookbackApplied":0,
            "wallClock":"","replayReference":"RACE 00:00:01 — Lap 0","cars":[{"carNumber":"7","driverName":"A","lapAtIncident":null,"role":"INVOLVED"}],
            "type":"OTHER","status":"NOTED","summary":"","stewardNotes":"","decision":"","penalty":null,"loggedBy":"","reviewedBy":null,
            "createdAt":"","updatedAt":""}],"nextSequenceNumber":2,"config":{"lookbackSeconds":8,"stewardName":"J","archiveDir":null}}"#;
        write_atomic(&paths.current_session, legacy).expect("writes");
        let state = restore(&paths.current_session).expect("restores");
        assert_eq!(state.incidents[0].cars[0].car_class, "");
        assert_eq!(state.config.lookback_seconds, 8);
    }

    #[test]
    fn moves_a_corrupt_file_aside_instead_of_losing_it() {
        let dir = temp_dir("corrupt");
        let paths = Paths::in_dir(&dir);
        write_atomic(&paths.current_session, "{ not json").expect("writes");
        assert!(restore(&paths.current_session).is_none());
        assert!(!paths.current_session.exists());
        let kept = fs::read_dir(&dir)
            .expect("dir")
            .filter_map(Result::ok)
            .any(|e| e.file_name().to_string_lossy().starts_with("current-session.corrupt-"));
        assert!(kept, "the unreadable file must still be on disk");
    }
}
