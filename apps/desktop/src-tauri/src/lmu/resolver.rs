//! Raw LMU incidents feed → resolved collision events. Shared by the REST and mock
//! adapters so there is exactly one place this can be wrong. Raw fields (`player`,
//! `contactWith`, `et`) and the "Immovable" sentinel are confirmed against a live
//! 46-entry capture (tests/fixtures/live-incidents.json) — nothing else is assumed.

use serde::Deserialize;

use crate::domain::{IncidentType, StandingEntry};

#[derive(Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RawLmuContact {
    pub player: String,
    pub contact_with: String,
    pub et: f64,
}

#[derive(Clone, PartialEq, Debug)]
pub struct CollisionCar {
    /// The join key. carNumber/driverName are display-only — never re-looked-up by.
    pub slot_id: i64,
    pub car_number: String,
    pub driver_name: String,
    pub car_class: String,
}

#[derive(Clone, PartialEq, Debug)]
pub struct LmuCollision {
    /// Order-normalized so the same real-world contact keys identically every poll.
    pub key: String,
    pub et: f64,
    /// CONTACT (two cars) or OFF_TRACK (one car).
    pub kind: IncidentType,
    pub cars: Vec<CollisionCar>,
    /// Raw `contactWith` text when it named neither a known driver nor "Immovable".
    pub unresolved_other: Option<String>,
}

const IMMOVABLE: &str = "Immovable";

// LMU reports each collision from both cars' perspective, `et` differing by a few
// hundredths (observed max 0.07s; the next nearest reciprocal-looking candidate was
// 0.23s away), so 0.1s catches every real duplicate without merging separate contacts.
const PAIR_TOLERANCE_SECONDS: f64 = 0.1;

/// Resolves the full (cumulative) raw list against the current grid. Idempotent: the
/// same input gives every collision the same key, so callers dedupe across polls by key.
pub fn resolve_collisions(
    raw: &[RawLmuContact],
    standings: &[StandingEntry],
    on_unresolved_player: &mut dyn FnMut(&str),
) -> Vec<LmuCollision> {
    let mut collisions = Vec::new();
    for (leader, et) in pair_contacts(raw) {
        let Some(primary) = find_car(&leader.player, standings) else {
            on_unresolved_player(&leader.player);
            continue;
        };
        collisions.push(build_collision(&leader.contact_with, primary, et, standings));
    }
    collisions
}

/// Merges each contact's reciprocal row into one, keeping the earlier `et`.
fn pair_contacts(raw: &[RawLmuContact]) -> Vec<(&RawLmuContact, f64)> {
    let mut used = vec![false; raw.len()];
    let mut pairs = Vec::new();
    for (i, a) in raw.iter().enumerate() {
        if used[i] {
            continue;
        }
        used[i] = true;
        let et = match find_reciprocal(raw, a, i + 1, &mut used) {
            Some(b) => a.et.min(b.et),
            None => a.et,
        };
        pairs.push((a, et));
    }
    pairs
}

/// Closest unused reciprocal row within tolerance, marking it used if found.
fn find_reciprocal<'a>(
    raw: &'a [RawLmuContact],
    a: &RawLmuContact,
    from: usize,
    used: &mut [bool],
) -> Option<&'a RawLmuContact> {
    let mut best: Option<(usize, f64)> = None;
    for (j, b) in raw.iter().enumerate().skip(from) {
        if used[j] || b.player != a.contact_with || b.contact_with != a.player {
            continue;
        }
        let diff = (b.et - a.et).abs();
        if diff <= PAIR_TOLERANCE_SECONDS && best.is_none_or(|(_, d)| diff < d) {
            best = Some((j, diff));
        }
    }
    let (index, _) = best?;
    used[index] = true;
    Some(&raw[index])
}

// A name matching zero OR MORE THAN ONE slot can't be attributed to a single car —
// taking the first match would silently blame the wrong driver. Never guess.
fn find_car(driver_name: &str, standings: &[StandingEntry]) -> Option<CollisionCar> {
    let mut matches = standings.iter().filter(|s| s.driver_name == driver_name);
    let only = matches.next()?;
    if matches.next().is_some() {
        return None;
    }
    Some(CollisionCar {
        slot_id: only.slot_id,
        car_number: only.car_number.clone(),
        driver_name: only.driver_name.clone(),
        car_class: only.car_class.clone(),
    })
}

// Keyed on slotID, not names or numbers: either can be shared by two cars. Falls back
// to the raw contactWith text only when there's no resolved second car.
fn dedupe_key(primary: &CollisionCar, other: Option<&CollisionCar>, contact_with_raw: &str, et: f64) -> String {
    let other_key = other.map_or_else(|| contact_with_raw.to_string(), |o| o.slot_id.to_string());
    let mut parts = [primary.slot_id.to_string(), other_key];
    parts.sort();
    format!("{}@{}", parts.join("|"), (et * 100.0).round() as i64)
}

// A contactWith that's neither "Immovable" nor a car on the grid is a one-car incident,
// never a CONTACT with a fabricated second car; the raw text is kept for the steward.
fn build_collision(contact_with: &str, primary: CollisionCar, et: f64, standings: &[StandingEntry]) -> LmuCollision {
    let other = if contact_with == IMMOVABLE { None } else { find_car(contact_with, standings) };
    let key = dedupe_key(&primary, other.as_ref(), contact_with, et);
    match other {
        Some(other) => {
            LmuCollision { key, et, kind: IncidentType::Contact, cars: vec![primary, other], unresolved_other: None }
        }
        None => LmuCollision {
            key,
            et,
            kind: IncidentType::OffTrack,
            cars: vec![primary],
            unresolved_other: (contact_with != IMMOVABLE).then(|| contact_with.to_string()),
        },
    }
}

#[cfg(test)]
#[path = "resolver_tests.rs"]
mod tests;
