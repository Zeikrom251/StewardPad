//! What the steward sets in Settings: the config, display preferences and Discord
//! announcements. Saved with the session file (store/).

mod config;
mod discord;
mod display;
mod input;

pub use config::AppConfig;
pub use discord::DiscordSettings;
pub use display::DisplayPrefs;
pub use input::ConfigInput;
