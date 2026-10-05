//! This PC's changes the league hasn't confirmed yet, in the order they were made. Each keeps
//! its `opId` across retries (the API then answers what it did without doing it twice). An
//! item never sent may still absorb a later edit of the same incident; once sent, it is frozen.

use serde::{Deserialize, Serialize};

use crate::api::wire::Fields;
use crate::domain::IncidentSource;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
pub struct Outbox {
    items: Vec<Pending>,
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

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum Op {
    #[serde(rename_all = "camelCase")]
    Create { session_id: String, incident_id: String, source: IncidentSource, lmu_key: Option<String>, fields: Fields },
    #[serde(rename_all = "camelCase")]
    Edit { incident_id: String, base_version: u32, fields: Fields },
    #[serde(rename_all = "camelCase")]
    Delete { incident_id: String },
    #[serde(rename_all = "camelCase")]
    Merge { incident_id: String, child_ids: Vec<String> },
}

impl Op {
    pub fn incident_id(&self) -> &str {
        match self {
            Op::Create { incident_id, .. }
            | Op::Edit { incident_id, .. }
            | Op::Delete { incident_id }
            | Op::Merge { incident_id, .. } => incident_id,
        }
    }

    fn fields_mut(&mut self) -> Option<&mut Fields> {
        match self {
            Op::Create { fields, .. } | Op::Edit { fields, .. } => Some(fields),
            Op::Delete { .. } | Op::Merge { .. } => None,
        }
    }
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
        self.items.retain(|item| item.op.incident_id() != id);
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
                    if incident_id == from =>
                {
                    *incident_id = to.to_string();
                }
                _ => {}
            }
        }
    }

    /// The fields of an incident the league hasn't confirmed: they stay on top of its copy.
    pub fn pending_fields(&self, id: &str) -> Fields {
        let mut fields = Fields::new();
        for item in self.items.iter().filter(|item| item.op.incident_id() == id) {
            if let Op::Create { fields: f, .. } | Op::Edit { fields: f, .. } = &item.op {
                fields.extend(f.iter().map(|(k, v)| (k.clone(), v.clone())));
            }
        }
        fields
    }

    pub fn has_pending(&self, id: &str) -> bool {
        self.items.iter().any(|item| item.op.incident_id() == id)
    }
}

#[cfg(test)]
#[path = "outbox_tests.rs"]
mod tests;
