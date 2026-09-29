//! Connection state + log de-duplication for the REST adapter: one line per state change
//! or distinct problem, never one per poll (CLAUDE.md — an LMU outage must not flood logs).

use std::collections::HashSet;

#[derive(PartialEq, Eq, Clone, Copy)]
enum State {
    Unknown,
    Connected,
    Disconnected,
}

pub struct ConnectionLog {
    base_url: String,
    state: State,
    seen: HashSet<String>,
    last_skipped_standings: usize,
}

impl ConnectionLog {
    pub fn new(base_url: &str) -> Self {
        Self { base_url: base_url.to_string(), state: State::Unknown, seen: HashSet::new(), last_skipped_standings: 0 }
    }

    pub fn is_connected(&self) -> bool {
        self.state == State::Connected
    }

    pub fn note_connected(&mut self) {
        if self.state == State::Connected {
            return;
        }
        let verb = if self.state == State::Disconnected { "Reconnected" } else { "Connected" };
        eprintln!("[lmu] {verb} to LMU at {}", self.base_url);
        self.state = State::Connected;
    }

    /// Returns true only on the transition, so the caller notifies the UI once.
    pub fn note_disconnected(&mut self) -> bool {
        if self.state == State::Disconnected {
            return false;
        }
        eprintln!("[lmu] Cannot reach LMU at {}, retrying", self.base_url);
        let was_connected = self.state == State::Connected;
        self.state = State::Disconnected;
        was_connected
    }

    /// One line per distinct problem (endpoint + cause), not per poll.
    pub fn note_problem(&mut self, endpoint: &str, detail: &str) {
        self.once(format!("LMU {endpoint} {detail}"));
    }

    pub fn note_skipped_standings(&mut self, count: usize) {
        if count == self.last_skipped_standings {
            return;
        }
        self.last_skipped_standings = count;
        if count > 0 {
            eprintln!(
                "[lmu] Skipped {count} unparseable standings entr{} this tick",
                if count == 1 { "y" } else { "ies" }
            );
        }
    }

    pub fn unknown_phase(&mut self, value: String) {
        self.once(format!("Unrecognized LMU gamePhase \"{value}\", mapping to UNKNOWN"));
    }

    /// Covers both "no slot has this name" and "more than one does": dropped, never guessed.
    pub fn unresolved_driver(&mut self, name: &str) {
        self.once(format!("LMU incidents feed named driver \"{name}\", not uniquely resolvable, skipping"));
    }

    fn once(&mut self, line: String) {
        if self.seen.insert(line.clone()) {
            eprintln!("[lmu] {line}");
        }
    }
}
