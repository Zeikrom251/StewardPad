//! Sharing one session between stewards. There is no multi-user server (no network, no
//! accounts — prompt §3), so stewards split the incidents between them, each exports a
//! session file, and one imports the others' files: the treated incidents merge into one
//! complete session, ready for the usual CSV exports.

mod import;
mod merge;

use serde::{Deserialize, Serialize};

use crate::domain::{Incident, SessionType};

pub const FORMAT: &str = "stewardpad-session";
pub const VERSION: u32 = 1;

/// The shared file. Incidents keep every field — unlike the CSV — so nothing is lost.
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SessionFile {
    pub format: String,
    pub version: u32,
    pub exported_at: String,
    pub exported_by: String,
    pub track_name: String,
    pub session_type: SessionType,
    /// Every incident, merged children included (they carry the audit trail).
    pub incidents: Vec<Incident>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Renumbered {
    pub from: u32,
    pub to: u32,
}

/// What one imported file did — or why it was skipped (`error`).
#[derive(Serialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileReport {
    pub file: String,
    pub exported_by: String,
    pub added: usize,
    pub updated: usize,
    pub unchanged: usize,
    pub conflicts: Vec<u32>,
    pub renumbered: Vec<Renumbered>,
    pub error: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport {
    pub files: Vec<FileReport>,
    /// Copy of the session as it was before the import (None if it was empty).
    pub backup: Option<String>,
}
