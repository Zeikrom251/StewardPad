//! The working store: incidents, the sequence counter, LMU dedupe keys and config.
//! In memory only — `disk.rs` saves snapshots of it (prompt §7.4).

use std::collections::HashSet;

use serde::{Deserialize, Serialize};

use crate::discord::DiscordSettings;
use crate::display::DisplayPrefs;
use crate::domain::Incident;
use crate::lmu::AdapterName;
use crate::rulebook::Rulebook;

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PersistedConfig {
    pub lookback_seconds: u32,
    pub steward_name: String,
    /// None (or '') = the default archive folder inside the app data dir.
    pub archive_dir: Option<String>,
    /// None = the default exports folder inside the app data dir.
    #[serde(default)]
    pub export_dir: Option<String>,
    /// Absent on files written before the source moved into Settings: the simulator.
    #[serde(default)]
    pub adapter: AdapterName,
    /// The league's rule book (Settings), optional.
    #[serde(default)]
    pub rulebook: Option<Rulebook>,
    #[serde(default)]
    pub display: DisplayPrefs,
    #[serde(default)]
    pub discord: DiscordSettings,
}

impl Default for PersistedConfig {
    fn default() -> Self {
        Self {
            lookback_seconds: 10,
            steward_name: String::new(),
            archive_dir: None,
            export_dir: None,
            adapter: AdapterName::Mock,
            rulebook: None,
            display: DisplayPrefs::default(),
            discord: DiscordSettings::default(),
        }
    }
}

/// The on-disk format — identical to the NestJS server's current-session.json.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PersistedState {
    pub incidents: Vec<Incident>,
    pub next_sequence_number: u32,
    #[serde(default)]
    pub config: PersistedConfig,
    /// Keys of LMU collisions already turned into incidents. The feed is cumulative, so this
    /// stops a restart or reconnect from re-ingesting everything. Absent on older files.
    #[serde(default)]
    pub seen_lmu_collision_keys: Vec<String>,
}

pub struct Store {
    /// Insertion order is the list order, same as the server's Map.
    incidents: Vec<Incident>,
    seen_lmu_keys: HashSet<String>,
    next_sequence_number: u32,
    pub config: PersistedConfig,
}

impl Store {
    pub fn empty() -> Self {
        Self::from_state(PersistedState {
            incidents: Vec::new(),
            next_sequence_number: 1,
            config: PersistedConfig::default(),
            seen_lmu_collision_keys: Vec::new(),
        })
    }

    pub fn from_state(state: PersistedState) -> Self {
        let mut incidents = state.incidents;
        // Older files wrote "RACE 00:01:50 — Lap 3"; the app no longer shows em dashes.
        for incident in &mut incidents {
            incident.replay_reference = incident.replay_reference.replace(" — Lap ", " · Lap ");
        }
        Self {
            incidents,
            seen_lmu_keys: state.seen_lmu_collision_keys.into_iter().collect(),
            next_sequence_number: state.next_sequence_number,
            config: state.config,
        }
    }

    pub fn snapshot(&self) -> PersistedState {
        PersistedState {
            incidents: self.incidents.clone(),
            next_sequence_number: self.next_sequence_number,
            config: self.config.clone(),
            seen_lmu_collision_keys: self.seen_lmu_keys.iter().cloned().collect(),
        }
    }

    pub fn all(&self) -> &[Incident] {
        &self.incidents
    }

    pub fn get(&self, id: &str) -> Option<&Incident> {
        self.incidents.iter().find(|i| i.id == id)
    }

    pub fn next_sequence(&mut self) -> u32 {
        let sequence = self.next_sequence_number;
        self.next_sequence_number += 1;
        sequence
    }

    /// Insert, or replace the incident with the same id in place.
    pub fn save(&mut self, incident: Incident) {
        match self.incidents.iter_mut().find(|i| i.id == incident.id) {
            Some(existing) => *existing = incident,
            None => self.incidents.push(incident),
        }
    }

    pub fn delete(&mut self, id: &str) -> bool {
        let before = self.incidents.len();
        self.incidents.retain(|i| i.id != id);
        self.incidents.len() != before
    }

    pub fn has_seen_lmu_key(&self, key: &str) -> bool {
        self.seen_lmu_keys.contains(key)
    }

    pub fn mark_lmu_key_seen(&mut self, key: &str) {
        self.seen_lmu_keys.insert(key.to_string());
    }

    /// After archiving. The LMU keys are deliberately kept: the feed is cumulative for the
    /// running session, so dropping them re-creates every cleared incident on the next poll.
    pub fn clear_incidents(&mut self) {
        self.incidents.clear();
        self.next_sequence_number = 1;
    }
}
