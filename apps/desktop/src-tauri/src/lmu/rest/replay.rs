//! Moves the game's open replay to a time on the session clock (an incident's eventSeconds,
//! which for a contact is LMU's own `et`), then points its camera at a car's slot. The routes
//! come from the game's schema (scripts/output/swagger-schema.json) and `isReplayActive` from a
//! live capture. Still to be confirmed against the running game: that replaytime/{time} takes
//! seconds on that clock, and that focus/{slotid} takes the standings' slotID in a replay.

use std::time::Duration;

use serde_json::Value;

use super::parse::parse_game_state;
use crate::error::{AppError, AppResult, ErrorKind};

const GAME_STATE_PATH: &str = "/rest/sessions/GetGameState";
const TIMEOUT: Duration = Duration::from_secs(3);

/// Seeks only an open replay: a seek in the live session is never sent. The camera moves
/// after the replay, so a refused camera still leaves the replay at the right time.
pub fn seek(base_url: &str, seconds: f64, slot: Option<i64>) -> AppResult<()> {
    let agent: ureq::Agent = ureq::Agent::config_builder().timeout_global(Some(TIMEOUT)).build().into();
    let state = get_json(&agent, &format!("{base_url}{GAME_STATE_PATH}"))?;
    match parse_game_state(&state) {
        Some(state) if state.is_replay_active => {}
        Some(_) => return Err(AppError::invalid("Open the replay in Le Mans Ultimate first")),
        None => return Err(AppError::new(ErrorKind::Io, "Le Mans Ultimate sent a game state StewardPad can't read")),
    }
    agent.put(format!("{base_url}{}", replay_time_path(seconds))).send_empty().map_err(not_done)?;
    let Some(slot) = slot else { return Ok(()) };
    agent.put(format!("{base_url}/rest/watch/focus/{slot}")).send_empty().map_err(|error| {
        let error = not_done(error);
        AppError::new(error.kind, format!("The replay moved, but the camera didn't: {}", error.message))
    })?;
    Ok(())
}

/// Milliseconds are plenty, and keep 0.1 + 0.2 from reaching the game as 0.30000000000000004.
pub fn replay_time_path(seconds: f64) -> String {
    let rounded = (seconds.max(0.0) * 1000.0).round() / 1000.0;
    format!("/rest/watch/replaytime/{rounded}")
}

fn get_json(agent: &ureq::Agent, url: &str) -> AppResult<Value> {
    let mut response = agent.get(url).call().map_err(not_done)?;
    let body = response.body_mut().read_to_string().map_err(not_done)?;
    serde_json::from_str(&body).map_err(|e| AppError::io("Le Mans Ultimate sent invalid JSON", e))
}

fn not_done(error: ureq::Error) -> AppError {
    match error {
        ureq::Error::StatusCode(status) => {
            AppError::new(ErrorKind::Refused, format!("Le Mans Ultimate refused it (HTTP {status})"))
        }
        _ => AppError::new(ErrorKind::Offline, "Le Mans Ultimate isn't reachable on this PC"),
    }
}

#[cfg(test)]
#[path = "replay_tests.rs"]
mod tests;
