//! Per-tick state advance for one simulated car: lap progress, pit stops, sectors.

use super::rng::Rng;
use super::roster::RosterEntry;

pub struct CarState {
    pub slot_id: i64,
    pub entry: RosterEntry,
    pub laps_completed: i64,
    pub lap_progress_seconds: f64,
    pub last_lap_seconds: Option<f64>,
    pub best_lap_seconds: Option<f64>,
    pub sectors: [Option<f64>; 3],
    pub top_speed_kph: f64,
    pub in_pit: bool,
    pub pit_stops: i64,
    pit_seconds_remaining: f64,
}

const PIT_STOP_CHANCE_PER_TICK: f64 = 0.0015;
const PIT_DURATION_SECONDS: f64 = 28.0;

impl CarState {
    pub fn new(entry: RosterEntry, start_offset_seconds: f64, slot_id: i64) -> Self {
        Self {
            slot_id,
            top_speed_kph: entry.base_top_speed_kph,
            entry,
            laps_completed: 0,
            lap_progress_seconds: start_offset_seconds,
            last_lap_seconds: None,
            best_lap_seconds: None,
            sectors: [None; 3],
            in_pit: false,
            pit_stops: 0,
            pit_seconds_remaining: 0.0,
        }
    }

    pub fn advance(&mut self, delta_seconds: f64, rng: &mut Rng) {
        if self.in_pit {
            self.pit_seconds_remaining -= delta_seconds;
            self.in_pit = self.pit_seconds_remaining > 0.0;
            return;
        }
        if rng.chance(PIT_STOP_CHANCE_PER_TICK) {
            self.in_pit = true;
            self.pit_stops += 1;
            self.pit_seconds_remaining = PIT_DURATION_SECONDS;
            return;
        }
        self.lap_progress_seconds += delta_seconds;
        self.top_speed_kph = jitter(self.entry.base_top_speed_kph, 8.0, rng);
        if self.lap_progress_seconds >= self.entry.base_lap_seconds {
            self.complete_lap(rng);
        }
    }

    /// Laps completed plus the fraction of the current one — the sort key for positions.
    pub fn race_progress(&self) -> f64 {
        self.laps_completed as f64 + self.lap_progress_seconds / self.entry.base_lap_seconds
    }

    fn complete_lap(&mut self, rng: &mut Rng) {
        let lap_time = jitter(self.entry.base_lap_seconds, 2.5, rng);
        self.lap_progress_seconds -= self.entry.base_lap_seconds;
        self.laps_completed += 1;
        self.last_lap_seconds = Some(lap_time);
        self.best_lap_seconds = Some(self.best_lap_seconds.map_or(lap_time, |best| best.min(lap_time)));
        let s1 = round2(lap_time * 0.33);
        let s2 = round2(lap_time * 0.34);
        self.sectors = [Some(s1), Some(s2), Some(round2(lap_time - s1 - s2))];
    }
}

fn jitter(base: f64, spread: f64, rng: &mut Rng) -> f64 {
    round2(base + (rng.next_f64() - 0.5) * 2.0 * spread)
}

pub fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}
