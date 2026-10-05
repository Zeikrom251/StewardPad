//! Opens a page of the website in the steward's default browser. Only links the app built
//! itself come here (account/pkce.rs), never one from the UI.

use std::process::Command;

pub fn open(url: &str) -> std::io::Result<()> {
    #[cfg(windows)]
    let mut command = {
        let mut command = Command::new("rundll32");
        command.args(["url.dll,FileProtocolHandler", url]);
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(url);
        command
    };
    // Under WSL (development), the browser is Windows' own.
    #[cfg(not(any(windows, target_os = "macos")))]
    let mut command = {
        let opener = if std::env::var_os("WSL_DISTRO_NAME").is_some() { "explorer.exe" } else { "xdg-open" };
        let mut command = Command::new(opener);
        command.arg(url);
        command
    };
    let mut child = command.spawn()?;
    // Reaped on its own thread: the opener exits as soon as the browser has the link.
    std::thread::spawn(move || child.wait());
    Ok(())
}
