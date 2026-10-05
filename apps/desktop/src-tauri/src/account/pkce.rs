//! The desktop sign-in link (board 10): a PKCE verifier only this app holds, its S256 challenge,
//! a state to recognise our own answer, and the PC's name so a stray link stands out.

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use sha2::{Digest, Sha256};

pub struct SignInRequest {
    pub verifier: String,
    pub state: String,
    /// The website page the browser opens.
    pub url: String,
}

/// 64 hex characters from two random UUIDs: 244 random bits, all RFC 7636 "unreserved".
fn secret() -> String {
    format!("{}{}", uuid::Uuid::new_v4().simple(), uuid::Uuid::new_v4().simple())
}

pub fn challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

pub fn new_sign_in(site: &str, pc: Option<&str>, now_ms: u128) -> SignInRequest {
    let verifier = secret();
    let state = uuid::Uuid::new_v4().simple().to_string();
    let mut url = format!("{site}/sign-in/desktop?challenge={}&state={state}", challenge(&verifier));
    if let Some(pc) = pc {
        url.push_str(&format!("&pc={}", encode(pc)));
    }
    url.push_str(&format!("&t={now_ms}"));
    SignInRequest { verifier, state, url }
}

/// Percent-encodes a query value (RFC 3986 unreserved characters pass).
fn encode(value: &str) -> String {
    value
        .bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

/// This PC's name as the sign-in page shows it, kept to what the API accepts.
pub fn pc_name() -> Option<String> {
    let raw = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .or_else(|_| std::fs::read_to_string("/etc/hostname"))
        .ok()?;
    let name: String = raw
        .trim()
        .chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, ' ' | '.' | '_' | '\'' | '-'))
        .take(64)
        .collect();
    (!name.is_empty()).then_some(name)
}

/// What the steward pasted or the browser linked: the code, and the state when it came by link.
#[derive(Debug, PartialEq, Eq)]
pub struct Handoff {
    pub code: String,
    pub state: Option<String>,
}

/// "4F7K-2Q9M", "4f7k 2q9m", or `stewardpad://signed-in?code=…&state=…`.
pub fn read_handoff(input: &str) -> Option<Handoff> {
    let input = input.trim();
    if let Some(query) = input.strip_prefix("stewardpad://signed-in?") {
        let param =
            |key: &str| query.split('&').find_map(|pair| pair.strip_prefix(key)?.strip_prefix('=').map(str::to_string));
        let code = param("code").filter(|code| is_code(code))?;
        return Some(Handoff { code, state: param("state") });
    }
    is_code(input).then(|| Handoff { code: input.to_string(), state: None })
}

fn is_code(code: &str) -> bool {
    let chars: Vec<char> = code.chars().filter(|c| !matches!(c, '-' | ' ')).collect();
    chars.len() == 8 && chars.iter().all(char::is_ascii_alphanumeric) && code.len() <= 12
}

#[cfg(test)]
#[path = "pkce_tests.rs"]
mod tests;
