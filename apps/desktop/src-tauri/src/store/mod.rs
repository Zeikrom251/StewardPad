//! Persistence is a JSON file, not a database (prompt §7.4).

pub mod disk;
mod state;

pub use disk::{Paths, Saver};
pub use state::{PersistedState, Store};
