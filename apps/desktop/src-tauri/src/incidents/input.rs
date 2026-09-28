//! Command inputs — the DTOs. serde rejects unknown fields and bad enum values; the
//! `validate` methods cover what types can't (non-negative times, non-empty names).

use serde::{Deserialize, Deserializer};

use crate::domain::{IncidentStatus, IncidentType, InvolvedCar, Penalty};
use crate::error::{AppError, AppResult};

/// Every field the steward may edit; absent = unchanged. `penalty` and `reviewedBy` are
/// tri-state: absent keeps the value, an explicit null clears it.
#[derive(Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct IncidentFields {
    pub event_seconds: Option<f64>,
    pub cars: Option<Vec<InvolvedCar>>,
    #[serde(rename = "type")]
    pub kind: Option<IncidentType>,
    pub status: Option<IncidentStatus>,
    pub summary: Option<String>,
    pub steward_notes: Option<String>,
    pub decision: Option<String>,
    #[serde(default, deserialize_with = "present")]
    pub penalty: Option<Option<Penalty>>,
    pub logged_by: Option<String>,
    #[serde(default, deserialize_with = "present")]
    pub reviewed_by: Option<Option<String>>,
}

/// Distinguishes `"field": null` (Some(None)) from a missing field (None).
fn present<'de, T: Deserialize<'de>, D: Deserializer<'de>>(de: D) -> Result<Option<Option<T>>, D::Error> {
    Option::<T>::deserialize(de).map(Some)
}

impl IncidentFields {
    pub fn validate(&self) -> AppResult<()> {
        // A session clock never runs backwards; a negative time can't be scrubbed to.
        if let Some(seconds) = self.event_seconds {
            if !seconds.is_finite() || seconds < 0.0 {
                return Err(AppError::invalid("eventSeconds must be a number ≥ 0"));
            }
        }
        for car in self.cars.iter().flatten() {
            if car.car_number.trim().is_empty() || car.driver_name.trim().is_empty() {
                return Err(AppError::invalid("every car needs a carNumber and a driverName"));
            }
        }
        if let Some(Some(penalty)) = &self.penalty {
            if penalty.applied_to.trim().is_empty() {
                return Err(AppError::invalid("penalty.appliedTo must name a car"));
            }
        }
        Ok(())
    }
}

#[derive(Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct QuickLogInput {
    /// LMU slotIDs (as strings), not car numbers — two cars can share a number.
    #[serde(default)]
    pub slot_ids: Vec<String>,
    pub logged_by: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MergeInput {
    pub incident_ids: Vec<String>,
    /// Defaults to the incident with the lowest sequence number.
    pub primary_id: Option<String>,
}

impl MergeInput {
    pub fn validate(&self) -> AppResult<()> {
        if self.incident_ids.len() < 2 {
            return Err(AppError::invalid("merge requires at least 2 incidentIds"));
        }
        match &self.primary_id {
            Some(id) if !self.incident_ids.contains(id) => {
                Err(AppError::invalid("primaryId must be one of incidentIds"))
            }
            _ => Ok(()),
        }
    }
}

#[derive(Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConfigInput {
    pub lookback_seconds: Option<u32>,
    pub steward_name: Option<String>,
    /// Absolute folder for archive files. '' resets to the default.
    pub archive_dir: Option<String>,
}

impl ConfigInput {
    pub fn validate(&self) -> AppResult<()> {
        if self.steward_name.as_ref().is_some_and(|n| n.chars().count() > 80) {
            return Err(AppError::invalid("stewardName is limited to 80 characters"));
        }
        if self.archive_dir.as_ref().is_some_and(|d| d.chars().count() > 500) {
            return Err(AppError::invalid("archiveDir is limited to 500 characters"));
        }
        Ok(())
    }
}
