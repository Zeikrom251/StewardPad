//! Starts and stops the team threads (the outbox sender and the live-events listener) so they
//! run exactly while this PC is signed in and linked to a league session.
//! Lock order: the engine, then the core — never the other way round.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::channel;
use std::sync::{Arc, PoisonError};

use tauri::{AppHandle, Manager};

use super::{listener, sender, Connection, TeamLive};
use crate::app::{emit_live, emit_team, AppState};
use crate::core::Core;

#[derive(Default)]
pub struct Engine {
    stop: Option<Arc<AtomicBool>>,
}

/// Call after anything that changes the account or the link.
pub fn reconcile(app: &AppHandle) {
    let state = app.state::<AppState>();
    let mut engine = state.engine.lock().unwrap_or_else(PoisonError::into_inner);
    let mut core = state.lock();
    drop_foreign_link(&mut core);
    let wanted = state.api.has_token() && core.account.has_session() && core.link().is_some();
    match (engine.stop.is_some(), wanted) {
        (false, true) => engine.stop = Some(start(app, &mut core)),
        (true, false) => stop(app, &mut engine, &mut core),
        _ => {}
    }
    emit_team(app, &core);
}

/// Another session or league: the threads start over from its snapshot.
pub fn restart(app: &AppHandle) {
    {
        let state = app.state::<AppState>();
        let mut engine = state.engine.lock().unwrap_or_else(PoisonError::into_inner);
        stop(app, &mut engine, &mut state.lock());
    }
    reconcile(app);
}

fn start(app: &AppHandle, core: &mut Core) -> Arc<AtomicBool> {
    let stop = Arc::new(AtomicBool::new(false));
    let (wake, woken) = channel();
    core.team.wake = Some(wake);
    core.team.connection = Connection::Connecting;
    let (for_sender, for_listener) = (app.clone(), app.clone());
    let (stop_sender, stop_listener) = (stop.clone(), stop.clone());
    spawn("team-sender", move || sender::run(for_sender, stop_sender, woken));
    spawn("team-events", move || listener::run(for_listener, stop_listener));
    stop
}

fn stop(app: &AppHandle, engine: &mut Engine, core: &mut Core) {
    if let Some(stop) = engine.stop.take() {
        stop.store(true, Ordering::Relaxed);
    }
    // A teammate's timing may be the clock here. `watching` can't tell any more: the link may
    // already point at the next session.
    if core.team.remote.is_some() && core.team.streaming.is_none() {
        core.forget_remote_timing();
        emit_live(app, core);
    }
    if let Some(streaming) = core.team.streaming.take() {
        end_stream(app, streaming.stream_id);
    }
    // Drops the wake and frames channels: the sender and the uploader end with them. A notice
    // (why the link went) outlives the engine.
    let notice = core.team.notice.take();
    core.team = TeamLive { notice, ..TeamLive::default() };
}

/// This PC streamed: the league hears now that the stream ended, not 30 s later when the API
/// gives up on it. Signed out already, it can't: the API's timeout ends it then.
fn end_stream(app: &AppHandle, stream_id: String) {
    let app = app.clone();
    spawn("stream-end", move || {
        let path = format!("/streams/{stream_id}");
        if let Err(error) = app.state::<AppState>().api.delete::<()>(&path) {
            eprintln!("[stream] The stream will end when the API stops hearing it ({:?})", error.status());
        }
    });
}

fn spawn(name: &str, work: impl FnOnce() + Send + 'static) {
    if let Err(error) = std::thread::Builder::new().name(name.into()).spawn(work) {
        eprintln!("[sync] Could not start {name}: {error}");
    }
}

/// Another steward signed in on this PC: the previous one's league link isn't theirs. The
/// incidents stay; the link (and what it hadn't sent) goes.
fn drop_foreign_link(core: &mut Core) {
    let foreign = match (&core.account.me, core.link()) {
        (Some(me), Some(link)) => link.user_id != me.id,
        _ => false,
    };
    if foreign {
        let unsent = core.store.team.take().map_or(0, |link| link.outbox.len());
        core.team.notice = Some(match unsent {
            0 => "You're signed in as someone else: pick a league".into(),
            n => format!(
                "You're signed in as someone else: the previous account's {n} unsent changes stay on this PC only"
            ),
        });
        core.changed();
    }
}
