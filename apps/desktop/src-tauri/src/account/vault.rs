//! Where the API token is kept: the OS credential store (Windows Credential Manager; the kernel
//! keyring under WSL), encrypted by the OS for this user. Never the session file, never the UI.

use keyring_core::{Entry, Error};

use crate::error::{AppError, AppResult};

const SERVICE: &str = "com.emeraldstudio.stewardpad";

/// Picks the OS store once, at startup. Without one, sign-in says so instead of saving the
/// token somewhere weaker.
pub fn init() {
    #[cfg(windows)]
    let store = windows_native_keyring_store::Store::new();
    #[cfg(target_os = "linux")]
    let store = linux_keyutils_keyring_store::Store::new();
    #[cfg(any(windows, target_os = "linux"))]
    match store {
        Ok(store) => keyring_core::set_default_store(store),
        Err(error) => eprintln!("[account] No credential store: {error}"),
    }
}

/// One entry per API host: a local test server never overwrites the real sign-in.
fn entry(host: &str) -> Result<Entry, Error> {
    Entry::new(SERVICE, &format!("api-session@{host}"))
}

pub fn load(host: &str) -> Option<String> {
    match entry(host).and_then(|entry| entry.get_password()) {
        Ok(token) => Some(token),
        Err(Error::NoEntry) => None,
        Err(error) => {
            eprintln!("[account] Could not read the saved sign-in: {error}");
            None
        }
    }
}

pub fn save(host: &str, token: &str) -> AppResult<()> {
    entry(host)
        .and_then(|entry| entry.set_password(token))
        .map_err(|e| AppError::io("Windows could not keep your sign-in safely", e))
}

pub fn forget(host: &str) {
    match entry(host).and_then(|entry| entry.delete_credential()) {
        Ok(()) | Err(Error::NoEntry) => {}
        Err(error) => eprintln!("[account] Could not remove the saved sign-in: {error}"),
    }
}
