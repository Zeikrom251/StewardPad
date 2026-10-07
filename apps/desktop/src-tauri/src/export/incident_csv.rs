//! Incident list → CSV rows. stewardNotes are in neither file: they're for the stewards
//! only and never leave the app (shared session files aside). The investigation is public.

use std::collections::HashMap;

use serde::Deserialize;

use super::csv::build_csv;
use super::penalty_csv::{penalty_rows, PENALTY_HEADER};
use crate::domain::{wire_name, Incident, InvolvedRole};
use crate::text::{decode_entities, format_hms, js_number};

#[derive(Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum CsvVariant {
    Full,
    Drivers,
    /// One row per penalised car (penalty_csv.rs): what the race results get corrected by.
    Penalties,
}

const FULL_HEADER: [&str; 24] = [
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
    "Caused By",
    "Affected",
    "Type",
    "Rules",
    "Status",
    "Investigation",
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

// Car Class lets a driver tell their own "#77" from the other class's "#77". The
// investigation and rules travel too: they're the published basis of the decision.
const DRIVERS_HEADER: [&str; 14] = [
    "#",
    "Session Time",
    "Lap",
    "Cars",
    "Car Class",
    "Drivers",
    "Caused By",
    "Affected",
    "Type",
    "Rules",
    "Investigation",
    "Decision",
    "Penalty",
    "Status",
];

/// `active` is already filtered to non-merged rows; `all` resolves "Merged From" ids to #numbers.
pub fn build_incident_csv(active: &[Incident], all: &[Incident], variant: CsvVariant, delimiter: char) -> String {
    let seq_by_id: HashMap<&str, u32> = all.iter().map(|i| (i.id.as_str(), i.sequence_number)).collect();
    let (header, rows): (&[&str], Vec<Vec<String>>) = match variant {
        CsvVariant::Full => (&FULL_HEADER, active.iter().map(|i| full_row(i, &seq_by_id)).collect()),
        CsvVariant::Drivers => (&DRIVERS_HEADER, active.iter().map(drivers_row).collect()),
        CsvVariant::Penalties => (&PENALTY_HEADER, penalty_rows(active)),
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

/// "#38 T. Lindqvist, #85 K. Sato": the cars the stewards gave `role`.
fn cars_with_role(incident: &Incident, role: InvolvedRole) -> String {
    let cars = incident.cars.iter().filter(|c| c.role == role);
    cars.map(|c| format!("#{} {}", c.car_number, c.driver_name)).collect::<Vec<_>>().join(", ")
}

/// "3.2 Causing a collision, 4.1 Blocking"
pub(super) fn rules_field(incident: &Incident) -> String {
    incident.rules.iter().map(|r| format!("{} {}", r.code, r.title)).collect::<Vec<_>>().join(", ")
}

pub(super) fn lap_field(incident: &Incident) -> String {
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
        cars_with_role(i, InvolvedRole::Caused),
        cars_with_role(i, InvolvedRole::Affected),
        wire_name(&i.kind),
        rules_field(i),
        wire_name(&i.status),
        decode_entities(&i.summary),
        decode_entities(&i.decision),
        penalty_field(i),
        i.logged_by.clone(),
        i.reviewers.join(", "),
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
        cars_with_role(i, InvolvedRole::Caused),
        cars_with_role(i, InvolvedRole::Affected),
        wire_name(&i.kind),
        rules_field(i),
        decode_entities(&i.summary),
        decode_entities(&i.decision),
        penalty_field(i),
        wire_name(&i.status),
    ]
}

#[cfg(test)]
#[path = "incident_csv_tests.rs"]
mod tests;
