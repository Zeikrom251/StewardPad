//! What an answer to a queued change does to the store and the queue.

use super::outbox::{Op, Pending};
use super::Connection;
use crate::api::wire::SyncedIncident;
use crate::api::{ApiError, ApiResult};
use crate::core::Core;
use crate::error::AppError;

/// Answered 500 this many times in a row (≈ 8 minutes with the sender's pauses), a change is
/// one the API breaks on: it would hold up every change behind it, so it stays on this PC.
pub(super) const GIVE_UP_AFTER: u32 = 20;

/// What the sender does next.
#[derive(Debug, PartialEq, Eq)]
pub(super) enum Step {
    Next,
    /// No answer: try the same change again after a growing pause.
    Retry,
    /// The league is read-only for now (owner's subscription ended): try again much later.
    Hold,
    SignedOut,
}

impl Core {
    /// The change to send next, marked as sent before it leaves (and saved so).
    pub(super) fn next_outgoing(&mut self) -> Option<Pending> {
        let item = self.store.team.as_mut()?.outbox.front_mut()?;
        item.sent = true;
        let item = item.clone();
        self.changed();
        Some(item)
    }

    pub(super) fn settle(&mut self, sent: &Pending, answer: ApiResult<SyncedIncident>) -> Step {
        let error = match answer {
            Ok(incident) => {
                self.acknowledge(sent, incident);
                return Step::Next;
            }
            Err(error) => error,
        };
        if error.is_signed_out() {
            return Step::SignedOut;
        }
        if let ApiError::Unreadable { detail, .. } = &error {
            // A 2xx: the league took the change, only its answer has a shape this version can't
            // read. Sending it again would get the same answer forever.
            eprintln!("[sync] A change went through, but its answer couldn't be read: {detail}");
            self.take_front(sent);
            self.changed();
            return Step::Next;
        }
        if self.keeps_failing(sent, &error) {
            self.drop_refused(sent, &error);
            return Step::Next;
        }
        if error.is_transient() {
            self.team.connection = Connection::Offline;
            return Step::Retry;
        }
        match error.code() {
            Some("EDIT_CONFLICT") => self.resend_on_top(sent, &error),
            Some("LEAGUE_INACTIVE") => {
                self.team.connection = Connection::Inactive;
                return Step::Hold;
            }
            _ => self.drop_refused(sent, &error),
        }
        Step::Next
    }

    /// Counts the 500s (the API broke on this change, not a gateway or the network) in a row.
    fn keeps_failing(&mut self, sent: &Pending, error: &ApiError) -> bool {
        if error.status() != Some(500) {
            return false;
        }
        let count = match &mut self.team.failing {
            Some((op_id, count)) if *op_id == sent.op_id => {
                *count += 1;
                *count
            }
            failing => {
                *failing = Some((sent.op_id.clone(), 1));
                1
            }
        };
        count >= GIVE_UP_AFTER
    }

    /// Is `sent` still at the front? A deletion from the league may have dropped it meanwhile.
    fn take_front(&mut self, sent: &Pending) -> bool {
        let Some(link) = self.store.team.as_mut() else { return false };
        let at_front = link.outbox.front().is_some_and(|item| item.op_id == sent.op_id);
        if at_front {
            link.outbox.pop_front();
        }
        at_front
    }

    fn acknowledge(&mut self, sent: &Pending, incident: SyncedIncident) {
        self.team.connection = Connection::Live;
        if self.take_front(sent) {
            let local_id = sent.op.incident_id();
            self.adopt_id(local_id, &incident.id);
            let from = match &sent.op {
                Op::Edit { base_version, .. } => *base_version,
                Op::Create { .. } => 0,
                Op::Delete { .. } | Op::Merge { .. } | Op::Claim { .. } | Op::Unclaim { .. } => {
                    incident.version.saturating_sub(1)
                }
            };
            if let Some(link) = self.store.team.as_mut() {
                link.outbox.rebase(&incident.id, from, incident.version);
            }
        }
        self.apply_remote(incident);
        self.changed();
    }

    /// EDIT_CONFLICT: a teammate changed one of these fields first. This PC's edit is newer: it
    /// goes again, on top of their version, and the incident says it was edited twice.
    fn resend_on_top(&mut self, sent: &Pending, error: &ApiError) {
        let current = error
            .body()
            .and_then(|body| body.get("incident"))
            .and_then(|value| serde_json::from_value::<SyncedIncident>(value.clone()).ok());
        let Some(current) = current else { return self.drop_refused(sent, error) };
        let Some(link) = self.store.team.as_mut() else { return };
        if let Some(item) = link.outbox.front_mut().filter(|item| item.op_id == sent.op_id) {
            if let Op::Edit { base_version, .. } = &mut item.op {
                *base_version = current.version;
            }
            item.op_id = uuid::Uuid::new_v4().to_string();
            item.sent = false;
        }
        let id = current.id.clone();
        self.apply_remote(current);
        self.mark_edited_twice(&id);
        self.changed();
    }

    /// Refused for good (deleted, merged, the session closed, a rule): the change stays on this
    /// PC only, on top of whatever the league sends next. Deletions and merges arrive as live
    /// events, so only the rest is worth a word.
    fn drop_refused(&mut self, sent: &Pending, error: &ApiError) {
        if !self.take_front(sent) {
            return;
        }
        if let (Op::Create { incident_id, fields, .. } | Op::Edit { incident_id, fields, .. }, Some(link)) =
            (&sent.op, self.store.team.as_mut())
        {
            link.outbox.keep(incident_id, fields.clone());
        }
        self.changed();
        let code = error.code().unwrap_or("");
        eprintln!("[sync] A change was refused ({}, {code})", error.status().unwrap_or(0));
        if matches!(code, "INCIDENT_DELETED" | "INCIDENT_MERGED") {
            return;
        }
        self.team.notice = Some(match code {
            "SESSION_CLOSED" => "The session is closed: changes made after that stay on this PC".into(),
            _ => format!("A change stayed on this PC: {}", message(error)),
        });
    }
}

/// The API's own words for a refusal; never a transport error's internals.
fn message(error: &ApiError) -> String {
    AppError::from(error.clone()).message
}

#[cfg(test)]
#[path = "settle_tests.rs"]
mod tests;
