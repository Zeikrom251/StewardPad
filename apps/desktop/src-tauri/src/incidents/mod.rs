//! Incidents: inputs, pure rules, operations, and LMU ingestion.

mod ingest;
pub mod input;
pub mod rules;
mod service;

pub use ingest::LmuOutcome;
