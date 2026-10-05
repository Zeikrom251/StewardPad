//! Domain types — the Rust mirror of `packages/shared` (incident.ts, lmu.ts, api.ts).
//! Field names and enum spellings are the wire contract with the React app:
//! camelCase fields, SCREAMING_SNAKE enum values. Change both sides together.

mod incident;
mod live;

use serde::Serialize;

pub use incident::*;
pub use live::*;

/// The wire enum's name (e.g. "RACE", "UNDER_INVESTIGATION") — used in CSV cells and replay references.
pub fn wire_name<T: Serialize>(value: &T) -> String {
    match serde_json::to_value(value) {
        Ok(serde_json::Value::String(name)) => name,
        _ => String::new(),
    }
}
