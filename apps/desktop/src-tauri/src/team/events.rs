//! The league's live events, applied to the core (docs/sync-api.md → Live events).

use serde::de::DeserializeOwned;

use super::timing::apply_timing;
use super::Connection;
use crate::api::events::SseEvent;
use crate::api::wire::{Hello, IncidentEvent, MemberEvent, Presence, SessionEvent, StreamEvent};
use crate::core::Core;

/// What an event changed, so the listener emits only that.
#[derive(Default, Debug)]
pub(super) struct Changed {
    pub incidents: bool,
    pub live: bool,
    pub team: bool,
    /// This PC is no longer in the league (removed, or the league deleted): stop syncing.
    pub left: bool,
    /// Someone joined: the roster (with their Discord name) is read again.
    pub roster: bool,
}

fn parse<T: DeserializeOwned>(event: &SseEvent) -> Option<T> {
    serde_json::from_str(&event.data).map_err(|e| eprintln!("[sync] Unreadable {} event: {e}", event.name)).ok()
}

impl Core {
    pub(super) fn on_live_event(&mut self, event: &SseEvent) -> Changed {
        let mut changed = Changed::default();
        match event.name.as_str() {
            "hello" => self.on_hello(event, &mut changed),
            "incident" => self.on_incident(event, &mut changed),
            "timing" => self.on_timing(event, &mut changed),
            "stream" => self.on_stream(event, &mut changed),
            "session" => self.on_session(event, &mut changed),
            "member" => self.on_member(event, &mut changed),
            "presence" => {
                if let Some(presence) = parse::<Presence>(event) {
                    self.team.online = presence.online;
                    changed.team = true;
                }
            }
            _ => {}
        }
        changed
    }

    fn on_hello(&mut self, event: &SseEvent, changed: &mut Changed) {
        let Some(hello) = parse::<Hello>(event) else { return };
        self.team.connection = Connection::Live;
        self.team.online = hello.online;
        self.team.stream = hello.stream;
        self.team.remote = hello.timing.and_then(|key| apply_timing(None, &key));
        changed.team = true;
        changed.live = self.show_remote_timing();
    }

    fn on_incident(&mut self, event: &SseEvent, changed: &mut Changed) {
        let Some(update) = parse::<IncidentEvent>(event) else { return };
        changed.incidents = self.apply_remote(update.incident);
        if let Some(link) = self.link_mut() {
            link.advance(&update.revision);
            self.changed();
        }
    }

    fn on_timing(&mut self, event: &SseEvent, changed: &mut Changed) {
        let Some(value) = parse::<serde_json::Value>(event) else { return };
        if let Some(next) = apply_timing(self.team.remote.as_ref(), &value) {
            self.team.remote = Some(next);
            changed.live = self.show_remote_timing();
        }
    }

    /// While someone else streams this session, their timing is the clock on this PC.
    fn show_remote_timing(&mut self) -> bool {
        if !self.watching() {
            return false;
        }
        let Some((_, frame)) = &self.team.remote else { return false };
        self.session = frame.session.clone();
        let mut standings = frame.standings.clone();
        standings.sort_by_key(|car| car.position);
        self.standings = standings;
        true
    }

    fn on_stream(&mut self, event: &SseEvent, changed: &mut Changed) {
        let Some(update) = parse::<StreamEvent>(event) else { return };
        changed.team = true;
        if update.change == "started" {
            self.team.stream = Some(update.stream);
            return;
        }
        let mine = self.team.streaming.as_ref().is_some_and(|s| s.stream_id == update.stream.id);
        if mine {
            self.stop_streaming_here();
        }
        if update.reason.as_deref() == Some("dropped") {
            let at = crate::text::format_hms(self.session.elapsed_seconds);
            self.team.notice =
                Some(format!("{}'s stream dropped: timing paused at {at}", update.stream.streamer.display_name));
        }
        self.team.stream = None;
        self.team.remote = None;
    }

    fn on_session(&mut self, event: &SseEvent, changed: &mut Changed) {
        let Some(update) = parse::<SessionEvent>(event) else { return };
        let Some(link) = self.link_mut() else { return };
        if link.session_id() != Some(update.session.id.as_str()) {
            return;
        }
        changed.team = true;
        if update.change == "deleted" {
            link.session = None;
            self.team.notice = Some(format!("{} was deleted by a head steward", update.session.title));
        } else {
            let incidents = link.session.as_ref().map_or(0, |s| s.incidents);
            link.session = Some(crate::api::wire::SessionView { incidents, ..update.session });
        }
        self.changed();
    }

    fn on_member(&mut self, event: &SseEvent, changed: &mut Changed) {
        let Some(update) = parse::<MemberEvent>(event) else { return };
        changed.team = true;
        let me = self.account.my_id() == Some(update.member.user_id.as_str());
        if me && update.change == "removed" {
            changed.left = true;
            return;
        }
        changed.roster = update.change == "joined";
        let Some(league) = self.team.league.as_mut() else { return };
        league.roster.retain(|m| m.user_id != update.member.user_id || update.change != "removed");
        if let Some(member) = league.roster.iter_mut().find(|m| m.user_id == update.member.user_id) {
            member.role = update.member.role;
        }
        if me {
            league.league.role = update.member.role;
        }
    }
}
