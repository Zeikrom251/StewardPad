//! Incident operations — the port of IncidentsService. Each mutation saves (debounced);
//! the command layer emits `incidents:update` afterwards.

use crate::core::Core;
use crate::domain::{Incident, IncidentSource, IncidentStatus, IncidentType, InvolvedCar};
use crate::error::{AppError, AppResult};
use crate::text::UtcTime;

use super::input::{IncidentFields, MergeInput, QuickLogInput};
use super::rules::*;

/// What an incident is created from; editable extras arrive in `fields`.
pub(crate) struct Draft {
    pub event_seconds: f64,
    pub logged_at_seconds: f64,
    pub cars: Vec<InvolvedCar>,
    pub kind: IncidentType,
    pub logged_by: String,
    pub source: IncidentSource,
    pub lmu_key: Option<String>,
    pub fields: IncidentFields,
}

impl Core {
    /// The live list: merged children are audit trail only.
    pub fn list(&self) -> Vec<Incident> {
        self.store.all().iter().filter(|i| is_active(i)).cloned().collect()
    }

    pub fn get(&self, id: &str) -> AppResult<Incident> {
        self.store.get(id).cloned().ok_or_else(|| AppError::not_found(format!("Incident {id} not found")))
    }

    /// Cars only — look-back and every other field are server-side defaults (§7.3).
    pub fn quick_log(&mut self, input: QuickLogInput) -> AppResult<Incident> {
        let logged_at = self.session.elapsed_seconds;
        let lookback = f64::from(self.store.config.lookback_seconds);
        let draft = Draft {
            event_seconds: compute_event_seconds(logged_at, lookback),
            logged_at_seconds: logged_at,
            cars: resolve_manual_cars(&input.slot_ids, &self.standings),
            kind: IncidentType::Other,
            logged_by: input.logged_by.unwrap_or_else(|| self.store.config.steward_name.clone()),
            source: IncidentSource::Steward,
            lmu_key: None,
            fields: IncidentFields::default(),
        };
        Ok(self.insert(draft))
    }

    /// "Log a missed incident": the steward types the time, so no look-back is applied.
    pub fn create(&mut self, fields: IncidentFields) -> AppResult<Incident> {
        fields.validate()?;
        let logged_at = self.session.elapsed_seconds;
        let draft = Draft {
            event_seconds: fields.event_seconds.unwrap_or(logged_at),
            logged_at_seconds: logged_at,
            cars: fields.cars.clone().unwrap_or_default(),
            kind: fields.kind.unwrap_or(IncidentType::Other),
            logged_by: fields.logged_by.clone().unwrap_or_else(|| self.store.config.steward_name.clone()),
            source: IncidentSource::Steward,
            lmu_key: None,
            fields,
        };
        Ok(self.insert(draft))
    }

    /// Applies only the fields sent. A time nudge moves eventSeconds but never rewrites
    /// lookbackApplied — that records what happened at the keypress (§7.3).
    pub fn update(&mut self, id: &str, fields: IncidentFields) -> AppResult<Incident> {
        fields.validate()?;
        let before = self.get(id)?;
        let mut incident = before.clone();
        let previous_lap = lap_from_replay_reference(&incident.replay_reference);
        fields.apply_to(&mut incident);
        // reviewedBy is never typed: it names whoever last changed the incident. A save that
        // changes nothing (an inspector opening, a merged incident being read) stamps nobody,
        // so another steward's review survives someone else looking at it.
        incident.reviewed_by = before.reviewed_by.clone();
        if incident == before {
            return Ok(before);
        }
        let steward = self.store.config.steward_name.trim();
        if !steward.is_empty() {
            incident.reviewed_by = Some(steward.to_string());
        }
        let lap = incident.cars.first().and_then(|c| c.lap_at_incident).unwrap_or(previous_lap);
        incident.replay_reference = build_replay_reference(self.session.session_type, incident.event_seconds, lap);
        incident.updated_at = UtcTime::now().iso();
        self.store.save(incident.clone());
        self.changed();
        Ok(incident)
    }

    /// Folds ≥2 incidents into one primary. Children stay stored (audit trail) with
    /// mergedIntoId set; the primary gains their cars. Status/decision are untouched.
    pub fn merge(&mut self, input: MergeInput) -> AppResult<Incident> {
        input.validate()?;
        let incidents = input.incident_ids.iter().map(|id| self.get(id)).collect::<AppResult<Vec<_>>>()?;
        if let Some(child) = incidents.iter().find(|i| i.merged_into_id.is_some()) {
            return Err(AppError::invalid(format!(
                "Incident #{} is already merged into another incident. To expand a merge group, \
                 include the primary incident and the new incidents together",
                child.sequence_number
            )));
        }
        let mut primary = select_primary(&incidents, input.primary_id.as_deref())
            .cloned()
            .ok_or_else(|| AppError::invalid("primaryId not found"))?;
        let children: Vec<&Incident> = incidents.iter().filter(|i| i.id != primary.id).collect();
        let now = UtcTime::now().iso();
        let with_primary_first: Vec<&Incident> = std::iter::once(&primary).chain(children.iter().copied()).collect();
        let cars = merge_cars(&with_primary_first);
        primary.cars = cars;
        primary.merged_from_ids.extend(children.iter().map(|c| c.id.clone()));
        primary.updated_at = now.clone();
        for child in children {
            self.store.save(Incident {
                merged_into_id: Some(primary.id.clone()),
                updated_at: now.clone(),
                ..child.clone()
            });
        }
        self.store.save(primary.clone());
        self.changed();
        Ok(primary)
    }

    pub fn remove(&mut self, id: &str) -> AppResult<()> {
        if !self.store.delete(id) {
            return Err(AppError::not_found(format!("Incident {id} not found")));
        }
        self.changed();
        Ok(())
    }

    pub(crate) fn insert(&mut self, draft: Draft) -> Incident {
        let lap = draft.cars.first().and_then(|c| c.lap_at_incident).unwrap_or_else(|| self.leader_lap());
        let now = UtcTime::now().iso();
        let Draft { fields, .. } = &draft;
        let incident = Incident {
            id: uuid::Uuid::new_v4().to_string(),
            sequence_number: self.store.next_sequence(),
            source: draft.source,
            merged_into_id: None,
            merged_from_ids: Vec::new(),
            lmu_key: draft.lmu_key.clone(),
            event_seconds: draft.event_seconds,
            logged_at_seconds: draft.logged_at_seconds,
            lookback_applied: (draft.logged_at_seconds - draft.event_seconds).max(0.0),
            wall_clock: now.clone(),
            replay_reference: build_replay_reference(self.session.session_type, draft.event_seconds, lap),
            cars: draft.cars.clone(),
            kind: draft.kind,
            status: fields.status.unwrap_or(IncidentStatus::Noted),
            summary: fields.summary.clone().unwrap_or_default(),
            steward_notes: fields.steward_notes.clone().unwrap_or_default(),
            decision: fields.decision.clone().unwrap_or_default(),
            penalty: fields.penalty.clone().flatten(),
            rules: fields.rules.clone().unwrap_or_default(),
            logged_by: draft.logged_by.clone(),
            reviewed_by: fields.reviewed_by.clone().flatten(),
            created_at: now.clone(),
            updated_at: now,
        };
        self.store.save(incident.clone());
        self.changed();
        incident
    }

    /// No involved car → the race leader's lap.
    fn leader_lap(&self) -> i64 {
        self.standings.first().map_or(0, |s| s.laps_completed)
    }
}

#[cfg(test)]
#[path = "service_tests.rs"]
mod tests;
