//! Tauri commands — the old REST endpoints, by area. Each one parses its typed input, calls
//! one core operation and pushes the resulting change to the UI. No domain logic here.

pub mod exports;
pub mod incidents;
pub mod rulebook;
pub mod settings;
