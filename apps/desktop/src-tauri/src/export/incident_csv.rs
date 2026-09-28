//! Incident list → CSV rows. The `drivers` variant never contains stewardNotes (prompt §7.7).

use std::collections::HashMap;

use serde::Deserialize;

use super::csv::build_csv;
use crate::domain::{wire_name, Incident};
use crate::text::{format_hms, js_number};

#[derive(Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum CsvVariant {
    Full,
    Drivers,
}

const FULL_HEADER: [&str; 22] = [
    "#",
    "Source",
    "Session Time",
    "Event Seconds",
    "Logged At Seconds",
    "Lookback Applied",
    "Lap",
    "Cars",
    "Car Class",
    "Drivers",
    "Type",
    "Status",
    "Summary",
    "Steward Notes",
    "Decision",
    "Penalty",
    "Logged By",
    "Reviewed By",
    "Wall Clock",
    "Created At",
    "Updated At",
    // Internal audit: which child incidents were folded into this row. Not in the drivers file.
    "Merged From",
];

// Car Class travels to the drivers file too, unlike stewardNotes: it is what lets a driver
// tell their own "#77" from the other class's "#77" — not internal deliberation.
const DRIVERS_HEADER: [&str; 10] =
    ["#", "Session Time", "Lap", "Cars", "Car Class", "Drivers", "Type", "Decision", "Penalty", "Status"];

/// `active` is already filtered to non-merged rows; `all` resolves "Merged From" ids to #numbers.
pub fn build_incident_csv(active: &[Incident], all: &[Incident], variant: CsvVariant, delimiter: char) -> String {
    let seq_by_id: HashMap<&str, u32> = all.iter().map(|i| (i.id.as_str(), i.sequence_number)).collect();
    let rows: Vec<Vec<String>> = active
        .iter()
        .map(|incident| match variant {
            CsvVariant::Full => full_row(incident, &seq_by_id),
            CsvVariant::Drivers => drivers_row(incident),
        })
        .collect();
    let header: &[&str] = match variant {
        CsvVariant::Full => &FULL_HEADER,
        CsvVariant::Drivers => &DRIVERS_HEADER,
    };
    build_csv(header, &rows, delimiter)
}

fn join_cars(incident: &Incident, field: impl Fn(&crate::domain::InvolvedCar) -> &str) -> String {
    incident.cars.iter().map(field).collect::<Vec<_>>().join(", ")
}

fn penalty_field(incident: &Incident) -> String {
    let Some(penalty) = &incident.penalty else { return String::new() };
    let seconds = penalty.seconds.map(|s| format!(" {s}s")).unwrap_or_default();
    format!("{}{seconds}", wire_name(&penalty.kind))
}

fn lap_field(incident: &Incident) -> String {
    incident.cars.first().and_then(|c| c.lap_at_incident).map(|lap| lap.to_string()).unwrap_or_default()
}

fn merged_from_field(incident: &Incident, seq_by_id: &HashMap<&str, u32>) -> String {
    incident
        .merged_from_ids
        .iter()
        .map(|id| seq_by_id.get(id.as_str()).map_or("#?".to_string(), |seq| format!("#{seq}")))
        .collect::<Vec<_>>()
        .join(", ")
}

fn full_row(i: &Incident, seq_by_id: &HashMap<&str, u32>) -> Vec<String> {
    vec![
        i.sequence_number.to_string(),
        wire_name(&i.source),
        format_hms(i.event_seconds),
        js_number(i.event_seconds),
        js_number(i.logged_at_seconds),
        js_number(i.lookback_applied),
        lap_field(i),
        join_cars(i, |c| &c.car_number),
        join_cars(i, |c| &c.car_class),
        join_cars(i, |c| &c.driver_name),
        wire_name(&i.kind),
        wire_name(&i.status),
        i.summary.clone(),
        i.steward_notes.clone(),
        i.decision.clone(),
        penalty_field(i),
        i.logged_by.clone(),
        i.reviewed_by.clone().unwrap_or_default(),
        i.wall_clock.clone(),
        i.created_at.clone(),
        i.updated_at.clone(),
        merged_from_field(i, seq_by_id),
    ]
}

fn drivers_row(i: &Incident) -> Vec<String> {
    vec![
        i.sequence_number.to_string(),
        format_hms(i.event_seconds),
        lap_field(i),
        join_cars(i, |c| &c.car_number),
        join_cars(i, |c| &c.car_class),
        join_cars(i, |c| &c.driver_name),
        wire_name(&i.kind),
        i.decision.clone(),
        penalty_field(i),
        wire_name(&i.status),
    ]
}

#[cfg(test)]
#[path = "incident_csv_tests.rs"]
mod tests;
