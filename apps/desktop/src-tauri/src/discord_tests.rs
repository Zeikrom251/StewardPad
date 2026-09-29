use super::DiscordSettings;

fn with(change: impl FnOnce(&mut DiscordSettings)) -> DiscordSettings {
    let mut settings = DiscordSettings::default();
    change(&mut settings);
    settings
}

#[test]
fn the_defaults_are_valid_and_off() {
    let settings = DiscordSettings::default();
    assert!(settings.validate().is_ok());
    assert!(!settings.enabled);
}

#[test]
fn only_a_discord_webhook_link_is_accepted() {
    let ok = with(|s| s.webhook_url = "https://discord.com/api/webhooks/123/abc-DEF_4".into());
    assert!(ok.validate().is_ok());
    for bad in ["https://example.com/api/webhooks/1/x", "http://discord.com/api/webhooks/1/x", "discord.com"] {
        assert!(with(|s| s.webhook_url = bad.into()).validate().is_err(), "{bad}");
    }
}

#[test]
fn discord_refuses_a_sender_named_discord_so_do_we() {
    assert!(with(|s| s.username = "Discord Stewards".into()).validate().is_err());
}

#[test]
fn titles_and_colours_follow_discord_limits() {
    assert!(with(|s| s.events.dismissed.color = "red".into()).validate().is_err());
    assert!(with(|s| s.events.penalty_applied.title = "  ".into()).validate().is_err());
}
