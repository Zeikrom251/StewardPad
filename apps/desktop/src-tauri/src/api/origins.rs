//! Where the API and the website are. A release build always talks to production: one origin,
//! with the API under the website's `/api`. A debug build may be pointed at a local stack
//! (`STEWARDPAD_API_URL`, `STEWARDPAD_SITE_URL`, from the environment or the repo's `.env`), and
//! only at https or this machine, so nothing in the environment can send the token elsewhere.

const PRODUCTION: &str = "https://stewardpad.com";

pub fn is_dev() -> bool {
    cfg!(debug_assertions)
}

pub fn resolve() -> (String, String) {
    (from_env("STEWARDPAD_API_URL", PRODUCTION), from_env("STEWARDPAD_SITE_URL", PRODUCTION))
}

fn from_env(key: &str, production: &str) -> String {
    if !is_dev() {
        return production.to_string();
    }
    match std::env::var(key).ok().or_else(|| from_dotenv(key)).filter(|url| !url.is_empty()) {
        Some(url) if allowed(&url) => url.trim_end_matches('/').to_string(),
        Some(url) => {
            eprintln!("[api] Ignoring {key}={url}: only https or this machine");
            production.to_string()
        }
        None => production.to_string(),
    }
}

/// The repo root's `.env` (debug builds only: the path is this checkout's).
fn from_dotenv(key: &str) -> Option<String> {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../../.env");
    read_dotenv(&std::fs::read_to_string(path).ok()?, key)
}

fn read_dotenv(text: &str, key: &str) -> Option<String> {
    text.lines().find_map(|line| {
        let (name, value) = line.trim().split_once('=')?;
        (name.trim() == key).then(|| value.trim().trim_matches(['"', '\'']).to_string())
    })
}

fn allowed(url: &str) -> bool {
    if let Some(rest) = url.strip_prefix("https://") {
        return !rest.split('/').next().unwrap_or("").contains('@');
    }
    let authority = url.strip_prefix("http://").and_then(|rest| rest.split('/').next()).unwrap_or("");
    let Some((host, port)) = authority.rsplit_once(':') else { return false };
    matches!(host, "localhost" | "127.0.0.1") && !port.is_empty() && port.bytes().all(|b| b.is_ascii_digit())
}

#[cfg(test)]
mod tests {
    #[test]
    fn only_https_or_this_machine() {
        assert!(super::allowed("https://stewardpad.com"));
        assert!(super::allowed("http://localhost:3001"));
        assert!(!super::allowed("http://stewardpad.com"));
        assert!(!super::allowed("http://localhost.evil.com"));
        assert!(!super::allowed("http://localhost:3001@evil.com"));
        assert!(!super::allowed("https://user@evil.com"));
    }

    #[test]
    fn reads_a_key_from_a_dotenv_file() {
        let text = "# comment\nPORT=3000\nSTEWARDPAD_API_URL = \"http://localhost:3001\"\n";
        assert_eq!(super::read_dotenv(text, "STEWARDPAD_API_URL").as_deref(), Some("http://localhost:3001"));
        assert_eq!(super::read_dotenv(text, "STEWARDPAD_SITE_URL"), None);
    }
}
