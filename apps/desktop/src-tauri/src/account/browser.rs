//! Opens a page of the website in the steward's default browser. Only links the app built
//! itself come here (account/pkce.rs), never one from the UI.

use std::process::Command;

pub fn open(url: &str) -> std::io::Result<()> {
    let mut child = opener().arg(url).spawn()?;
    // Reaped on its own thread: the opener exits as soon as the browser has the link.
    std::thread::spawn(move || child.wait());
    Ok(())
}

/// On Windows, and under WSL (development, where the browser is Windows' own), the shell's URL
/// handler: it hands the link to the default browser as is (explorer.exe would take a link
/// with a query string for a folder and open Documents).
fn opener() -> Command {
    if cfg!(windows) || std::env::var_os("WSL_DISTRO_NAME").is_some() {
        let mut command = Command::new(if cfg!(windows) { "rundll32" } else { "rundll32.exe" });
        command.arg("url.dll,FileProtocolHandler");
        return command;
    }
    Command::new(if cfg!(target_os = "macos") { "open" } else { "xdg-open" })
}
