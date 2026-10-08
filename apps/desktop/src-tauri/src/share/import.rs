//! Export this session to a shared file; import other stewards' files into it.

use std::path::{Path, PathBuf};

use super::merge::{merge_into, MergeOutcome};
use super::{FileReport, ImportReport, Renumbered, SessionFile, FORMAT, VERSION};
use crate::core::Core;
use crate::domain::SessionType;
use crate::error::{AppError, AppResult};
use crate::text::UtcTime;

// A race's worth of incidents is a few hundred KB; anything this big isn't one of ours.
const MAX_FILE_BYTES: u64 = 50 * 1024 * 1024;

impl Core {
    pub fn session_file(&self) -> SessionFile {
        SessionFile {
            format: FORMAT.to_string(),
            version: VERSION,
            exported_at: UtcTime::now().iso(),
            exported_by: self.store.config.steward_name.clone(),
            track_name: self.session.track_name.clone(),
            session_type: self.session.session_type,
            incidents: self.store.all().to_vec(),
        }
    }

    /// Merges each file in turn; one bad file doesn't stop the others. The session is copied
    /// to the archive folder first, so an import is always one file away from undone.
    pub fn import_sessions(&mut self, paths: &[PathBuf]) -> AppResult<ImportReport> {
        let backup = self.backup_before_import()?;
        let files = paths.iter().map(|path| self.import_one(path)).collect();
        self.changed();
        Ok(ImportReport { files, backup })
    }

    fn import_one(&mut self, path: &Path) -> FileReport {
        let file = path.file_name().map_or_else(|| path.display().to_string(), |n| n.to_string_lossy().into_owned());
        let parsed = read_session_file(path).and_then(|shared| self.check_same_session(&shared).map(|()| shared));
        match parsed {
            Err(error) => FileReport { file, error: Some(error.message), ..FileReport::default() },
            Ok(shared) => {
                let outcome = merge_into(&mut self.store, shared.incidents);
                report(file, shared.exported_by, outcome)
            }
        }
    }

    /// Only checked while connected: offline, this PC doesn't know which session it's in.
    fn check_same_session(&self, shared: &SessionFile) -> AppResult<()> {
        let here = &self.session;
        let other_track =
            !here.track_name.is_empty() && !shared.track_name.is_empty() && here.track_name != shared.track_name;
        let known = |t: SessionType| t != SessionType::Unknown;
        let other_type =
            known(here.session_type) && known(shared.session_type) && here.session_type != shared.session_type;
        if other_track || other_type {
            return Err(AppError::invalid(format!(
                "From another session ({} {:?}), this one is {} {:?}",
                shared.track_name, shared.session_type, here.track_name, here.session_type
            )));
        }
        Ok(())
    }

    fn backup_before_import(&self) -> AppResult<Option<String>> {
        if self.store.all().is_empty() {
            return Ok(None);
        }
        self.flush()?;
        let target = self.archive_dir().join(format!("{}-before-import.json", UtcTime::now().archive_stamp()));
        self.write_archive(&target).map_err(|e| AppError::io("Backing up the session before the import failed", e))?;
        Ok(Some(target.display().to_string()))
    }
}

fn read_session_file(path: &Path) -> AppResult<SessionFile> {
    let size = std::fs::metadata(path).map_err(|e| AppError::io("Could not open the file", e))?.len();
    if size > MAX_FILE_BYTES {
        return Err(AppError::invalid("Too large to be a StewardPad session file"));
    }
    let text = std::fs::read_to_string(path).map_err(|e| AppError::io("Could not read the file", e))?;
    let shared: SessionFile =
        serde_json::from_str(&text).map_err(|e| AppError::invalid(format!("Not a StewardPad session file ({e})")))?;
    if shared.format != FORMAT {
        return Err(AppError::invalid("Not a StewardPad session file"));
    }
    if shared.version > VERSION {
        return Err(AppError::invalid("Made by a newer StewardPad. Update this copy first"));
    }
    Ok(shared)
}

fn report(file: String, exported_by: String, outcome: MergeOutcome) -> FileReport {
    FileReport {
        file,
        exported_by,
        added: outcome.added,
        updated: outcome.updated,
        unchanged: outcome.unchanged,
        conflicts: outcome.conflicts,
        renumbered: outcome.renumbered.into_iter().map(|(from, to)| Renumbered { from, to }).collect(),
        error: None,
    }
}

#[cfg(test)]
#[path = "import_tests.rs"]
mod tests;
