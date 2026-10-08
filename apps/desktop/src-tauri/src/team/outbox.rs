//! This PC's changes the league hasn't confirmed yet, in the order they were made. Each keeps
//! its `opId` across retries (the API then answers what it did without doing it twice). An
//! item never sent may still absorb a later edit of the same incident; once sent, it is frozen.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

pub use super::op::Op;
use crate::api::wire::Fields;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
pub struct Outbox {
    items: Vec<Pending>,
    /// Changes the league refused for good, by incident: shown on top of its copy, on this PC only.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    kept: BTreeMap<String, Fields>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Pending {
    pub op_id: String,
    /// Sent at least once: its answer may already be on its way, so it never changes again.
    #[serde(default)]
    pub sent: bool,
    pub op: Op,
}

fn op_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

impl Outbox {
    pub fn len(&self) -> usize {
        self.items.len()
    }

    pub fn front(&self) -> Option<&Pending> {
        self.items.first()
    }

    pub fn front_mut(&mut self) -> Option<&mut Pending> {
        self.items.first_mut()
    }

    pub fn pop_front(&mut self) -> Option<Pending> {
        (!self.items.is_empty()).then(|| self.items.remove(0))
    }

    /// After a restart nothing is known about what was in flight: nothing absorbs edits again.
    pub fn mark_all_sent(&mut self) {
        self.items.iter_mut().for_each(|item| item.sent = true);
    }

    pub fn push(&mut self, op: Op) {
        self.items.push(Pending { op_id: op_id(), sent: false, op });
    }

    fn last_for(&mut self, id: &str) -> Option<&mut Pending> {
        self.items.iter_mut().rev().find(|item| item.op.incident_id() == id)
    }

    /// An edit: folded into the incident's last unsent create or edit, else queued.
    pub fn edit(&mut self, id: &str, base_version: u32, fields: Fields) {
        if fields.is_empty() {
            return;
        }
        self.unkeep(id, &fields);
        if let Some(open) = self.last_for(id).filter(|item| !item.sent).and_then(|item| item.op.fields_mut()) {
            open.extend(fields);
            return;
        }
        self.push(Op::Edit { incident_id: id.to_string(), base_version, fields });
    }

    /// A deletion. An incident the league never saw just leaves the queue.
    pub fn delete(&mut self, id: &str) {
        let concerns = |item: &Pending| item.op.incident_id() == id;
        let never_sent = self.items.iter().filter(|item| concerns(item)).all(|item| !item.sent);
        let created_here = self.items.iter().any(|item| concerns(item) && matches!(item.op, Op::Create { .. }));
        self.items.retain(|item| !concerns(item) || item.sent);
        if !(never_sent && created_here) {
            self.push(Op::Delete { incident_id: id.to_string() });
        }
    }

    /// The league deleted the incident (or merged it away): nothing of this PC's still applies.
    pub fn forget(&mut self, id: &str) {
        self.kept.remove(id);
        self.items.retain(|item| item.op.incident_id() != id);
        // An unsent merge would be refused for that one child: it goes on with the others.
        for item in self.items.iter_mut().filter(|item| !item.sent) {
            if let Op::Merge { child_ids, .. } = &mut item.op {
                child_ids.retain(|child| child != id);
            }
        }
        self.items.retain(|item| !matches!(&item.op, Op::Merge { child_ids, .. } if child_ids.is_empty()));
    }

    /// Refused for good: the change stays on top of the league's copy, on this PC only, until
    /// this PC changes those fields again.
    pub fn keep(&mut self, id: &str, fields: Fields) {
        self.kept.entry(id.to_string()).or_default().extend(fields);
    }

    fn unkeep(&mut self, id: &str, fields: &Fields) {
        if let Some(kept) = self.kept.get_mut(id) {
            kept.retain(|key, _| !fields.contains_key(key));
            if kept.is_empty() {
                self.kept.remove(id);
            }
        }
    }

    /// Another session: the refused changes belonged to its incidents, archived with them.
    pub fn clear_kept(&mut self) {
        self.kept.clear();
    }

    /// This PC's own write took the incident from `from` to `to`: later edits made on top of
    /// `from` are on top of `to` now, so they never conflict with this PC's own change.
    pub fn rebase(&mut self, id: &str, from: u32, to: u32) {
        for item in &mut self.items {
            if let Op::Edit { incident_id, base_version, .. } = &mut item.op {
                if incident_id == id && *base_version == from {
                    *base_version = to;
                }
            }
        }
    }

    /// The league already had this LMU contact under another id: later items follow it.
    pub fn rename(&mut self, from: &str, to: &str) {
        for item in &mut self.items {
            match &mut item.op {
                Op::Create { incident_id, .. }
                | Op::Edit { incident_id, .. }
                | Op::Delete { incident_id }
                | Op::Merge { incident_id, .. }
                | Op::Claim { incident_id }
                | Op::Unclaim { incident_id }
                    if incident_id == from =>
                {
                    *incident_id = to.to_string();
                }
                _ => {}
            }
        }
        if let Some(kept) = self.kept.remove(from) {
            self.kept.insert(to.to_string(), kept);
        }
    }

    /// The fields of an incident the league hasn't confirmed: they stay on top of its copy.
    pub fn pending_fields(&self, id: &str) -> Fields {
        let mut fields = self.kept.get(id).cloned().unwrap_or_default();
        for item in self.items.iter().filter(|item| item.op.incident_id() == id) {
            if let Op::Create { fields: f, .. } | Op::Edit { fields: f, .. } = &item.op {
                fields.extend(f.iter().map(|(k, v)| (k.clone(), v.clone())));
            }
        }
        fields
    }

    /// This PC's latest claim (true) or unclaim of the incident the league hasn't confirmed.
    pub fn pending_claim(&self, id: &str) -> Option<bool> {
        self.items.iter().rev().filter(|item| item.op.incident_id() == id).find_map(|item| match item.op {
            Op::Claim { .. } => Some(true),
            Op::Unclaim { .. } => Some(false),
            _ => None,
        })
    }

    pub fn has_pending(&self, id: &str) -> bool {
        self.kept.contains_key(id) || self.items.iter().any(|item| item.op.incident_id() == id)
    }
}

#[cfg(test)]
#[path = "outbox_tests.rs"]
mod tests;
