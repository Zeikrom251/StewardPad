//! One change this PC queued for the league (docs/sync-api.md → Incidents).

use serde::{Deserialize, Serialize};

use crate::api::wire::Fields;
use crate::domain::IncidentSource;

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
    #[serde(rename_all = "camelCase")]
    Claim { incident_id: String },
    #[serde(rename_all = "camelCase")]
    Unclaim { incident_id: String },
}

impl Op {
    pub fn incident_id(&self) -> &str {
        match self {
            Op::Create { incident_id, .. }
            | Op::Edit { incident_id, .. }
            | Op::Delete { incident_id }
            | Op::Merge { incident_id, .. }
            | Op::Claim { incident_id }
            | Op::Unclaim { incident_id } => incident_id,
        }
    }

    pub(super) fn fields_mut(&mut self) -> Option<&mut Fields> {
        match self {
            Op::Create { fields, .. } | Op::Edit { fields, .. } => Some(fields),
            Op::Delete { .. } | Op::Merge { .. } | Op::Claim { .. } | Op::Unclaim { .. } => None,
        }
    }
}
