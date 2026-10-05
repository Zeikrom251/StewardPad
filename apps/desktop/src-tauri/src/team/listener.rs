//! The live-events listener: one thread while this PC is linked and signed in. It reads the
//! league's copy of the session first, then follows its live events, reconnecting with the last
//! revision it applied so nothing is missed (the API ends each connection after 10 minutes).

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, RecvTimeoutError};
use std::sync::Arc;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};

use super::Connection;
use crate::api::events::{EventStream, Line};
use crate::api::ApiError;
use crate::app::{emit_incidents, emit_live, emit_team, AppState};

const FIRST_RETRY: Duration = Duration::from_secs(1);
const LONGEST_RETRY: Duration = Duration::from_secs(30);
/// The API pings every 20 s: this long without a byte, the connection is dead.
const SILENCE: Duration = Duration::from_secs(50);
const HOLD: Duration = Duration::from_secs(5 * 60);

pub(super) fn run(app: AppHandle, stop: Arc<AtomicBool>) {
    let mut retry = FIRST_RETRY;
    let mut fresh = true;
    while !stop.load(Ordering::Relaxed) {
        let loaded = if fresh { super::leagues::load(&app).map(|()| fresh = false) } else { Ok(()) };
        let Err(error) = loaded.and_then(|()| listen(&app, &stop)) else {
            // The API ended the connection (it does every 10 minutes): reconnect at once.
            retry = FIRST_RETRY;
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

fn sleep_unless_stopped(stop: &AtomicBool, pause: Duration) {
    let until = Instant::now() + pause;
    while Instant::now() < until && !stop.load(Ordering::Relaxed) {
        std::thread::sleep(Duration::from_millis(250));
    }
}

/// One connection, until the API ends it, it goes silent, or the engine stops.
fn listen(app: &AppHandle, stop: &AtomicBool) -> Result<(), ApiError> {
    let state = app.state::<AppState>();
    let (path, revision) = {
        let core = state.lock();
        let Some(link) = core.link() else { return Ok(()) };
        (format!("/leagues/{}/events", link.league_id), link.revision.clone())
    };
    let body = state.api.open_events(&path, Some(&revision))?;
    // The blocking reads run on their own thread, so a dead connection can be walked away from.
    let (lines, incoming) = channel();
    std::thread::spawn(move || {
        let mut stream = EventStream::new(body);
        while let Ok(Some(line)) = stream.next_line() {
            if lines.send(line).is_err() {
                return;
            }
        }
    });
    let mut heard = Instant::now();
    while !stop.load(Ordering::Relaxed) {
        match incoming.recv_timeout(Duration::from_secs(1)) {
            Ok(Line::Event(event)) => {
                heard = Instant::now();
                apply(app, &event);
            }
            Ok(Line::Heartbeat) => heard = Instant::now(),
            Err(RecvTimeoutError::Timeout) if heard.elapsed() < SILENCE => {}
            Err(RecvTimeoutError::Timeout) => return Err(ApiError::Unreachable("the live events went silent".into())),
            Err(RecvTimeoutError::Disconnected) => return Ok(()),
        }
    }
    Ok(())
}

fn apply(app: &AppHandle, event: &crate::api::events::SseEvent) {
    let state = app.state::<AppState>();
    let mut core = state.lock();
    let changed = core.on_live_event(event);
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
