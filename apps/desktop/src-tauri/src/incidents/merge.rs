//! Merging duplicates: one primary keeps every car; the others stay stored as its audit trail.

use crate::api::wire::LeagueRole;
use crate::core::Core;
use crate::domain::Incident;
use crate::error::{AppError, AppResult};
use crate::text::UtcTime;

use super::input::MergeInput;
use super::rules::{merge_cars, select_primary};

impl Core {
    /// Folds ≥2 incidents into one primary. Children stay stored (audit trail) with
    /// mergedIntoId set; the primary gains their cars. Status/decision are untouched.
    pub fn merge(&mut self, input: MergeInput) -> AppResult<Incident> {
        input.validate()?;
        self.check_team_write(Some(LeagueRole::HeadSteward))?;
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
        let child_ids = children.iter().map(|c| c.id.clone()).collect();
        let now = UtcTime::now().iso();
        let with_primary_first: Vec<&Incident> = std::iter::once(&primary).chain(children.iter().copied()).collect();
        let cars = merge_cars(&with_primary_first);
        primary.cars = cars;
        primary.merged_from_ids.extend(children.iter().map(|c| c.id.clone()));
        self.join_reviewers(&mut primary);
        primary.updated_at = now.clone();
        for child in children {
            self.store.save(Incident {
                merged_into_id: Some(primary.id.clone()),
                updated_at: now.clone(),
                ..child.clone()
            });
        }
        self.store.save(primary.clone());
        self.record_merged(&primary.id, child_ids);
        self.changed();
        Ok(primary)
    }
}
