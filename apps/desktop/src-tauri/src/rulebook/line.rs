//! One line of a rule book: is it a rule, and which. "3.2 Causing a collision",
//! "## 4.1.a — Blocking", "Article 12: Track limits", "§ 7) …", and the explicit form an
//! outline import writes, "**3.3.a** When a car…" (only the number in bold).

use crate::domain::RuleRef;
use crate::text::decode_entities;

const PREFIXES: [&str; 7] = ["chapter", "article", "art.", "section", "rule", "§", "#"];
/// The picker and the CSVs show at most this much of a rule; the book keeps the whole text.
const MAX_TITLE_CHARS: usize = 200;

pub(super) enum Line {
    /// `bold`: the number alone is bold, so this line is a rule even among tables and dates.
    Rule {
        rule: RuleRef,
        bold: bool,
    },
    /// Starts like a rule but the number has characters rules can't use ("3.2A").
    BadNumber(String),
    /// A dotted number alone on its line. A bare "14" is a page number: prose.
    Untitled(String),
    Prose,
}

pub(super) fn read_line(line: &str) -> Line {
    let rest = line.trim().trim_start_matches(['#', ' ']);
    if let Some((code, after)) = bold_code(rest) {
        return titled(code, after, true);
    }
    let rest = strip_prefix(rest.trim_start_matches(['*', '_', '-', ' ']));
    let code_len = rest.find(|c: char| !(c.is_ascii_alphanumeric() || c == '.')).unwrap_or(rest.len());
    let code = rest[..code_len].trim_end_matches('.');
    let after = &rest[code_len..];
    // "0 or 1" is a table cell, "25/05/2026" a date and "18:00" a time, not rules.
    if !code.starts_with(|c: char| c.is_ascii_digit() && c != '0') || !separated(after) {
        return Line::Prose;
    }
    if !is_code(code) {
        return Line::BadNumber(code.to_string());
    }
    titled(code, after, false)
}

/// Digits, dots and lowercase letters: 3, 3.2, 4.1.a, 3.4.b.iii.
pub(super) fn is_code(code: &str) -> bool {
    code.starts_with(|c: char| c.is_ascii_digit())
        && code.chars().all(|c| c.is_ascii_digit() || c == '.' || c.is_ascii_lowercase())
}

/// "**3.3.a** rest" or "**Section 3** rest": the bold span holds a number and nothing else.
fn bold_code(text: &str) -> Option<(&str, &str)> {
    let marker = ["**", "__"].into_iter().find(|m| text.starts_with(m))?;
    let body = &text[marker.len()..];
    let end = body.find(marker)?;
    let code = strip_prefix(body[..end].trim()).trim_end_matches([':', '.', ')']);
    is_code(code).then(|| (code, &body[end + marker.len()..]))
}

fn strip_prefix(mut text: &str) -> &str {
    for prefix in PREFIXES {
        // `get` returns None mid-character, so a line starting with "é" can't panic here.
        if text.get(..prefix.len()).is_some_and(|head| head.eq_ignore_ascii_case(prefix)) {
            text = text[prefix.len()..].trim_start();
        }
    }
    text
}

/// A number ends at a space, or at ")", ":" or "." followed by one ("5\." is Markdown's).
fn separated(after: &str) -> bool {
    let mut chars = after.strip_prefix('\\').unwrap_or(after).chars();
    match chars.next() {
        None => true,
        Some(c) if c.is_whitespace() => true,
        Some(')' | ':' | '.') => chars.next().is_none_or(char::is_whitespace),
        _ => false,
    }
}

fn titled(code: &str, after: &str, bold: bool) -> Line {
    let title = after.trim_start_matches(['\\', ')', '.', ':', '-', '–', '—', ' ', '\t', '*', '_']);
    let title = title.trim().trim_end_matches(['*', '_']).trim();
    match (title.is_empty(), code.contains('.')) {
        (true, true) => Line::Untitled(code.to_string()),
        (true, false) => Line::Prose,
        (false, _) => Line::Rule { rule: RuleRef { code: code.to_string(), title: short_title(title) }, bold },
    }
}

/// A rule that is one long sentence shows its first sentence; the book keeps all of it.
fn short_title(text: &str) -> String {
    let text = unescape(&decode_entities(text));
    if text.chars().count() <= MAX_TITLE_CHARS {
        return text;
    }
    let sentence = text.find(". ").map_or(text.as_str(), |end| &text[..=end]);
    if sentence.chars().count() <= MAX_TITLE_CHARS {
        return sentence.to_string();
    }
    let cut: String = text.chars().take(MAX_TITLE_CHARS - 1).collect();
    format!("{}…", cut.trim_end())
}

/// Markdown escapes ("\-", "\*") read as the character itself.
fn unescape(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\\' && chars.peek().is_some_and(char::is_ascii_punctuation) {
            continue;
        }
        out.push(c);
    }
    out
}
