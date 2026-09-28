//! Errors returned to the UI. Serialized as { kind, message } so the React side can tell
//! "that incident is gone" from "that input was invalid" from "the disk refused".

use serde::Serialize;

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub kind: ErrorKind,
    pub message: String,
}

#[derive(Serialize, Debug, PartialEq, Eq, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub enum ErrorKind {
    NotFound,
    Invalid,
    Io,
}

impl AppError {
    pub fn not_found(message: impl Into<String>) -> Self {
        Self { kind: ErrorKind::NotFound, message: message.into() }
    }

    pub fn invalid(message: impl Into<String>) -> Self {
        Self { kind: ErrorKind::Invalid, message: message.into() }
    }

    pub fn io(context: &str, error: impl std::fmt::Display) -> Self {
        Self { kind: ErrorKind::Io, message: format!("{context}: {error}") }
    }
}

pub type AppResult<T> = Result<T, AppError>;
