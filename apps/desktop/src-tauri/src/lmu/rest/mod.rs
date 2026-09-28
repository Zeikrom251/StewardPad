//! Polls a live LMU instance over REST (field names confirmed against a real Monza
//! session — see parse.rs). sessionInfo is the tick's spine: only it can cancel a tick.
//! Standings and incidents degrade independently.

mod connection_log;
mod mapper;
mod parse;

use std::time::Duration;

use serde_json::Value;

use super::resolver::{resolve_collisions, LmuCollision};
use super::{LmuEvent, LmuUpdate};
use crate::domain::StandingEntry;
use connection_log::ConnectionLog;
use parse::describe_shape;

const POLL: Duration = Duration::from_secs(1);
const RETRY: Duration = Duration::from_secs(5);
const FETCH_TIMEOUT: Duration = Duration::from_secs(3);
// 0 = unfiltered: LMU would otherwise coalesce repeat contacts between the same pair,
// hiding genuinely separate contacts in a battle. Our own pair dedupe handles duplicates.
const INCIDENTS_PATH: &str = "/rest/watch/getIncidentsList/0";

type Fetched = Result<Value, String>;

struct RestAdapter {
    base_url: String,
    agent: ureq::Agent,
    log: ConnectionLog,
    last_standings: Vec<StandingEntry>,
}

pub fn run(mut sink: impl FnMut(LmuEvent)) {
    let base_url = std::env::var("LMU_BASE_URL").unwrap_or_else(|_| "http://localhost:6397".to_string());
    let agent: ureq::Agent = ureq::Agent::config_builder().timeout_global(Some(FETCH_TIMEOUT)).build().into();
    let mut adapter = RestAdapter { log: ConnectionLog::new(&base_url), base_url, agent, last_standings: Vec::new() };
    loop {
        match adapter.poll_once() {
            Some(update) => sink(LmuEvent::Update(update)),
            None if adapter.log.note_disconnected() => sink(LmuEvent::Disconnected),
            None => {}
        }
        std::thread::sleep(if adapter.log.is_connected() { POLL } else { RETRY });
    }
}

impl RestAdapter {
    fn poll_once(&mut self) -> Option<LmuUpdate> {
        let (session, standings, incidents) = std::thread::scope(|scope| {
            let s = scope.spawn(|| self.fetch("/rest/watch/sessionInfo"));
            let t = scope.spawn(|| self.fetch("/rest/watch/standings"));
            let i = scope.spawn(|| self.fetch(INCIDENTS_PATH));
            let join = |h: std::thread::ScopedJoinHandle<'_, Fetched>| {
                h.join().unwrap_or_else(|_| Err("fetch thread panicked".into()))
            };
            (join(s), join(t), join(i))
        });
        let raw_session = match &session {
            Ok(value) => parse::parse_session_info(value),
            Err(_) => None,
        };
        let Some(raw_session) = raw_session else {
            self.note_problem("sessionInfo", &session);
            return None;
        };
        self.log.note_connected();
        let session = mapper::map_session_info(&raw_session, &mut |v| self.log.unknown_phase(v));
        let standings = self.resolve_standings(standings);
        let collisions = self.resolve_collisions(incidents, &standings);
        Some(LmuUpdate { session, standings, collisions })
    }

    /// A failed standings poll degrades to the last known grid, not a wiped one.
    fn resolve_standings(&mut self, fetched: Fetched) -> Vec<StandingEntry> {
        let Some(parsed) = fetched.as_ref().ok().and_then(parse::parse_standings) else {
            self.note_problem("standings", &fetched);
            return self.last_standings.clone();
        };
        self.log.note_skipped_standings(parsed.skipped);
        self.last_standings = mapper::map_standings(&parsed.entries);
        self.last_standings.clone()
    }

    /// The feed is cumulative, so a failed poll just yields nothing new this tick.
    fn resolve_collisions(&mut self, fetched: Fetched, standings: &[StandingEntry]) -> Vec<LmuCollision> {
        let Some(parsed) = fetched.as_ref().ok().and_then(parse::parse_incidents) else {
            self.note_problem("incidents", &fetched);
            return Vec::new();
        };
        let log = &mut self.log;
        resolve_collisions(&parsed.entries, standings, &mut |name| log.unresolved_driver(name))
    }

    fn fetch(&self, path: &str) -> Fetched {
        let url = format!("{}{path}", self.base_url);
        let mut response = self.agent.get(&url).call().map_err(|e| e.to_string())?;
        let body = response.body_mut().read_to_string().map_err(|e| e.to_string())?;
        serde_json::from_str(&body).map_err(|e| format!("invalid JSON: {e}"))
    }

    fn note_problem(&mut self, endpoint: &str, fetched: &Fetched) {
        let detail = match fetched {
            Ok(value) => format!("unexpected shape: {}", describe_shape(value)),
            Err(error) => format!("fetch failed: {error}"),
        };
        self.log.note_problem(endpoint, &detail);
    }
}
