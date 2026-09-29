//! The penalty sheet: one row per penalised car, for whoever corrects the race results.
//! Public, like the drivers file: no steward notes, no penalty notes.

use super::incident_csv::{lap_field, rules_field};
use crate::domain::{wire_name, Incident};
use crate::text::{decode_entities, format_hms};

pub(super) const PENALTY_HEADER: [&str; 12] = [
    "Incident #",
    "Session Time",
    "Lap",
    "Car",
    "Car Class",
    "Driver",
    "Penalty",
    "Seconds",
    "Served",
    "Rules",
    "Decision",
    "Status",
];

/// Incidents with a penalty, in incident order. The penalised car's class, driver and lap
/// come from the incident's own cars (the penalty names only the car number).
pub(super) fn penalty_rows(active: &[Incident]) -> Vec<Vec<String>> {
    let mut penalised: Vec<&Incident> = active.iter().filter(|i| i.penalty.is_some()).collect();
    penalised.sort_by_key(|i| i.sequence_number);
    penalised.into_iter().filter_map(penalty_row).collect()
}

fn penalty_row(i: &Incident) -> Option<Vec<String>> {
    let penalty = i.penalty.as_ref()?;
    let car = i.cars.iter().find(|c| c.car_number == penalty.applied_to);
    let lap = car.and_then(|c| c.lap_at_incident).map_or_else(|| lap_field(i), |lap| lap.to_string());
    Some(vec![
        i.sequence_number.to_string(),
        format_hms(i.event_seconds),
        lap,
        penalty.applied_to.clone(),
        car.map(|c| c.car_class.clone()).unwrap_or_default(),
        car.map(|c| c.driver_name.clone()).unwrap_or_default(),
        wire_name(&penalty.kind),
        penalty.seconds.map(|s| s.to_string()).unwrap_or_default(),
        if penalty.served { "Yes" } else { "No" }.to_string(),
        rules_field(i),
        decode_entities(&i.decision),
        wire_name(&i.status),
    ])
}

#[cfg(test)]
#[path = "penalty_csv_tests.rs"]
mod tests;
