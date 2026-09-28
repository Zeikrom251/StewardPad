//! CSV export (prompt §7.7) — replaces GET /api/export/csv.

mod csv;
mod incident_csv;

use serde::{Deserialize, Serialize};

pub use incident_csv::{build_incident_csv, CsvVariant};

#[derive(Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum CsvDelimiter {
    Semicolon,
    Comma,
}

impl CsvDelimiter {
    pub fn as_char(self) -> char {
        match self {
            CsvDelimiter::Semicolon => ';',
            CsvDelimiter::Comma => ',',
        }
    }
}

#[derive(Serialize, Debug)]
pub struct CsvExport {
    pub csv: String,
    pub filename: String,
}
