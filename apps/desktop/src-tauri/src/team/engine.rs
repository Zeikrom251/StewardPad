//! Starts and stops the team threads (the outbox sender and the live-events listener) so they
//! run exactly while this PC is signed in and linked to a league session.
//! Lock order: the engine, then the core — never the other way round.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::channel;
use std::sync::{Arc, PoisonError};

use tauri::{AppHandle, Manager};

use super::{listener, sender, Connection, TeamLive};
use crate::app::{emit_team, AppState};
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
        (true, false) => stop(&mut engine, &mut core),
        _ => {}
    }
    emit_team(app, &core);
}

/// Another session or league: the threads start over from its snapshot.
pub fn restart(app: &AppHandle) {
    {
        let state = app.state::<AppState>();
        let mut engine = state.engine.lock().unwrap_or_else(PoisonError::into_inner);
        stop(&mut engine, &mut state.lock());
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

fn stop(engine: &mut Engine, core: &mut Core) {
    if let Some(stop) = engine.stop.take() {
        stop.store(true, Ordering::Relaxed);
    }
    // Drops the wake and frames channels: the sender and the uploader end with them.
    core.team = TeamLive::default();
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
        core.store.team = None;
        core.team.notice = Some("You're signed in as someone else: pick a league".into());
        core.changed();
    }
}
