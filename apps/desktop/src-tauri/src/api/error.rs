//! What a failed API call means to the app: no answer (retry later), or the API's refusal with
//! the rule that refused it (`errorCode`, docs/sync-api.md → Errors).

use serde::Deserialize;
use serde_json::Value;

use crate::error::{AppError, ErrorKind};

#[derive(Debug, Clone, PartialEq)]
pub enum ApiError {
    /// No answer: offline, DNS, TLS, a timeout.
    Unreachable(String),
    /// The API answered with an error status.
    Refused { status: u16, code: Option<String>, message: String, body: Value },
    /// A success whose body this version can't read: the API did it, retrying won't help.
    Unreadable { status: u16, detail: String },
}

pub type ApiResult<T> = Result<T, ApiError>;

/// NestJS's error body: `message` is a list for a validation error.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ErrorBody {
    #[serde(default)]
    message: Value,
    error_code: Option<String>,
}

impl ApiError {
    pub fn from_answer(status: u16, text: &str) -> Self {
        let body: Value = serde_json::from_str(text).unwrap_or(Value::Null);
        let parsed = serde_json::from_value::<ErrorBody>(body.clone()).ok();
        let message = parsed.as_ref().map(|p| message_text(&p.message)).filter(|m| !m.is_empty());
        let code = parsed.and_then(|p| p.error_code);
        let message = message.unwrap_or_else(|| format!("The StewardPad API answered {status}"));
        ApiError::Refused { status, code, message, body }
    }

    pub fn status(&self) -> Option<u16> {
        match self {
            ApiError::Refused { status, .. } | ApiError::Unreadable { status, .. } => Some(*status),
            ApiError::Unreachable(_) => None,
        }
    }

    pub fn code(&self) -> Option<&str> {
        match self {
            ApiError::Refused { code, .. } => code.as_deref(),
            ApiError::Unreachable(_) | ApiError::Unreadable { .. } => None,
        }
    }

    /// Worth sending again as is: no answer, the API is down or busy.
    pub fn is_transient(&self) -> bool {
        self.status().is_none_or(|status| status >= 500 || status == 429)
    }

    pub fn is_signed_out(&self) -> bool {
        self.status() == Some(401)
    }

    /// The body, for the refusals that carry data (EDIT_CONFLICT's current incident).
    pub fn body(&self) -> Option<&Value> {
        match self {
            ApiError::Refused { body, .. } => Some(body),
            ApiError::Unreachable(_) | ApiError::Unreadable { .. } => None,
        }
    }
}

fn message_text(message: &Value) -> String {
    match message {
        Value::String(text) => text.clone(),
        Value::Array(items) => items.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(". "),
        _ => String::new(),
    }
}

impl From<ApiError> for AppError {
    fn from(error: ApiError) -> Self {
        match error {
            ApiError::Unreachable(_) => AppError::new(
                ErrorKind::Offline,
                "StewardPad's servers can't be reached. Check your connection and try again.",
            ),
            ApiError::Unreadable { .. } => AppError::new(
                ErrorKind::Refused,
                "StewardPad's servers answered in a way this version can't read. Update StewardPad.",
            ),
            ApiError::Refused { status: 401, .. } => {
                AppError::new(ErrorKind::SignedOut, "You were signed out. Sign in again.")
            }
            ApiError::Refused { code, message, .. } => AppError { kind: ErrorKind::Refused, message, code },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_rule_that_refused_and_joins_validation_messages() {
        let conflict = ApiError::from_answer(409, r#"{"statusCode":409,"message":"Taken","errorCode":"STREAM_TAKEN"}"#);
        assert_eq!(conflict.code(), Some("STREAM_TAKEN"));
        assert!(!conflict.is_transient());
        let invalid = ApiError::from_answer(400, r#"{"statusCode":400,"message":["name is short","role is wrong"]}"#);
        assert_eq!(AppError::from(invalid).message, "name is short. role is wrong");
        let down = ApiError::from_answer(502, "<html>Bad gateway</html>");
        assert!(down.is_transient());
        assert_eq!(AppError::from(down).message, "The StewardPad API answered 502");
        assert_eq!(AppError::from(ApiError::from_answer(401, "")).kind, ErrorKind::SignedOut);
    }
}
