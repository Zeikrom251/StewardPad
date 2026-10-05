//! Signing in and out, and the account's own pages (boards 02 to 03c, Settings → Account).
//! Every API call here runs without the core lock held.

use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::json;
use tauri::{AppHandle, Manager};

use super::pkce::{new_sign_in, pc_name, read_handoff};
use super::{browser, vault, AccountState, AccountView, PendingSignIn, Unconfirmed, SIGN_IN_LIFETIME};
use crate::api::wire::{DesktopSignIn, Me};
use crate::app::{emit_account, AppState};
use crate::error::{AppError, AppResult};
use crate::team::engine;

/// Startup: a saved token means a session; the API says whose, on its own thread.
pub fn restore(app: &AppHandle) {
    let state = app.state::<AppState>();
    let Some(token) = vault::load(state.api.host()) else { return };
    state.api.set_token(Some(token));
    state.lock().account.unconfirmed = Some(Unconfirmed::Checking);
    let app = app.clone();
    std::thread::spawn(move || {
        if let Err(error) = refresh(&app) {
            eprintln!("[account] {}", error.message);
        }
    });
}

/// Who this PC is signed in as, from the API (the subscription may have changed).
pub fn refresh(app: &AppHandle) -> AppResult<AccountView> {
    let state = app.state::<AppState>();
    match state.api.get::<Me>("/me") {
        Ok(me) => {
            let mut core = state.lock();
            core.account.me = Some(me);
            core.account.unconfirmed = None;
            emit_account(app, &core);
        }
        Err(error) if error.is_signed_out() => expire(app),
        Err(error) => {
            let mut core = state.lock();
            if core.account.me.is_none() {
                core.account.unconfirmed = Some(Unconfirmed::Offline);
            }
            emit_account(app, &core);
            drop(core);
            engine::reconcile(app);
            return Err(error.into());
        }
    }
    engine::reconcile(app);
    Ok(state.account_view())
}

/// Board 03: opens the website's sign-in page in the browser, bound to a fresh verifier.
pub fn start(app: &AppHandle) -> AccountView {
    let state = app.state::<AppState>();
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_millis());
    let request = new_sign_in(state.api.site(), pc_name().as_deref(), now);
    if let Err(error) = browser::open(&request.url) {
        eprintln!("[account] The browser didn't open ({error}): the page offers the link to copy");
    }
    let mut core = state.lock();
    core.account.pending = Some(PendingSignIn {
        verifier: request.verifier,
        state: request.state,
        url: request.url,
        started: std::time::Instant::now(),
    });
    emit_account(app, &core);
    core.account.view()
}

pub fn cancel(app: &AppHandle) -> AccountView {
    let state = app.state::<AppState>();
    let mut core = state.lock();
    core.account.pending = None;
    emit_account(app, &core);
    core.account.view()
}

/// The verifier of the sign-in this window started, if `state` (from a link) is its own.
fn verifier_for(account: &mut AccountState, state: Option<&str>) -> AppResult<String> {
    let pending =
        account.pending.as_ref().ok_or_else(|| AppError::invalid("Start signing in from StewardPad first"))?;
    if pending.started.elapsed() > SIGN_IN_LIFETIME {
        account.pending = None;
        return Err(AppError::invalid("This sign-in has expired: start again"));
    }
    if state.is_some_and(|state| state != pending.state) {
        return Err(AppError::invalid("This link belongs to another sign-in: start again from this window"));
    }
    Ok(pending.verifier.clone())
}

/// The code from the browser (pasted, or the stewardpad://signed-in link): the app's token.
pub fn redeem(app: &AppHandle, input: &str) -> AppResult<AccountView> {
    let handoff =
        read_handoff(input).ok_or_else(|| AppError::invalid("That isn't a sign-in code: it reads like 4F7K-2Q9M"))?;
    let state = app.state::<AppState>();
    let verifier = verifier_for(&mut state.lock().account, handoff.state.as_deref())?;
    let body = json!({ "code": handoff.code, "verifier": verifier });
    let signed: DesktopSignIn = state.api.post("/desktop-sign-in/redeem", &body)?;
    vault::save(state.api.host(), &signed.token)?;
    state.api.set_token(Some(signed.token));
    {
        let mut core = state.lock();
        core.account = AccountState { me: Some(signed.user), ..AccountState::default() };
        emit_account(app, &core);
    }
    eprintln!("[account] Signed in");
    engine::reconcile(app);
    Ok(state.account_view())
}

/// The API no longer knows this PC's session (expired, revoked, the account blocked): signed
/// out here too. The league link and its queued changes stay for the next sign-in.
pub fn expire(app: &AppHandle) {
    let state = app.state::<AppState>();
    vault::forget(state.api.host());
    state.api.set_token(None);
    {
        let mut core = state.lock();
        core.account = AccountState::default();
        emit_account(app, &core);
    }
    engine::reconcile(app);
}

/// Settings → Account → Sign out: ends the session on the API, then forgets it here. The
/// incidents stay on this PC; the league link and what it hadn't sent go.
pub fn sign_out(app: &AppHandle) -> AccountView {
    let state = app.state::<AppState>();
    if let Err(error) = state.api.post::<_, serde_json::Value>("/auth/sign-out", &json!({})) {
        eprintln!(
            "[account] The API didn't hear the sign-out ({:?}); the token is forgotten here anyway",
            error.status()
        );
    }
    {
        let mut core = state.lock();
        core.store.team = None;
        core.changed();
    }
    expire(app);
    state.account_view()
}

/// Settings → Account → Delete my account (GDPR art. 17). Refused while it owns a league.
pub fn delete(app: &AppHandle) -> AppResult<AccountView> {
    let state = app.state::<AppState>();
    state.api.delete::<()>("/me")?;
    {
        let mut core = state.lock();
        core.store.team = None;
        core.changed();
    }
    expire(app);
    Ok(state.account_view())
}
