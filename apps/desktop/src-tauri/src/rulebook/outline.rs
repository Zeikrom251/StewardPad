//! Google Docs and Word numbered lists, saved as text, write each level's own number: a
//! "3." then an indented "1.". The league sees (and cites) them as 3.3.a, because both
//! editors number a list's levels 1, a, i by default. This rebuilds those full numbers and
//! writes each one bold ("**3.3.a** Causing a collision…"), so every rule is explicit.

use std::collections::HashSet;

use super::numerals::numeral;
use super::outline_lines::{clean, list_item, section, similar, sub_heading};

struct Item {
    number: u32,
    indent: usize,
    /// A sub-heading's text: the next heading like it ("HYPERCAR" after "LMGT3") sits level.
    heading: Option<String>,
    /// "…as follows:": a sub-heading right after it sits under it.
    lead_in: bool,
}

#[derive(Default)]
struct Outline {
    /// "Section 9" is [9]; a "Section 2" restarting inside it is [9, 2].
    chapter: Vec<u32>,
    items: Vec<Item>,
    body_started: bool,
    /// The next "n." is the first rule under a sub-heading, whatever number it carries.
    under_heading: bool,
    used: HashSet<String>,
}

/// An outline: most numbered list lines repeat a number used before ("1." under every item).
pub(super) fn is_outline(text: &str) -> bool {
    let numbers: Vec<u32> = text.lines().filter_map(|l| list_item(l).map(|(_, n, _)| n)).collect();
    let distinct: HashSet<&u32> = numbers.iter().collect();
    numbers.len() >= 6 && distinct.len() * 2 < numbers.len()
}

/// The book with full rule numbers, one paragraph per line (Markdown would join them).
pub(super) fn number_outline(text: &str) -> String {
    let lines: Vec<&str> = text.lines().map(clean).filter(|l| !l.trim().is_empty()).collect();
    let mut outline = Outline::default();
    let out: Vec<String> = lines.iter().enumerate().map(|(i, line)| outline.write(line, lines.get(i + 1))).collect();
    out.join("\n\n") + "\n"
}

impl Outline {
    fn write(&mut self, line: &str, next: Option<&&str>) -> String {
        if let Some((number, title)) = section(line) {
            // Before the body, a section followed straight by another is the contents list.
            if !self.body_started && next.is_some_and(|n| section(n).is_some()) {
                return line.trim().to_string();
            }
            self.body_started = true;
            self.enter_section(number);
            let level = "#".repeat(self.chapter.len() + 1);
            return format!("{level} **Section {}** {title}", join(&self.chapter)).trim_end().to_string();
        }
        // A title above the first list is not a sub-heading: the list is the book's top level.
        let in_body = self.body_started || !self.items.is_empty();
        if let Some(text) = sub_heading(line, next).filter(|_| in_body) {
            let depth = self.heading_depth(text);
            let number = self.items.get(depth).map_or(1, |item| item.number + 1);
            let heading = Item { number, indent: 0, heading: Some(text.to_string()), lead_in: false };
            self.under_heading = true;
            return format!("**{}** {text}", self.push(depth, heading));
        }
        let Some((indent, number, text)) = list_item(line) else {
            return line.trim().to_string();
        };
        let depth =
            if std::mem::take(&mut self.under_heading) { self.items.len() } else { self.depth_for(indent, number) };
        let item = Item { number, indent, heading: None, lead_in: text.trim_end().ends_with(':') };
        format!("**{}** {}", self.push(depth, item), text.trim())
    }

    /// Sections go 1, 2, 3… A "Section 1" that breaks the run restarts inside the current
    /// one (a financial appendix with its own sections): 9.1, 9.2, until the run resumes.
    fn enter_section(&mut self, number: u32) {
        self.items.clear();
        self.under_heading = false;
        let top = self.chapter.first().copied().unwrap_or(0);
        let sub = self.chapter.get(1).copied();
        self.chapter = match sub {
            Some(s) if number == s + 1 => vec![top, number],
            _ if number == top + 1 || self.chapter.is_empty() => vec![number],
            _ if number == 1 => vec![top, 1],
            _ => vec![number],
        };
    }

    /// Under the "…as follows:" rule just before it, else level with the last heading like
    /// it ("Endurance Race Format" after "Sprint Race Format"), else at the top.
    fn heading_depth(&self, text: &str) -> usize {
        if self.items.last().is_some_and(|item| item.lead_in) {
            return self.items.len();
        }
        self.items.iter().rposition(|item| item.heading.as_deref().is_some_and(|h| similar(h, text))).unwrap_or(0)
    }

    /// Where a "n." line sits. Indentation says most of it; where the document lost it (a
    /// pasted list), numbering decides: "1." opens a list under the line before, and any
    /// other number continues the list whose last number it follows.
    fn depth_for(&self, indent: usize, number: u32) -> usize {
        let rising = self.items.last().is_some_and(|last| indent < last.indent);
        if number == 1 && !rising {
            return self.items.len();
        }
        let continues = |item: &Item| item.heading.is_none() && item.number + 1 == number && item.indent <= indent;
        // The deepest open list this number continues, among those not indented deeper.
        (0..self.items.len())
            .rev()
            .find(|&d| continues(&self.items[d]))
            // Else by indentation alone: one level per open item indented less (any unit).
            .unwrap_or_else(|| self.items.iter().filter(|item| item.indent < indent).count())
    }

    /// Opens `item` at `depth` and returns its full number. A number the document uses twice
    /// (a list restarting at 1 where one already ran) moves on to the next free one.
    fn push(&mut self, depth: usize, item: Item) -> String {
        self.items.truncate(depth);
        self.items.push(item);
        loop {
            let code = self.code();
            if self.used.insert(code.clone()) {
                return code;
            }
            if let Some(last) = self.items.last_mut() {
                last.number += 1;
            }
        }
    }

    fn code(&self) -> String {
        let mut parts: Vec<String> = self.chapter.iter().map(u32::to_string).collect();
        parts.extend(self.items.iter().enumerate().map(|(level, item)| numeral(level, item.number)));
        parts.join(".")
    }
}

fn join(numbers: &[u32]) -> String {
    numbers.iter().map(u32::to_string).collect::<Vec<_>>().join(".")
}

#[cfg(test)]
#[path = "outline_tests.rs"]
mod tests;
