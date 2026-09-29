//! Recognising the lines of an outline: section headings, "n." items, sub-headings.

/// A sub-heading is short; a longer unnumbered line is prose.
const MAX_HEADING_CHARS: usize = 80;

/// "Section 3: Racing" (also "Chapter", "Part"), Markdown heading or bold included.
pub(super) fn section(line: &str) -> Option<(u32, &str)> {
    let text = line.trim().trim_start_matches(['#', ' ', '*']).trim_end_matches(['*', ' ']);
    let word = ["section", "chapter", "part"]
        .into_iter()
        .find(|w| text.get(..w.len()).is_some_and(|head| head.eq_ignore_ascii_case(w)))?;
    let rest = text[word.len()..].strip_prefix(' ')?;
    let digits = rest.find(|c: char| !c.is_ascii_digit()).unwrap_or(rest.len());
    let number = rest[..digits].parse().ok()?;
    let title = rest[digits..].trim_start_matches([':', '.', '-', '–', '—', ' ']).trim_end_matches(['*', ' ']);
    Some((number, title))
}

/// "   3. Text" (also "3)", Markdown's "3\." and a bold "**3\. Text**"): indentation, the
/// number, the text.
pub(super) fn list_item(line: &str) -> Option<(usize, u32, &str)> {
    let text = line.trim_start();
    let indent = line.len() - text.len();
    let bold = text.starts_with("**");
    let text = if bold { text[2..].trim_end_matches('*') } else { text };
    let digits = text.find(|c: char| !c.is_ascii_digit())?;
    let number = text[..digits].parse().ok()?;
    let rest = text[digits..].strip_prefix('\\').unwrap_or(&text[digits..]);
    let rest = rest.strip_prefix(['.', ')'])?.strip_prefix(' ')?;
    Some((indent, number, rest.trim_start_matches(['#', ' '])))
}

/// Markdown's heading anchors ("{#section-1}") go.
pub(super) fn clean(line: &str) -> &str {
    let line = line.trim_end();
    match line.rfind(" {#") {
        Some(anchor) if line.ends_with('}') => &line[..anchor],
        _ => line,
    }
}

/// An unnumbered line that introduces a list: "LMGT3:", "General Regulations" then "1.".
/// Rules sit under it, so it gets a number of its own. A table cell ("DSQ from Season"
/// before "6.") does not introduce the list that follows it.
pub(super) fn sub_heading<'a>(line: &'a str, next: Option<&&str>) -> Option<&'a str> {
    let (_, next_number, _) = next.and_then(|n| list_item(n))?;
    let text = line.trim().trim_matches('*').trim();
    let plain =
        !text.starts_with(['*', '-', '•', '|', '[', '!']) && list_item(line).is_none() && section(line).is_none();
    let short = !text.is_empty() && text.chars().count() <= MAX_HEADING_CHARS;
    let introduces = text.ends_with(':') || (next_number == 1 && !text.starts_with(|c: char| c.is_ascii_digit()));
    (plain && short && introduces).then(|| text.trim_end_matches(':').trim())
}

/// Two sub-headings of one kind: both single words ("LMGT3", "HYPERCAR"), or sharing a
/// word ("Sprint Race Format…", "Endurance Race Format…").
pub(super) fn similar(a: &str, b: &str) -> bool {
    let words = |s: &str| -> Vec<String> {
        s.split(|c: char| !c.is_alphanumeric()).filter(|w| w.len() >= 4).map(str::to_lowercase).collect()
    };
    let single = |s: &str| !s.contains(char::is_whitespace);
    (single(a) && single(b)) || words(a).iter().any(|w| words(b).contains(w))
}
