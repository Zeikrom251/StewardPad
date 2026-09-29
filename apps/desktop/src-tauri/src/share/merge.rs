//! Folds another steward's incidents into this store. Pure: no disk, no clock.
//!
//! The same incident on two PCs is recognised by its id (a file imported twice) or its LMU
//! contact key (every PC in the session ingests the same feed). When both copies differ:
//! an edit beats an untouched copy; if both stewards edited it, the newer edit wins and the
//! incident is reported as a conflict so someone checks it.

use std::collections::HashMap;

use crate::domain::Incident;
use crate::store::Store;

#[derive(Default, Debug, PartialEq)]
pub struct MergeOutcome {
    pub added: usize,
    pub updated: usize,
    pub unchanged: usize,
    /// Numbers (here) of incidents both stewards edited differently.
    pub conflicts: Vec<u32>,
    /// (their number, number here) for new incidents that took the next free number.
    pub renumbered: Vec<(u32, u32)>,
}

pub fn merge_into(store: &mut Store, theirs: Vec<Incident>) -> MergeOutcome {
    let mut theirs = theirs;
    theirs.sort_by_key(|i| i.sequence_number);
    // Their id → our id, built first so merge links (mergedIntoId/FromIds) survive the move.
    let ids: HashMap<String, String> = theirs
        .iter()
        .map(|t| (t.id.clone(), find_local(store, t).map_or_else(|| t.id.clone(), |l| l.id.clone())))
        .collect();
    let mut outcome = MergeOutcome::default();
    for incoming in theirs {
        let incoming = remap(incoming, &ids);
        if let Some(key) = &incoming.lmu_key {
            store.mark_lmu_key_seen(key); // the live feed must not re-create it here
        }
        match store.get(&incoming.id).cloned() {
            Some(local) => reconcile(store, &local, incoming, &mut outcome),
            None => add(store, incoming, &mut outcome),
        }
    }
    outcome
}

fn find_local<'a>(store: &'a Store, theirs: &Incident) -> Option<&'a Incident> {
    store.get(&theirs.id).or_else(|| {
        let key = theirs.lmu_key.as_deref()?;
        store.all().iter().find(|i| i.lmu_key.as_deref() == Some(key))
    })
}

fn local_id(ids: &HashMap<String, String>, id: &String) -> String {
    ids.get(id).cloned().unwrap_or_else(|| id.clone())
}

fn remap(mut incident: Incident, ids: &HashMap<String, String>) -> Incident {
    incident.id = local_id(ids, &incident.id);
    incident.merged_into_id = incident.merged_into_id.as_ref().map(|id| local_id(ids, id));
    incident.merged_from_ids = incident.merged_from_ids.iter().map(|id| local_id(ids, id)).collect();
    incident
}

/// Touched after creation: every edit, status click and merge moves updatedAt.
fn edited(incident: &Incident) -> bool {
    incident.updated_at != incident.created_at
}

/// Everything a steward decides, with each PC's own bookkeeping blanked out.
fn same_content(a: &Incident, b: &Incident) -> bool {
    let blank = |i: &Incident| Incident {
        sequence_number: 0,
        wall_clock: String::new(),
        replay_reference: String::new(),
        created_at: String::new(),
        updated_at: String::new(),
        ..i.clone()
    };
    blank(a) == blank(b)
}

fn reconcile(store: &mut Store, local: &Incident, theirs: Incident, outcome: &mut MergeOutcome) {
    if same_content(local, &theirs) {
        outcome.unchanged += 1;
        return;
    }
    if edited(local) && edited(&theirs) {
        outcome.conflicts.push(local.sequence_number);
    }
    // ISO-8601 UTC strings compare correctly as text.
    let take_theirs = edited(&theirs) && (!edited(local) || theirs.updated_at > local.updated_at);
    if !take_theirs {
        outcome.unchanged += 1;
        return;
    }
    outcome.updated += 1;
    store.save(Incident {
        sequence_number: local.sequence_number,
        created_at: local.created_at.clone(),
        wall_clock: local.wall_clock.clone(),
        ..theirs
    });
}

fn add(store: &mut Store, theirs: Incident, outcome: &mut MergeOutcome) {
    let number = store.next_sequence();
    if number != theirs.sequence_number {
        outcome.renumbered.push((theirs.sequence_number, number));
    }
    outcome.added += 1;
    store.save(Incident { sequence_number: number, ..theirs });
}

#[cfg(test)]
#[path = "merge_tests.rs"]
mod tests;
