use super::ConfigInput;

fn archive(dir: &str) -> ConfigInput {
    ConfigInput { archive_dir: Some(dir.to_string()), ..ConfigInput::default() }
}

#[test]
fn archive_dir_must_be_absolute() {
    assert!(archive("archive/sebring").validate().is_err());
}

#[test]
fn archive_dir_accepts_an_absolute_path_or_empty_for_the_default() {
    let absolute = std::env::temp_dir().join("stewardpad-archive");
    assert!(archive(&absolute.display().to_string()).validate().is_ok());
    assert!(archive("").validate().is_ok());
}

#[test]
fn export_dir_must_be_absolute_like_the_archive_folder() {
    let relative = ConfigInput { export_dir: Some("exports".into()), ..ConfigInput::default() };
    assert!(relative.validate().is_err_and(|e| e.message.contains("exportDir")));
    let reset = ConfigInput { export_dir: Some(String::new()), ..ConfigInput::default() };
    assert!(reset.validate().is_ok());
}

#[test]
fn display_text_scale_stays_in_range() {
    let too_big = crate::settings::DisplayPrefs { text_scale: 400, ..Default::default() };
    let input = ConfigInput { display: Some(too_big), ..ConfigInput::default() };
    assert!(input.validate().is_err());
}
