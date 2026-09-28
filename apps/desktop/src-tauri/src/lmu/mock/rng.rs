//! xorshift64* — the simulator only needs "random enough", not a crypto RNG crate.

use std::time::{SystemTime, UNIX_EPOCH};

pub struct Rng(u64);

impl Rng {
    pub fn from_clock() -> Self {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos() as u64).unwrap_or(0);
        Self::seeded(nanos)
    }

    pub fn seeded(seed: u64) -> Self {
        Rng(seed | 1) // xorshift must never be seeded with zero
    }

    /// Uniform in [0, 1) — the Math.random() the NestJS mock used.
    pub fn next_f64(&mut self) -> f64 {
        self.0 ^= self.0 >> 12;
        self.0 ^= self.0 << 25;
        self.0 ^= self.0 >> 27;
        let value = self.0.wrapping_mul(0x2545_F491_4F6C_DD1D);
        (value >> 11) as f64 / (1u64 << 53) as f64
    }

    pub fn chance(&mut self, probability: f64) -> bool {
        self.next_f64() < probability
    }

    pub fn index(&mut self, len: usize) -> usize {
        ((self.next_f64() * len as f64) as usize).min(len.saturating_sub(1))
    }
}
