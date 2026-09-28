//! Applies LMU adapter events to the core: live session/standings, auto-archive on a new
//! session, and auto-created incidents from the collision feed.

use crate::core::Core;
use crate::domain::IncidentSource;
use crate::lmu::resolver::LmuCollision;
use crate::lmu::{LmuEvent, LmuUpdate};

use super::input::IncidentFields;
use super::rules::{is_new_session, resolve_lmu_cars};
use super::service::Draft;

/// What changed, so the caller emits only the events that matter.
#[derive(Default, Debug, PartialEq)]
pub struct LmuOutcome {
    pub live_changed: bool,
    pub incidents_changed: bool,
}

impl Core {
    pub fn apply_lmu(&mut self, event: LmuEvent) -> LmuOutcome {
        match event {
            LmuEvent::Disconnected => {
                self.session.connected = false;
                LmuOutcome { live_changed: true, incidents_changed: false }
            }
            LmuEvent::Update(update) => self.apply_update(update),
        }
    }

    /// Archive-then-ingest, in that order: the archive resets the sequence, so this tick's
    /// collisions belong to the new session and start at #1. Nothing is dropped — the old
    /// session lands in the archive folder.
    fn apply_update(&mut self, update: LmuUpdate) -> LmuOutcome {
        let mut incidents_changed = false;
        if let Some(previous) = self.last_session.replace(update.session.clone()) {
            if is_new_session(&previous, &update.session) {
                eprintln!(
                    "[incidents] New LMU session ({}) — archiving {}",
                    update.session.track_name, previous.track_name
                );
                incidents_changed = true;
                if let Err(error) = self.archive(&previous.track_name) {
                    eprintln!("[incidents] {} — keeping the incidents in the current session", error.message);
                }
            }
        }
        self.session = update.session;
        self.standings = update.standings;
        let created = self.ingest(&update.collisions);
        LmuOutcome { live_changed: true, incidents_changed: incidents_changed || created > 0 }
    }

    /// The feed is cumulative — skip anything already turned into an incident.
    fn ingest(&mut self, collisions: &[LmuCollision]) -> usize {
        let fresh: Vec<&LmuCollision> = collisions.iter().filter(|c| !self.store.has_seen_lmu_key(&c.key)).collect();
        for collision in &fresh {
            self.create_from_collision(collision);
        }
        fresh.len()
    }

    /// `et` is the measured moment of contact — no human reaction delay — so unlike quick
    /// log there is no look-back: eventSeconds = loggedAtSeconds = et, lookbackApplied 0.
    fn create_from_collision(&mut self, collision: &LmuCollision) {
        let unresolved = collision
            .unresolved_other
            .as_ref()
            .map(|other| format!("LMU reported contact with unresolved driver \"{other}\""));
        let draft = Draft {
            event_seconds: collision.et,
            logged_at_seconds: collision.et,
            cars: resolve_lmu_cars(&collision.cars, &self.standings),
            kind: collision.kind,
            logged_by: "LMU".to_string(),
            source: IncidentSource::Lmu,
            fields: IncidentFields { steward_notes: unresolved, ..IncidentFields::default() },
        };
        self.store.mark_lmu_key_seen(&collision.key);
        self.insert(draft);
    }
}
