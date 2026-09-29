//! Discord live announcements (the Announce page): where to post and how each embed looks.
//! The UI sends the messages (Discord's webhook API is open to browsers, and the backend's
//! HTTP client has no TLS); the backend keeps these settings and says when a status moved.

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

const WEBHOOK_HOSTS: [&str; 4] = [
    "https://discord.com/api/webhooks/",
    "https://discordapp.com/api/webhooks/",
    "https://ptb.discord.com/api/webhooks/",
    "https://canary.discord.com/api/webhooks/",
];

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiscordSettings {
    /// Off: nothing is posted, whatever else is set.
    pub enabled: bool,
    /// A channel webhook (Channel settings → Integrations). Stays on this PC.
    pub webhook_url: String,
    /// Shown as the sender; empty = the webhook's own name.
    pub username: String,
    pub avatar_url: String,
    /// Posted above the embed: "@here", a role "<@&123…>", or nothing.
    pub mention: String,
    pub footer: String,
    pub fields: EmbedFields,
    pub events: Events,
}

/// Which parts of an incident the embed shows.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EmbedFields {
    pub cars: bool,
    pub rules: bool,
    pub investigation: bool,
    pub decision: bool,
    pub penalty: bool,
    pub session_time: bool,
    /// The steward's name: off by default, stewards often stay anonymous.
    pub reviewed_by: bool,
}

/// One per announced status, keyed like the wire enum so the UI reads them by status.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub struct Events {
    #[serde(rename = "UNDER_INVESTIGATION")]
    pub under_investigation: Announcement,
    #[serde(rename = "NO_FURTHER_ACTION")]
    pub no_further_action: Announcement,
    #[serde(rename = "PENALTY_APPLIED")]
    pub penalty_applied: Announcement,
    #[serde(rename = "DISMISSED")]
    pub dismissed: Announcement,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Announcement {
    pub enabled: bool,
    /// "{number}", "{type}", "{cars}" and "{time}" are filled in.
    pub title: String,
    /// "#e0598a": the embed's side stripe.
    pub color: String,
}

fn announcement(title: &str, color: &str) -> Announcement {
    Announcement { enabled: true, title: title.into(), color: color.into() }
}

impl Default for DiscordSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            webhook_url: String::new(),
            username: "Race Control".into(),
            avatar_url: String::new(),
            mention: String::new(),
            footer: String::new(),
            fields: EmbedFields {
                cars: true,
                rules: true,
                investigation: true,
                decision: true,
                penalty: true,
                session_time: true,
                reviewed_by: false,
            },
            events: Events {
                under_investigation: announcement("Under investigation · Incident {number}", "#e2a03f"),
                no_further_action: announcement("No further action · Incident {number}", "#4ea86f"),
                penalty_applied: announcement("Penalty · Incident {number}", "#e0598a"),
                dismissed: announcement("Dismissed · Incident {number}", "#8a909c"),
            },
        }
    }
}

impl DiscordSettings {
    /// Discord's own limits, checked here so a bad value fails in Settings, not mid-race.
    pub fn validate(&self) -> AppResult<()> {
        let url = self.webhook_url.trim();
        if !url.is_empty() && (!WEBHOOK_HOSTS.iter().any(|host| url.starts_with(host)) || url.len() > 300) {
            return Err(AppError::invalid("Paste a Discord webhook link (https://discord.com/api/webhooks/…)"));
        }
        let name = self.username.to_lowercase();
        if self.username.chars().count() > 80 || name.contains("discord") || name.contains("clyde") {
            return Err(AppError::invalid("The sender name is up to 80 characters, without \"Discord\" or \"Clyde\""));
        }
        if !self.avatar_url.is_empty() && (!self.avatar_url.starts_with("https://") || self.avatar_url.len() > 500) {
            return Err(AppError::invalid("The avatar must be an https:// image link"));
        }
        if self.mention.chars().count() > 200 || self.footer.chars().count() > 2048 {
            return Err(AppError::invalid("The mention is up to 200 characters and the footer up to 2048"));
        }
        let events = &self.events;
        [&events.under_investigation, &events.no_further_action, &events.penalty_applied, &events.dismissed]
            .into_iter()
            .try_for_each(Announcement::validate)
    }
}

impl Announcement {
    fn validate(&self) -> AppResult<()> {
        if self.title.trim().is_empty() || self.title.chars().count() > 200 {
            return Err(AppError::invalid("Each embed title is 1 to 200 characters"));
        }
        let hex = self.color.strip_prefix('#').unwrap_or_default();
        if hex.len() != 6 || !hex.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(AppError::invalid("Colours are written #rrggbb"));
        }
        Ok(())
    }
}

#[cfg(test)]
#[path = "discord_tests.rs"]
mod tests;
