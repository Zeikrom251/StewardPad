use super::*;

#[test]
fn formats_whole_hours_minutes_seconds_with_zero_padding() {
    assert_eq!(format_hms(3725.0), "01:02:05");
}

#[test]
fn floors_fractional_seconds() {
    assert_eq!(format_hms(59.9), "00:00:59");
}

#[test]
fn clamps_negative_input_to_zero() {
    assert_eq!(format_hms(-5.0), "00:00:00");
    assert_eq!(format_hms(0.0), "00:00:00");
}

#[test]
fn prints_numbers_like_javascript() {
    assert_eq!(js_number(110.0), "110");
    assert_eq!(js_number(2685.2000000000003), "2685.2000000000003");
    assert_eq!(js_number(0.5), "0.5");
}

#[test]
fn slugifies_track_names_for_filenames() {
    assert_eq!(slugify("Autodromo Nazionale Monza"), "autodromo-nazionale-monza");
    assert_eq!(slugify("  Circuit de la Sarthe (24h) "), "circuit-de-la-sarthe-24h");
    assert_eq!(slugify(""), "unknown-track");
}

#[test]
fn formats_iso_timestamps_like_to_iso_string() {
    // 2026-09-28T09:15:30.123Z
    let t = UtcTime::from_unix_millis(1_790_586_930_123);
    assert_eq!(t.iso(), "2026-09-28T09:15:30.123Z");
    assert_eq!(t.archive_stamp(), "2026-09-28-0915");
}

#[test]
fn handles_leap_days_and_the_epoch() {
    assert_eq!(UtcTime::from_unix_millis(0).iso(), "1970-01-01T00:00:00.000Z");
    // 2024-02-29T23:59:59.999Z
    assert_eq!(UtcTime::from_unix_millis(1_709_251_199_999).iso(), "2024-02-29T23:59:59.999Z");
}
