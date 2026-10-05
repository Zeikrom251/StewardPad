//! What Settings sends: every field optional, absent = unchanged. serde rejects unknown
//! fields; `validate` covers what types can't (lengths, absolute folders).

use serde::Deserialize;

use super::{DiscordSettings, DisplayPrefs};
use crate::error::{AppError, AppResult};

#[derive(Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConfigInput {
    pub lookback_seconds: Option<u32>,
    pub steward_name: Option<String>,
    /// Absolute folder for archive files. '' resets to the default.
    pub archive_dir: Option<String>,
    /// Absolute folder the Save dialogs open in. '' resets to the default.
    pub export_dir: Option<String>,
    /// Replaces all display preferences at once.
    pub display: Option<DisplayPrefs>,
    /// Replaces the Discord announcement settings at once.
    pub discord: Option<DiscordSettings>,
}

impl ConfigInput {
    pub fn validate(&self) -> AppResult<()> {
        if self.steward_name.as_ref().is_some_and(|n| n.chars().count() > 80) {
            return Err(AppError::invalid("stewardName is limited to 80 characters"));
        }
        validate_folder("archiveDir", self.archive_dir.as_deref())?;
        validate_folder("exportDir", self.export_dir.as_deref())?;
        if let Some(display) = &self.display {
            display.validate()?;
        }
        if let Some(discord) = &self.discord {
            discord.validate()?;
        }
        Ok(())
    }
}

/// A settings folder: '' (the default) or an absolute path. A relative one would land
/// wherever the app happened to start from.
fn validate_folder(field: &str, dir: Option<&str>) -> AppResult<()> {
    let Some(dir) = dir else { return Ok(()) };
    if dir.chars().count() > 500 {
        return Err(AppError::invalid(format!("{field} is limited to 500 characters")));
    }
    if !dir.trim().is_empty() && !std::path::Path::new(dir).is_absolute() {
        return Err(AppError::invalid(format!("{field} must be an absolute folder path")));
    }
    Ok(())
}

#[cfg(test)]
#[path = "input_tests.rs"]
mod tests;
