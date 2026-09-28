//! The simulator — not throwaway. It's how the steward trains and how the UI is demoed
//! with LMU closed: 24 cars in 3 classes, laps ticking, gaps drifting, pit stops, and
//! occasional contacts fed through the exact same resolver as the real game.

mod physics;
mod rng;
mod roster;
mod standings;

use std::time::Duration;

use super::resolver::{resolve_collisions, RawLmuContact};
use super::{LmuEvent, LmuUpdate};
use crate::domain::{SessionInfo, SessionPhase, SessionType};
use physics::{round2, CarState};
use rng::Rng;

const TICK: Duration = Duration::from_secs(1);
// ponytail: fixed fictional track and RACE session; cycle session types/phases if demo variety matters.
const TRACK_NAME: &str = "Sebring International Raceway";
// Tuned for training only (prompt §3 excludes real collision detection): roughly one contact
// every ~4 minutes and one off-track every ~5, so the grid isn't a demolition derby.
const CONTACT_CHANCE_PER_TICK: f64 = 0.004;
const OFF_TRACK_CHANCE_PER_TICK: f64 = 0.0033;

struct Simulator {
    cars: Vec<CarState>,
    /// Cumulative, like the real endpoint — the resolver dedupes by key downstream.
    raw_contacts: Vec<RawLmuContact>,
    elapsed_seconds: f64,
    rng: Rng,
}

pub fn run(mut sink: impl FnMut(LmuEvent)) {
    let mut sim = Simulator::new(Rng::from_clock());
    loop {
        std::thread::sleep(TICK);
        sink(LmuEvent::Update(sim.tick()));
    }
}

impl Simulator {
    fn new(rng: Rng) -> Self {
        let cars = roster::build_roster()
            .into_iter()
            .enumerate()
            .map(|(i, entry)| CarState::new(entry, i as f64 * 0.4, i as i64 + 1))
            .collect();
        Self { cars, raw_contacts: Vec::new(), elapsed_seconds: 0.0, rng }
    }

    fn tick(&mut self) -> LmuUpdate {
        let delta = TICK.as_secs_f64();
        self.elapsed_seconds += delta;
        for car in &mut self.cars {
            car.advance(delta, &mut self.rng);
        }
        self.generate_contacts();
        let standings = standings::build_standings(&self.cars);
        let collisions = resolve_collisions(&self.raw_contacts, &standings, &mut |name| {
            eprintln!("[simulator] contact named \"{name}\" is not uniquely resolvable — skipping");
        });
        LmuUpdate { session: self.session(), standings, collisions }
    }

    fn generate_contacts(&mut self) {
        let et = round2(self.elapsed_seconds);
        let n = self.cars.len();
        if n >= 2 && self.rng.chance(CONTACT_CHANCE_PER_TICK) {
            let a = self.rng.index(n);
            let b = (a + 1 + self.rng.index(n - 1)) % n; // any car but `a`
            self.push_contact(a, self.cars[b].entry.driver_name.clone(), et);
        }
        if n >= 1 && self.rng.chance(OFF_TRACK_CHANCE_PER_TICK) {
            let a = self.rng.index(n);
            self.push_contact(a, "Immovable".to_string(), et);
        }
    }

    fn push_contact(&mut self, car: usize, contact_with: String, et: f64) {
        let player = self.cars[car].entry.driver_name.clone();
        self.raw_contacts.push(RawLmuContact { player, contact_with, et });
    }

    fn session(&self) -> SessionInfo {
        SessionInfo {
            connected: true,
            session_type: SessionType::Race,
            session_phase: SessionPhase::Green,
            elapsed_seconds: round2(self.elapsed_seconds),
            remaining_seconds: None,
            track_name: TRACK_NAME.to_string(),
            server_name: Some("Simulator".to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runs_a_24_car_grid_with_the_clock_counting_up() {
        let mut sim = Simulator::new(Rng::seeded(42));
        let update = (0..300).map(|_| sim.tick()).last().expect("ticked");
        assert_eq!(update.standings.len(), 24);
        assert_eq!(update.session.elapsed_seconds, 300.0);
        assert_eq!(update.standings[0].gap_to_leader, "Leader");
        let positions: Vec<i64> = update.standings.iter().map(|s| s.position).collect();
        assert_eq!(positions, (1..=24).collect::<Vec<_>>());
    }

    #[test]
    fn shares_car_number_77_across_two_classes_with_distinct_slots() {
        let sim = Simulator::new(Rng::seeded(1));
        let sevens: Vec<&CarState> = sim.cars.iter().filter(|c| c.entry.car_number == "77").collect();
        assert_eq!(sevens.len(), 2);
        assert_ne!(sevens[0].slot_id, sevens[1].slot_id);
        assert_ne!(sevens[0].entry.car_class, sevens[1].entry.car_class);
    }
}
