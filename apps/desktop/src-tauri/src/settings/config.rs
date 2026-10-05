//! The config as the UI sees it, and the operations that change it.

use serde::Serialize;

use super::{ConfigInput, DiscordSettings, DisplayPrefs};
use crate::core::Core;
use crate::domain::SessionInfo;
use crate::error::{AppError, AppResult};
use crate::lmu::AdapterName;
use crate::rulebook::Rulebook;

/// The config the UI sees (api.ts AppConfig): archiveDir always resolved to a real path.
#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub lookback_seconds: u32,
    pub steward_name: String,
    pub adapter: AdapterName,
    pub archive_dir: String,
    pub export_dir: String,
    pub rulebook: Option<Rulebook>,
    pub display: DisplayPrefs,
    pub discord: DiscordSettings,
    pub welcomed: bool,
}

impl Core {
    pub fn config(&self) -> AppConfig {
        let config = &self.store.config;
        AppConfig {
            lookback_seconds: config.lookback_seconds,
            steward_name: config.steward_name.clone(),
            adapter: config.adapter,
            archive_dir: self.archive_dir().display().to_string(),
            export_dir: self.export_dir().display().to_string(),
            rulebook: config.rulebook.clone(),
            display: config.display.clone(),
            discord: config.discord.clone(),
            welcomed: config.welcomed,
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
        if let Some(display) = input.display {
            config.display = display;
        }
        if let Some(discord) = input.discord {
            config.discord = discord;
        }
        if let Some(welcomed) = input.welcomed {
            config.welcomed = welcomed;
        }
        if let Some(dir) = input.archive_dir {
            config.archive_dir = (!dir.trim().is_empty()).then_some(dir);
        }
        if let Some(dir) = input.export_dir {
            config.export_dir = (!dir.trim().is_empty()).then_some(dir);
            self.create_export_dir()?;
        }
        self.changed();
        Ok(self.config())
    }

    /// Replace or remove (None) the league's rule book.
    pub fn set_rulebook(&mut self, rulebook: Option<Rulebook>) -> AppConfig {
        self.store.config.rulebook = rulebook;
        self.changed();
        self.config()
    }

    pub fn adapter(&self) -> AdapterName {
        self.store.config.adapter
    }

    /// The steward picked another data source (the caller restarts the adapter thread).
    /// The old source's live state goes; `last_session` goes too, so the new source's first
    /// update seeds it rather than reading as a "new session" — switching never archives.
    pub fn use_adapter(&mut self, adapter: AdapterName) {
        self.store.config.adapter = adapter;
        self.session = SessionInfo::disconnected();
        self.standings.clear();
        self.last_session = None;
        self.changed();
    }

    pub(crate) fn export_dir(&self) -> std::path::PathBuf {
        match &self.store.config.export_dir {
            Some(dir) => dir.into(),
            None => self.paths.default_export_dir.clone(),
        }
    }

    /// The Save dialogs open here, so it has to exist (a typed path may be new).
    pub(crate) fn create_export_dir(&self) -> AppResult<()> {
        let dir = self.export_dir();
        std::fs::create_dir_all(&dir).map_err(|e| AppError::io(&format!("Could not create {}", dir.display()), e))
    }

    pub(crate) fn archive_dir(&self) -> std::path::PathBuf {
        match &self.store.config.archive_dir {
            Some(dir) => dir.into(),
            None => self.paths.default_archive_dir.clone(),
        }
    }
}
