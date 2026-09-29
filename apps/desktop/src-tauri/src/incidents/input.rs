//! Command inputs — the DTOs. serde rejects unknown fields and bad enum values; the
//! `validate` methods cover what types can't (non-negative times, non-empty names).

use serde::{Deserialize, Deserializer};

use crate::discord::DiscordSettings;
use crate::display::DisplayPrefs;
use crate::domain::{Incident, IncidentStatus, IncidentType, InvolvedCar, Penalty, RuleRef};
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
    pub rules: Option<Vec<RuleRef>>,
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
        if self.rules.iter().flatten().any(|r| r.code.trim().is_empty()) {
            return Err(AppError::invalid("every rule needs a code"));
        }
        if let Some(Some(penalty)) = &self.penalty {
            if penalty.applied_to.trim().is_empty() {
                return Err(AppError::invalid("penalty.appliedTo must name a car"));
            }
        }
        Ok(())
    }

    /// Applies only the fields sent; absent ones stay as they were. One arm per field — a
    /// table, so it runs past the 40-line guideline on purpose.
    pub fn apply_to(self, incident: &mut Incident) {
        if let Some(v) = self.event_seconds {
            incident.event_seconds = v;
        }
        if let Some(v) = self.cars {
            incident.cars = v;
        }
        if let Some(v) = self.kind {
            incident.kind = v;
        }
        if let Some(v) = self.status {
            incident.status = v;
        }
        if let Some(v) = self.summary {
            incident.summary = v;
        }
        if let Some(v) = self.steward_notes {
            incident.steward_notes = v;
        }
        if let Some(v) = self.decision {
            incident.decision = v;
        }
        if let Some(v) = self.penalty {
            incident.penalty = v;
        }
        if let Some(v) = self.rules {
            incident.rules = v;
        }
        if let Some(v) = self.logged_by {
            incident.logged_by = v;
        }
        if let Some(v) = self.reviewed_by {
            incident.reviewed_by = v;
        }
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
    /// Absolute folder the Save dialogs open in. '' resets to the default.
    pub export_dir: Option<String>,
    /// Replaces all display preferences at once.
    pub display: Option<DisplayPrefs>,
    /// Replaces the Discord announcement settings at once.
    pub discord: Option<DiscordSettings>,
}

impl ConfigInput {
    pub fn validate(&self) -> AppResult<()> {
        if self.steward_name.as_ref().is_some_and(|n| n.chars().count() > 80) {
            return Err(AppError::invalid("stewardName is limited to 80 characters"));
        }
        validate_folder("archiveDir", self.archive_dir.as_deref())?;
        validate_folder("exportDir", self.export_dir.as_deref())?;
        if let Some(display) = &self.display {
            display.validate()?;
        }
        if let Some(discord) = &self.discord {
            discord.validate()?;
        }
        Ok(())
    }
}

/// A settings folder: '' (the default) or an absolute path. A relative one would land
/// wherever the app happened to start from.
fn validate_folder(field: &str, dir: Option<&str>) -> AppResult<()> {
    let Some(dir) = dir else { return Ok(()) };
    if dir.chars().count() > 500 {
        return Err(AppError::invalid(format!("{field} is limited to 500 characters")));
    }
    if !dir.trim().is_empty() && !std::path::Path::new(dir).is_absolute() {
        return Err(AppError::invalid(format!("{field} must be an absolute folder path")));
    }
    Ok(())
}

#[cfg(test)]
#[path = "input_tests.rs"]
mod tests;
