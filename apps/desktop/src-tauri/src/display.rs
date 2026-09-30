//! Per-steward display preferences (Settings → Display). Saved with the rest of the config;
//! the backend only stores and validates them, the UI applies them.

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "lowercase")]
pub enum Density {
    #[default]
    Compact,
    Comfortable,
}

/// Text size is a whole-window zoom, in percent.
const TEXT_SCALES: std::ops::RangeInclusive<u32> = 80..=150;
const MAX_IDS: usize = 40;
const MAX_ID_CHARS: usize = 40;

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase", default, deny_unknown_fields)]
pub struct DisplayPrefs {
    pub density: Density,
    pub text_scale: u32,
    /// Standings column ids the steward switched off.
    pub hidden_columns: Vec<String>,
    /// Inspector section ids kept folded.
    pub collapsed_sections: Vec<String>,
    /// Race page: the quick log + feed folded to a thin strip.
    pub race_panel_folded: bool,
}

impl Default for DisplayPrefs {
    fn default() -> Self {
        Self {
            density: Density::Compact,
            text_scale: 100,
            hidden_columns: Vec::new(),
            collapsed_sections: Vec::new(),
            race_panel_folded: false,
        }
    }
}

impl DisplayPrefs {
    pub fn validate(&self) -> AppResult<()> {
        if !TEXT_SCALES.contains(&self.text_scale) {
            return Err(AppError::invalid("display.textScale must be between 80 and 150"));
        }
        let ids = self.hidden_columns.iter().chain(&self.collapsed_sections);
        if self.hidden_columns.len() > MAX_IDS
            || self.collapsed_sections.len() > MAX_IDS
            || ids.clone().any(|id| id.is_empty() || id.chars().count() > MAX_ID_CHARS)
        {
            return Err(AppError::invalid("display ids must be short, non-empty names"));
        }
        Ok(())
    }
}
