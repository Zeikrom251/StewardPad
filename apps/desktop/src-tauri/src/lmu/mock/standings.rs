//! Ordered StandingEntry list derived from the simulated cars.

use std::collections::HashMap;

use super::physics::CarState;
use crate::domain::StandingEntry;

pub fn build_standings(cars: &[CarState]) -> Vec<StandingEntry> {
    let mut ranked: Vec<&CarState> = cars.iter().collect();
    ranked.sort_by(|a, b| b.race_progress().total_cmp(&a.race_progress()));
    let Some(&leader) = ranked.first() else { return Vec::new() };
    let mut class_positions: HashMap<&str, i64> = HashMap::new();
    ranked
        .iter()
        .enumerate()
        .map(|(index, car)| {
            let in_class = class_positions.entry(car.entry.car_class).or_insert(0);
            *in_class += 1;
            to_standing(car, index as i64 + 1, *in_class, leader)
        })
        .collect()
}

fn to_standing(car: &CarState, position: i64, position_in_class: i64, leader: &CarState) -> StandingEntry {
    StandingEntry {
        slot_id: car.slot_id,
        position,
        position_in_class,
        car_number: car.entry.car_number.to_string(),
        driver_name: car.entry.driver_name.clone(),
        team_name: car.entry.team_name.to_string(),
        car_class: car.entry.car_class.to_string(),
        laps_completed: car.laps_completed,
        gap_to_leader: format_gap(car, leader),
        last_lap_seconds: car.last_lap_seconds,
        best_lap_seconds: car.best_lap_seconds,
        sector1: car.sectors[0],
        sector2: car.sectors[1],
        sector3: car.sectors[2],
        top_speed_kph: Some((car.top_speed_kph * 10.0).round() / 10.0),
        in_pit: car.in_pit,
        pit_stops: car.pit_stops,
    }
}

fn format_gap(car: &CarState, leader: &CarState) -> String {
    if car.slot_id == leader.slot_id {
        return "Leader".to_string();
    }
    let lap_diff = leader.laps_completed - car.laps_completed;
    if lap_diff >= 1 {
        return format!("+{lap_diff} LAP{}", if lap_diff > 1 { "S" } else { "" });
    }
    let average_lap = (leader.entry.base_lap_seconds + car.entry.base_lap_seconds) / 2.0;
    format!("+{:.3}", (leader.race_progress() - car.race_progress()) * average_lap)
}
