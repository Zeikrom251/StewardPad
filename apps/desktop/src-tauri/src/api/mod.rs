//! The StewardPad API (docs/sync-api.md in the website repo): every request the app makes to
//! it. Calls run here in Rust, never in the webview, so the bearer token is out of reach of
//! anything the UI renders — teammates' incident text included.

mod error;
pub mod events;
mod origins;
pub mod wire;

use std::io::{Read, Write};
use std::sync::{PoisonError, RwLock};
use std::time::Duration;

use flate2::{write::GzEncoder, Compression};
use serde::de::DeserializeOwned;
use serde::Serialize;
use ureq::http::{Method, Request, Response};
use ureq::Body;

pub use error::{ApiError, ApiResult};

const CALL_TIMEOUT: Duration = Duration::from_secs(20);
/// The API ends a live-events connection after 10 minutes; this is only the backstop.
const EVENTS_TIMEOUT: Duration = Duration::from_secs(11 * 60);
/// The largest answer the app reads: a session's incidents, or a user's data export.
const MAX_ANSWER: u64 = 16 * 1024 * 1024;

pub struct Api {
    base: String,
    site: String,
    calls: ureq::Agent,
    events: ureq::Agent,
    token: RwLock<Option<String>>,
}

fn agent(timeout: Duration) -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(timeout))
        .http_status_as_error(false)
        .https_only(!origins::is_dev())
        .user_agent(concat!("StewardPad/", env!("CARGO_PKG_VERSION")))
        .build()
        .into()
}

impl Api {
    pub fn new() -> Self {
        let (api, site) = origins::resolve();
        eprintln!("[api] {api}");
        Self {
            base: format!("{api}/api"),
            site,
            calls: agent(CALL_TIMEOUT),
            events: agent(EVENTS_TIMEOUT),
            token: RwLock::new(None),
        }
    }

    /// The website: sign-in and invite pages.
    pub fn site(&self) -> &str {
        &self.site
    }

    /// Where the token is kept for (account/vault.rs): production and a local API never mix.
    pub fn host(&self) -> &str {
        self.base.split("://").nth(1).and_then(|rest| rest.split('/').next()).unwrap_or("api")
    }

    pub fn set_token(&self, token: Option<String>) {
        *self.token.write().unwrap_or_else(PoisonError::into_inner) = token;
    }

    pub fn has_token(&self) -> bool {
        self.token.read().unwrap_or_else(PoisonError::into_inner).is_some()
    }

    pub fn get<T: DeserializeOwned>(&self, path: &str) -> ApiResult<T> {
        self.call(Method::GET, path, None)
    }

    pub fn post<B: Serialize, T: DeserializeOwned>(&self, path: &str, body: &B) -> ApiResult<T> {
        self.call(Method::POST, path, Some(json(body)?))
    }

    pub fn patch<B: Serialize, T: DeserializeOwned>(&self, path: &str, body: &B) -> ApiResult<T> {
        self.call(Method::PATCH, path, Some(json(body)?))
    }

    pub fn delete<T: DeserializeOwned>(&self, path: &str) -> ApiResult<T> {
        self.call(Method::DELETE, path, None)
    }

    /// A live timing frame: the whole picture, gzipped (the API inflates it).
    pub fn put_gzipped<B: Serialize>(&self, path: &str, body: &B) -> ApiResult<()> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::fast());
        encoder.write_all(&json(body)?).and_then(|()| encoder.flush()).map_err(unreachable)?;
        let zipped = encoder.finish().map_err(unreachable)?;
        let request = self
            .request(Method::PUT, path)
            .header("content-type", "application/json")
            .header("content-encoding", "gzip");
        let response = self.calls.run(request.body(zipped).map_err(unreachable)?).map_err(unreachable)?;
        answer(response)
    }

    /// The league's live events (Server-Sent Events, gzipped), resumed after `last_event_id`.
    pub fn open_events(&self, path: &str, last_event_id: Option<&str>) -> ApiResult<impl Read> {
        let mut request = self.request(Method::GET, path).header("accept", "text/event-stream");
        if let Some(id) = last_event_id {
            request = request.header("last-event-id", id);
        }
        let response = self.events.run(request.body(()).map_err(unreachable)?).map_err(unreachable)?;
        if !response.status().is_success() {
            return Err(refusal(response));
        }
        Ok(response.into_body().into_reader())
    }

    fn call<T: DeserializeOwned>(&self, method: Method, path: &str, body: Option<Vec<u8>>) -> ApiResult<T> {
        let request = self.request(method, path);
        let response = match body {
            Some(bytes) => {
                let request = request.header("content-type", "application/json").body(bytes);
                self.calls.run(request.map_err(unreachable)?)
            }
            None => self.calls.run(request.body(()).map_err(unreachable)?),
        };
        answer(response.map_err(unreachable)?)
    }

    fn request(&self, method: Method, path: &str) -> ureq::http::request::Builder {
        let builder = Request::builder().method(method).uri(format!("{}{path}", self.base));
        match self.token.read().unwrap_or_else(PoisonError::into_inner).as_deref() {
            Some(token) => builder.header("authorization", format!("Bearer {token}")),
            None => builder,
        }
    }
}

fn json<B: Serialize>(body: &B) -> ApiResult<Vec<u8>> {
    serde_json::to_vec(body).map_err(unreachable)
}

fn unreachable(error: impl std::fmt::Display) -> ApiError {
    ApiError::Unreachable(error.to_string())
}

fn read_text(response: Response<Body>) -> ApiResult<String> {
    response.into_body().with_config().limit(MAX_ANSWER).read_to_string().map_err(unreachable)
}

fn refusal(response: Response<Body>) -> ApiError {
    let status = response.status().as_u16();
    match read_text(response) {
        Ok(text) => ApiError::from_answer(status, &text),
        Err(error) => error,
    }
}

/// A 2xx body as `T` (an empty one reads as JSON null, so 204 fits `()`).
fn answer<T: DeserializeOwned>(response: Response<Body>) -> ApiResult<T> {
    if !response.status().is_success() {
        return Err(refusal(response));
    }
    let text = read_text(response)?;
    let text = if text.trim().is_empty() { "null" } else { &text };
    serde_json::from_str(text).map_err(|e| ApiError::Unreachable(format!("unexpected answer: {e}")))
}
