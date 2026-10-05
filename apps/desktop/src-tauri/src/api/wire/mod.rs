//! The API's shapes, field for field: the Rust copy of `packages/types` in the website repo
//! (sync.ts, live.ts, incidents.ts, users.ts). Change both together. Most also go to the UI as
//! they are, so they serialize back in the same camelCase.

mod account;
mod incident;
mod league;
mod live;

pub use account::*;
pub use incident::*;
pub use league::*;
pub use live::*;
