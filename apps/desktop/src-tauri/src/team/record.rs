//! Every change a steward makes to an incident, queued for the league while this PC is linked
//! to an open session. The incident operations call these after saving locally.

use super::outbox::{Op, Outbox};
use crate::api::wire::{changed_fields, fields_of};
use crate::core::Core;
use crate::domain::Incident;

impl Core {
    pub(crate) fn record_created(&mut self, incident: &Incident) {
        let Some(session_id) = self.open_session_id() else { return };
        let op = Op::Create {
            session_id,
            incident_id: incident.id.clone(),
            source: incident.source,
            lmu_key: incident.lmu_key.clone(),
            fields: fields_of(incident),
        };
        self.queue(|outbox| outbox.push(op));
    }

    /// Only the fields that changed, on top of the version the steward saw.
    pub(crate) fn record_edited(&mut self, before: &Incident, after: &Incident) {
        if self.open_session_id().is_none() {
            return;
        }
        let changed = changed_fields(before, after);
        self.queue(|outbox| outbox.edit(&after.id, before.version, changed));
    }

    pub(crate) fn record_deleted(&mut self, id: &str) {
        if self.open_session_id().is_some() {
            self.queue(|outbox| outbox.delete(id));
        }
    }

    pub(crate) fn record_merged(&mut self, primary: &str, children: Vec<String>) {
        if self.open_session_id().is_none() {
            return;
        }
        let op = Op::Merge { incident_id: primary.to_string(), child_ids: children };
        self.queue(|outbox| outbox.push(op));
    }

    pub(crate) fn record_claim(&mut self, id: &str, claimed: bool) {
        if self.open_session_id().is_none() {
            return;
        }
        let incident_id = id.to_string();
        let op = if claimed { Op::Claim { incident_id } } else { Op::Unclaim { incident_id } };
        self.queue(|outbox| outbox.push(op));
    }

    fn queue(&mut self, change: impl FnOnce(&mut Outbox)) {
        let Some(link) = self.store.team.as_mut() else { return };
        change(&mut link.outbox);
        self.wake_sender();
    }

    pub(crate) fn wake_sender(&self) {
        if let Some(wake) = &self.team.wake {
            // Err: the sender stopped (signed out, left the league); the change stays queued.
            let _ = wake.send(());
        }
    }
}
