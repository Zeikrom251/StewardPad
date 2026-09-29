//! Exports: the CSVs (prompt §7.7; drivers, full log, penalty sheet) and the results JSON.

mod csv;
mod incident_csv;
mod penalty_csv;
mod results_json;

use serde::{Deserialize, Serialize};

pub use incident_csv::{build_incident_csv, CsvVariant};
pub use results_json::build_results;

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
