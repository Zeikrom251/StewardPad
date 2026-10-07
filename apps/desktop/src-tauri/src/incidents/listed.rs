//! The live list as the UI gets it. Merged children are hidden from it, so each primary
//! carries their numbers for the grids. Read from the store each time: an import renumbers
//! incidents, so a number saved at merge time could go stale.

use std::collections::HashMap;

use serde::Serialize;

use crate::core::Core;
use crate::domain::Incident;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Listed {
    #[serde(flatten)]
    pub incident: Incident,
    pub merged_from_numbers: Vec<u32>,
}

impl Core {
    pub fn listed(&self) -> Vec<Listed> {
        let numbers: HashMap<&str, u32> = self.store.all().iter().map(|i| (i.id.as_str(), i.sequence_number)).collect();
        self.list()
            .into_iter()
            .map(|incident| {
                let merged_from_numbers =
                    incident.merged_from_ids.iter().filter_map(|id| numbers.get(id.as_str()).copied()).collect();
                Listed { incident, merged_from_numbers }
            })
            .collect()
    }
}
