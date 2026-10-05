//! Team: the stewards of a league on one race session, each PC in sync through the StewardPad
//! API (docs/sync.md in the website repo). This PC's session file stays its own source of
//! truth: changes go out through the outbox when the API is reachable, the league's come back
//! as live events, and losing the connection never loses an incident.

mod apply;
pub mod engine;
mod events;
mod frames;
pub mod leagues;
mod link;
mod listener;
pub mod members;
mod outbox;
mod record;
mod sender;
pub mod sessions;
mod settle;
mod timing;

#[cfg(test)]
mod e2e_stream_tests;
#[cfg(test)]
mod e2e_tests;

use std::sync::mpsc::{Sender, SyncSender};

use serde::Serialize;

use crate::api::wire::{LeagueView, LiveStream, SessionView, TimingFrame};
use crate::core::Core;
pub use link::TeamLink;

/// What the team engine knows now; nothing here is saved.
#[derive(Default)]
pub struct TeamLive {
    pub league: Option<LeagueView>,
    /// User ids of the members connected now.
    pub online: Vec<String>,
    pub stream: Option<LiveStream>,
    /// This PC's own stream, while it streams.
    pub streaming: Option<Streaming>,
    /// The league's timing from the streaming PC, and the stream it came from.
    pub remote: Option<(String, TimingFrame)>,
    pub connection: Connection,
    pub notice: Option<String>,
    /// Wakes the outbox sender after a change.
    pub wake: Option<Sender<()>>,
    /// Hands each frame to the uploader while this PC streams.
    pub frames: Option<SyncSender<TimingFrame>>,
}

pub struct Streaming {
    pub stream_id: String,
    pub seq: u32,
}

#[derive(Serialize, Clone, Copy, Default, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Connection {
    /// Not in a league, or not signed in.
    #[default]
    Off,
    Connecting,
    Live,
    /// The API can't be reached: changes wait on this PC.
    Offline,
    /// The owner's subscription ended: sync is off, the league read-only.
    Inactive,
}

/// What the UI knows of the team (`team:update`).
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TeamView {
    pub league_id: Option<String>,
    pub league_name: Option<String>,
    pub league: Option<LeagueView>,
    pub session: Option<SessionView>,
    pub online: Vec<String>,
    pub stream: Option<LiveStream>,
    pub streaming: bool,
    pub watching: bool,
    pub connection: Connection,
    /// Changes kept on this PC until the league confirms them.
    pub pending: usize,
    pub notice: Option<String>,
}

impl Core {
    pub fn team_view(&self) -> TeamView {
        let link = self.link();
        TeamView {
            league_id: link.map(|l| l.league_id.clone()),
            league_name: link.map(|l| l.league_name.clone()),
            league: self.team.league.clone(),
            session: link.and_then(|l| l.session.clone()),
            online: self.team.online.clone(),
            stream: self.team.stream.clone(),
            streaming: self.team.streaming.is_some(),
            watching: self.watching(),
            connection: self.team.connection,
            pending: link.map_or(0, |l| l.outbox.len()),
            notice: self.team.notice.clone(),
        }
    }

    /// Someone else streams this session: their timing is the clock here.
    pub fn watching(&self) -> bool {
        let Some(stream) = &self.team.stream else { return false };
        let ours = self.link().and_then(|l| l.session_id()) == Some(stream.session_id.as_str());
        ours && self.account.my_id() != Some(stream.streamer.id.as_str())
    }

    /// Who signs a change: the account's name in a league, Settings → Your name otherwise.
    pub fn steward_name(&self) -> String {
        match (&self.account.me, self.link()) {
            (Some(me), Some(_)) => me.display_name.clone(),
            _ => self.store.config.steward_name.trim().to_string(),
        }
    }
}
