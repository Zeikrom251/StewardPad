//! The steward's StewardPad account (Team): desktop sign-in through the browser, the token in
//! the OS credential store, the profile in memory only — the session file, which is archived
//! and shared, never holds the account.

mod browser;
mod pkce;
pub mod service;
pub mod subscription;
pub mod vault;

#[cfg(test)]
mod e2e_tests;

use std::time::{Duration, Instant};

use serde::Serialize;

use crate::api::wire::Me;

/// A browser sign-in link is good for 10 minutes (the website says so too).
const SIGN_IN_LIFETIME: Duration = Duration::from_secs(10 * 60);

pub struct PendingSignIn {
    verifier: String,
    state: String,
    url: String,
    started: Instant,
}

#[derive(Default)]
pub struct AccountState {
    pub me: Option<Me>,
    pending: Option<PendingSignIn>,
    /// A token was found and the API hasn't answered for it yet, or couldn't be reached.
    unconfirmed: Option<Unconfirmed>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Unconfirmed {
    Checking,
    Offline,
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum AccountStatus {
    SignedOut,
    SigningIn,
    Checking,
    /// Signed in, but the API can't be reached: everything keeps working on this PC.
    Offline,
    SignedIn,
}

/// What the UI knows of the account (`account:update`).
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AccountView {
    pub status: AccountStatus,
    pub me: Option<Me>,
    /// The page the browser was sent to, for "Browser didn't open? Copy link".
    pub sign_in_url: Option<String>,
}

impl AccountState {
    pub fn view(&self) -> AccountView {
        let status = match (&self.me, self.unconfirmed, &self.pending) {
            (Some(_), _, _) => AccountStatus::SignedIn,
            (None, Some(Unconfirmed::Checking), _) => AccountStatus::Checking,
            (None, Some(Unconfirmed::Offline), _) => AccountStatus::Offline,
            (None, None, Some(_)) => AccountStatus::SigningIn,
            (None, None, None) => AccountStatus::SignedOut,
        };
        let sign_in_url = self.pending.as_ref().map(|p| p.url.clone());
        AccountView { status, me: self.me.clone(), sign_in_url }
    }

    pub fn my_id(&self) -> Option<&str> {
        self.me.as_ref().map(|me| me.id.as_str())
    }

    /// Signed in, or believed to be while the API is out of reach: the team engine may run.
    pub fn has_session(&self) -> bool {
        self.me.is_some() || self.unconfirmed.is_some()
    }
}
