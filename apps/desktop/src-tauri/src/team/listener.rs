//! The live-events listener: one thread while this PC is linked and signed in. It reads the
//! league's copy of the session first, then follows its live events, reconnecting with the last
//! revision it applied so nothing is missed (the API ends each connection after 10 minutes).

use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver, RecvTimeoutError};
use std::sync::Arc;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};

use super::Connection;
use crate::api::events::{EventStream, Line};
use crate::api::ApiError;
use crate::app::{emit_incidents, emit_live, emit_team, AppState};

const FIRST_RETRY: Duration = Duration::from_secs(1);
const LONGEST_RETRY: Duration = Duration::from_secs(30);
/// A connection that ended sooner was closed at once (a proxy, a refusal in disguise).
const MIN_CONNECTION: Duration = Duration::from_secs(10);
/// The API pings every 20 s: this long without a byte, the connection is dead.
const SILENCE: Duration = Duration::from_secs(50);
const HOLD: Duration = Duration::from_secs(5 * 60);

/// Follows the league this PC is in when it starts; the engine starts another for the next.
pub(super) fn run(app: AppHandle, stop: Arc<AtomicBool>) {
    let Some(league_id) = app.state::<AppState>().lock().link().map(|link| link.league_id.clone()) else { return };
    let mut retry = FIRST_RETRY;
    let mut fresh = true;
    while !stop.load(Ordering::Relaxed) {
        let started = Instant::now();
        let loaded = if fresh { super::leagues::load(&app, &league_id).map(|()| fresh = false) } else { Ok(()) };
        let Err(error) = loaded.and_then(|()| listen(&app, &league_id, &stop)) else {
            if app.state::<AppState>().lock().link().is_none_or(|link| link.league_id != league_id) {
                return;
            }
            let pause;
            (pause, retry) = after_connection(started.elapsed(), retry);
            sleep_unless_stopped(&stop, pause);
            continue;
        };
        // A revision the API doesn't know: read the whole session again.
        fresh = fresh || error.status() == Some(400);
        let Some(pause) = failed(&app, &error) else { return };
        sleep_unless_stopped(&stop, pause.max(retry));
        retry = (retry * 2).min(LONGEST_RETRY);
    }
}

/// What a failure means for the engine: a pause before trying again, or None to stop.
fn failed(app: &AppHandle, error: &ApiError) -> Option<Duration> {
    let state = app.state::<AppState>();
    if error.is_signed_out() {
        crate::account::service::expire(app);
        return None;
    }
    let mut core = state.lock();
    let pause = match (error.status(), error.code()) {
        (Some(403), Some("LEAGUE_INACTIVE")) => {
            core.team.connection = Connection::Inactive;
            HOLD
        }
        // Only the league's own endpoints answer 404 here (a deleted session is load's to handle).
        (Some(404), _) => {
            drop(core);
            super::leagues::left(app, "You're no longer in this league");
            return None;
        }
        _ => {
            core.team.connection = Connection::Offline;
            Duration::ZERO
        }
    };
    emit_team(app, &core);
    Some(pause)
}

/// The API ends a connection every 10 minutes: reconnect at once. One that ended at once
/// would otherwise reconnect in a tight loop: wait, longer each time.
fn after_connection(lasted: Duration, retry: Duration) -> (Duration, Duration) {
    if lasted >= MIN_CONNECTION {
        (Duration::ZERO, FIRST_RETRY)
    } else {
        (retry, (retry * 2).min(LONGEST_RETRY))
    }
}

fn sleep_unless_stopped(stop: &AtomicBool, pause: Duration) {
    let until = Instant::now() + pause;
    while Instant::now() < until && !stop.load(Ordering::Relaxed) {
        std::thread::sleep(Duration::from_millis(250));
    }
}

/// One connection, until the API ends it, it goes silent, or the engine stops.
fn listen(app: &AppHandle, league_id: &str, stop: &AtomicBool) -> Result<(), ApiError> {
    let state = app.state::<AppState>();
    let revision = match state.lock().link() {
        Some(link) if link.league_id == league_id => link.revision.clone(),
        _ => return Ok(()),
    };
    let body = state.api.open_events(&format!("/leagues/{league_id}/events"), Some(&revision))?;
    let incoming = read_in_background(body);
    let mut heard = Instant::now();
    while !stop.load(Ordering::Relaxed) {
        match incoming.recv_timeout(Duration::from_secs(1)) {
            Ok(Line::Event(event)) => {
                heard = Instant::now();
                apply(app, league_id, &event);
            }
            Ok(Line::Heartbeat) => heard = Instant::now(),
            Err(RecvTimeoutError::Timeout) if heard.elapsed() < SILENCE => {}
            Err(RecvTimeoutError::Timeout) => return Err(ApiError::Unreachable("the live events went silent".into())),
            Err(RecvTimeoutError::Disconnected) => return Ok(()),
        }
    }
    Ok(())
}

/// The blocking reads run on their own thread, so a dead connection can be walked away from.
/// Its read then blocks until the events timeout (11 minutes): ureq has no per-read timeout,
/// so each silent reconnect can leave one idle thread behind for that long, no more.
fn read_in_background(body: impl Read + Send + 'static) -> Receiver<Line> {
    let (lines, incoming) = channel();
    std::thread::spawn(move || {
        let mut stream = EventStream::new(body);
        loop {
            match stream.next_line() {
                Ok(Some(line)) => {
                    if lines.send(line).is_err() {
                        return;
                    }
                }
                Ok(None) => return,
                Err(error) => return eprintln!("[sync] The live events connection broke: {error}"),
            }
        }
    });
    incoming
}

fn apply(app: &AppHandle, league_id: &str, event: &crate::api::events::SseEvent) {
    let state = app.state::<AppState>();
    let mut core = state.lock();
    let changed = core.on_live_event(league_id, event);
    if changed.incidents {
        emit_incidents(app, &core);
    }
    if changed.live {
        emit_live(app, &core);
    }
    if changed.team {
        emit_team(app, &core);
    }
    drop(core);
    if changed.left {
        super::leagues::left(app, "You were removed from this league");
    } else if changed.roster {
        super::leagues::refresh_roster(app);
    }
}

#[cfg(test)]
#[path = "listener_tests.rs"]
mod tests;
