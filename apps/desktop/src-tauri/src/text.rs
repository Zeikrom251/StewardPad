//! Small formatting helpers shared by incidents, CSV export and archiving.
//! Written out rather than pulling in a date crate: UTC ISO timestamps and
//! "HH:MM:SS" are all this app ever formats.

use std::time::{SystemTime, UNIX_EPOCH};

/// "01:02:05" — the replay scrubber's clock format. Floors, clamps negatives to zero.
pub fn format_hms(total_seconds: f64) -> String {
    let safe = if total_seconds.is_finite() { total_seconds.max(0.0).floor() as u64 } else { 0 };
    format!("{:02}:{:02}:{:02}", safe / 3600, (safe % 3600) / 60, safe % 60)
}

/// A number the way JavaScript's String(n) prints it: "110" not "110.0". Keeps CSV cells
/// identical to what the NestJS server wrote.
pub fn js_number(value: f64) -> String {
    if value.fract() == 0.0 && value.abs() < 1e15 {
        format!("{}", value as i64)
    } else {
        format!("{value}")
    }
}

/// Markdown text as a reader sees it: the rich-text editor stores "&" as "&amp;", which
/// has no place in a CSV cell or a rule title. `&amp;` goes last, so "&amp;lt;" stays "&lt;".
pub fn decode_entities(value: &str) -> String {
    [("&lt;", "<"), ("&gt;", ">"), ("&quot;", "\""), ("&#39;", "'"), ("&nbsp;", " "), ("&amp;", "&")]
        .iter()
        .fold(value.to_string(), |text, (entity, plain)| text.replace(entity, plain))
}

/// Filesystem-safe slug for archive and CSV filenames.
pub fn slugify(value: &str) -> String {
    let mut slug = String::new();
    for ch in value.trim().to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
        } else if !slug.ends_with('-') {
            slug.push('-');
        }
    }
    let slug = slug.trim_matches('-');
    if slug.is_empty() {
        "unknown-track".to_string()
    } else {
        slug.to_string()
    }
}

/// UTC wall-clock time, split into calendar fields.
pub struct UtcTime {
    pub year: i64,
    pub month: u32,
    pub day: u32,
    pub hour: u64,
    pub minute: u64,
    pub second: u64,
    pub millis: u32,
}

impl UtcTime {
    pub fn now() -> Self {
        let since_epoch = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
        Self::from_unix_millis(since_epoch.as_millis() as i64)
    }

    pub fn from_unix_millis(millis: i64) -> Self {
        let secs = millis.div_euclid(1000);
        let (year, month, day) = civil_from_days(secs.div_euclid(86_400));
        let of_day = secs.rem_euclid(86_400) as u64;
        Self {
            year,
            month,
            day,
            hour: of_day / 3600,
            minute: (of_day % 3600) / 60,
            second: of_day % 60,
            millis: millis.rem_euclid(1000) as u32,
        }
    }

    /// "2026-09-28T09:15:30.123Z" — same as JavaScript's Date#toISOString.
    pub fn iso(&self) -> String {
        format!("{}T{:02}:{:02}:{:02}.{:03}Z", self.date(), self.hour, self.minute, self.second, self.millis)
    }

    /// "2026-09-28"
    pub fn date(&self) -> String {
        format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
    }

    /// "2026-09-28-0915" — archive filename stamp. Minutes, not just the date: practice,
    /// qualifying and race at one track on one day would otherwise overwrite each other.
    pub fn archive_stamp(&self) -> String {
        format!("{}-{:02}{:02}", self.date(), self.hour, self.minute)
    }
}

/// Days since 1970-01-01 → (year, month, day). Howard Hinnant's civil_from_days.
fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let month = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let year = yoe + era * 400 + i64::from(month <= 2);
    (year, month, day)
}

#[cfg(test)]
#[path = "text_tests.rs"]
mod tests;
