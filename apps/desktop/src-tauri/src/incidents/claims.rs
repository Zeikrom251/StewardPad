//! Claiming an incident: the stewards on it, in the order they joined. A claim adds the steward
//! (Settings → Your name, or the account in a league), and so does any edit (service.rs); each
//! steward removes only their own claim. In a league, the claim is queued like any change.

use crate::core::Core;
use crate::domain::Incident;
use crate::error::{AppError, AppResult};
use crate::text::UtcTime;

/// Adds or removes `name`, keeping everyone else's place in the list.
pub(crate) fn mark(reviewers: &mut Vec<String>, name: &str, claimed: bool) {
    if claimed && !reviewers.iter().any(|n| n == name) {
        reviewers.push(name.to_string());
    } else if !claimed {
        reviewers.retain(|n| n != name);
    }
}

impl Core {
    pub fn claim(&mut self, id: &str) -> AppResult<Incident> {
        self.set_claim(id, true)
    }

    pub fn unclaim(&mut self, id: &str) -> AppResult<Incident> {
        self.set_claim(id, false)
    }

    fn set_claim(&mut self, id: &str, claimed: bool) -> AppResult<Incident> {
        self.check_team_write(None)?;
        let name = self.steward_name();
        if name.is_empty() {
            return Err(AppError::invalid("Set your name in Settings first: a claim is signed with it"));
        }
        let mut incident = self.get(id)?;
        if incident.reviewers.contains(&name) == claimed {
            return Ok(incident);
        }
        mark(&mut incident.reviewers, &name, claimed);
        incident.updated_at = UtcTime::now().iso();
        self.store.save(incident.clone());
        self.record_claim(id, claimed);
        self.changed();
        Ok(incident)
    }

    /// An edit claims the incident for whoever made it (no name in Settings: nobody).
    pub(super) fn join_reviewers(&self, incident: &mut Incident) {
        let name = self.steward_name();
        if !name.is_empty() {
            mark(&mut incident.reviewers, &name, true);
        }
    }
}

#[cfg(test)]
#[path = "claims_tests.rs"]
mod tests;
