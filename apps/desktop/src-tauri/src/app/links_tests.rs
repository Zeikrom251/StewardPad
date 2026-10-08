use super::as_written;

#[test]
fn reads_a_link_windows_gave_a_slash_before_the_query() {
    let code = "stewardpad://signed-in?code=4F7K-2Q9M&state=abc";
    assert_eq!(as_written("stewardpad://signed-in/?code=4F7K-2Q9M&state=abc"), code);
    assert_eq!(as_written(code), code, "as the website writes it");
    assert_eq!(as_written("stewardpad://join/?code=x"), "stewardpad://join?code=x");
    assert_eq!(as_written("stewardpad://other/?a=1"), "stewardpad://other/?a=1", "unknown links stay as they are");
}

#[cfg(all(debug_assertions, target_os = "linux"))]
#[test]
fn the_windows_handler_starts_this_build_and_refuses_what_it_cannot_quote() {
    let command = super::wsl_open_command("Ubuntu-24.04", "/home/z/target/debug/stewardpad-desktop");
    let expected =
        r#""C:\Windows\System32\wsl.exe" -d Ubuntu-24.04 --exec "/home/z/target/debug/stewardpad-desktop" "%1""#;
    assert_eq!(command.as_deref(), Some(expected));
    assert_eq!(super::wsl_open_command("Ubuntu", "/home/z/odd\"name/app"), None);
    assert_eq!(super::wsl_open_command("Ubuntu \"x", "/app"), None, "a distro name is one word");
}
