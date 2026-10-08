//! Errors returned to the UI. Serialized as { kind, message, code? } so the React side can tell
//! "that incident is gone" from "that input was invalid" from "the disk refused" from "the
//! StewardPad API said no" — and, for the API, which rule said no (`code`, its errorCode).

use serde::Serialize;

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub kind: ErrorKind,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
}

#[derive(Serialize, Debug, PartialEq, Eq, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub enum ErrorKind {
    NotFound,
    Invalid,
    Io,
    /// The API couldn't be reached: offline, or it is down. Worth trying again.
    Offline,
    /// The API no longer knows this PC's session: sign in again.
    SignedOut,
    /// The API refused: a rule (`code`), a role, a subscription.
    Refused,
}

impl AppError {
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::NotFound, message)
    }

    pub fn invalid(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Invalid, message)
    }

    pub fn io(context: &str, error: impl std::fmt::Display) -> Self {
        Self::new(ErrorKind::Io, format!("{context}: {error}"))
    }

    pub fn new(kind: ErrorKind, message: impl Into<String>) -> Self {
        Self { kind, message: message.into(), code: None }
    }
}

pub type AppResult<T> = Result<T, AppError>;
