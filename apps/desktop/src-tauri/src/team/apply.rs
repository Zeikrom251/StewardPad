//! The league's copy of an incident, applied to this PC's store: a newer version replaces the
//! local one, with the fields this PC changed and the league hasn't confirmed kept on top.

use crate::api::wire::{overlay, SessionIncidents, SyncedIncident};
use crate::core::Core;
use crate::incidents::mark;

impl Core {
    /// An answer or a live event. True when the list changed.
    pub(crate) fn apply_remote(&mut self, remote: SyncedIncident) -> bool {
        if self.link().and_then(|link| link.session_id()) != Some(remote.session_id.as_str()) {
            return false;
        }
        // The league has this contact (or deleted it): this PC's own feed never logs it again.
        if let Some(key) = &remote.lmu_key {
            self.store.mark_lmu_key_seen(key);
        }
        let Some(link) = self.store.team.as_mut() else { return false };
        if remote.deleted_at.is_some() {
            link.outbox.forget(&remote.id);
            let deleted = self.store.delete(&remote.id);
            if deleted {
                self.changed();
            }
            return deleted;
        }
        let pending = link.outbox.pending_fields(&remote.id);
        let claim = link.outbox.pending_claim(&remote.id);
        let local = self.store.get(&remote.id);
        if local.is_some_and(|local| local.version >= remote.version) {
            return false;
        }
        let edited_twice = local.is_some_and(|local| local.edited_twice);
        let mut incident = remote.into_incident();
        overlay(&mut incident, &pending);
        if let Some(claimed) = claim {
            mark(&mut incident.reviewers, &self.steward_name(), claimed);
        }
        incident.edited_twice = edited_twice;
        self.store.note_sequence(incident.sequence_number);
        self.store.save(incident);
        self.changed();
        true
    }

    /// Joining or rejoining the session: the league's copy of every incident. An incident the
    /// league once had and no longer knows (its session was purged) leaves this PC too, unless
    /// this PC still has changes for it. A snapshot of `session_id` this PC no longer follows (an
    /// old listener's late answer) changes nothing.
    pub(crate) fn apply_snapshot(&mut self, session_id: &str, snapshot: SessionIncidents) {
        if self.link().and_then(|link| link.session_id()) != Some(session_id) {
            return;
        }
        let known: Vec<String> = snapshot.incidents.iter().map(|i| i.id.clone()).collect();
        for incident in snapshot.incidents {
            self.apply_remote(incident);
        }
        let Some(link) = self.store.team.as_mut() else { return };
        link.advance(&snapshot.revision);
        let outbox = link.outbox.clone();
        let gone: Vec<String> = self
            .store
            .all()
            .iter()
            .filter(|i| i.version > 0 && !known.contains(&i.id) && !outbox.has_pending(&i.id))
            .map(|i| i.id.clone())
            .collect();
        for id in gone {
            self.store.delete(&id);
        }
        self.changed();
    }

    /// The league kept its own copy of this PC's LMU contact (another PC logged it first): this
    /// PC's incident takes the league's id, so both PCs edit one incident.
    pub(crate) fn adopt_id(&mut self, local_id: &str, league_id: &str) {
        if local_id == league_id {
            return;
        }
        if let Some(link) = self.store.team.as_mut() {
            link.outbox.rename(local_id, league_id);
        }
        self.store.delete(local_id);
    }

    /// Two stewards changed the same field: this PC's change goes again on top of theirs.
    pub(crate) fn mark_edited_twice(&mut self, id: &str) {
        if let Some(mut incident) = self.store.get(id).cloned() {
            incident.edited_twice = true;
            self.store.save(incident);
        }
    }
}

#[cfg(test)]
#[path = "apply_tests.rs"]
mod tests;
