//! A league's rule book, imported from a text or Markdown file (a PDF or Google Doc saved
//! as text works). Every line that starts with a rule number becomes a selectable rule
//! (`line.rs`); a numbered outline gets its full numbers written in first (`outline.rs`).

mod line;
mod numerals;
mod outline;
mod outline_lines;

use std::collections::HashSet;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::domain::RuleRef;
use crate::error::{AppError, AppResult};
use crate::text::decode_entities;
use line::{read_line, Line};
use outline::{is_outline, number_outline};

// A full sporting code is a few hundred KB of text; this bounds a wrong pick.
const MAX_FILE_BYTES: u64 = 5 * 1024 * 1024;
const MAX_RULES: usize = 5000;
const MAX_PROBLEMS: usize = 50;
const EXCERPT_CHARS: usize = 60;
const NO_RULES: &str = "No numbered rules found (lines like \"3.2 Causing a collision\")";

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Rulebook {
    /// The file name without its extension, shown in Settings.
    pub name: String,
    pub rules: Vec<RuleRef>,
    /// The whole file, as Markdown: the Rules page shows and edits it. Empty in books
    /// imported before editing existed (the UI rebuilds one line per rule).
    #[serde(default)]
    pub text: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RulebookCheck {
    pub rules: Vec<RuleRef>,
    pub problems: Vec<Problem>,
    /// Rules are the lines whose number is bold; the editor explains which form applies.
    pub explicit: bool,
    /// A pasted Google Docs / Word list: every "1." reads as rule 1 until it is numbered.
    pub outline: bool,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Problem {
    /// The line at fault, shortened; empty for a problem with the whole book.
    pub line: String,
    pub message: String,
}

pub fn read_rulebook(path: &Path) -> AppResult<Rulebook> {
    let size = std::fs::metadata(path).map_err(|e| AppError::io("Could not open the rule book", e))?.len();
    if size > MAX_FILE_BYTES {
        return Err(AppError::invalid("Too large for a rule book. Save it as plain text"));
    }
    let text = std::fs::read_to_string(path)
        .map_err(|_| AppError::invalid("Not a text file. Save the rule book as .txt or .md"))?;
    let name = path.file_stem().map_or_else(|| "Rule book".to_string(), |s| s.to_string_lossy().into_owned());
    let text = number_if_outline(&text);
    let rules = parse_rules(&text);
    if rules.is_empty() {
        return Err(AppError::invalid(NO_RULES));
    }
    Ok(Rulebook { name, rules, text })
}

/// A book edited in the app. Unlike an import (a PDF saved as text is messy, so it is read
/// leniently), an edit must follow the structure: the first problem refuses the save.
pub fn edited_rulebook(name: String, text: String) -> AppResult<Rulebook> {
    if text.len() as u64 > MAX_FILE_BYTES {
        return Err(AppError::invalid("Too large for a rule book"));
    }
    let check = check_rules(&text);
    if let Some(problem) = check.problems.first() {
        return Err(AppError::invalid(format!("{} ({})", problem.message, problem.line)));
    }
    Ok(Rulebook { name, rules: check.rules, text })
}

/// One rule per numbered line, in document order; a repeated number keeps its first title.
pub fn parse_rules(text: &str) -> Vec<RuleRef> {
    let lines: Vec<Line> = text.lines().map(read_line).collect();
    let explicit = is_explicit(&lines);
    let mut seen = HashSet::new();
    lines
        .into_iter()
        .filter_map(|line| match line {
            Line::Rule { rule, bold } if bold || !explicit => Some(rule),
            _ => None,
        })
        .filter(|rule| seen.insert(rule.code.clone()))
        .take(MAX_RULES)
        .collect()
}

/// Every line that breaks the structure, in document order, for the Rules page editor.
pub fn check_rules(text: &str) -> RulebookCheck {
    let lines: Vec<(&str, Line)> = text.lines().map(|l| (l, read_line(l))).collect();
    let explicit = is_explicit(lines.iter().map(|(_, line)| line));
    let mut rules = Vec::new();
    let mut seen = HashSet::new();
    let mut problems = Vec::new();
    for (text, line) in lines {
        let message = match line {
            Line::Rule { rule, bold: false } if explicit && rule.code.contains('.') => Some(format!(
                "{0} is not bold, so it is not a rule. In this book rule numbers are bold: **{0}**",
                rule.code
            )),
            Line::Rule { bold: false, .. } if explicit => None,
            Line::Rule { rule, .. } if !seen.insert(rule.code.clone()) => {
                Some(format!("Rule {} is numbered twice. Each rule number must be unique", rule.code))
            }
            Line::Rule { rule, .. } => {
                rules.push(rule);
                None
            }
            Line::BadNumber(code) => {
                Some(format!("{code} is not a rule number. Use digits, dots and lowercase letters, like 3.2.a"))
            }
            Line::Untitled(code) => Some(format!("Rule {code} has no title. Write it on the same line")),
            Line::Prose => None,
        };
        problems.extend(message.map(|message| Problem { line: excerpt(text), message }));
    }
    if rules.is_empty() {
        problems.push(Problem { line: String::new(), message: NO_RULES.to_string() });
    }
    if rules.len() > MAX_RULES {
        problems.push(Problem { line: String::new(), message: format!("More than {MAX_RULES} rules") });
    }
    problems.truncate(MAX_PROBLEMS);
    RulebookCheck { rules, problems, explicit, outline: is_outline(text) }
}

/// Rules page → Edit → "Number it": a pasted outline gets its full numbers.
pub fn number_if_outline(text: &str) -> String {
    if is_outline(text) {
        number_outline(text)
    } else {
        text.to_string()
    }
}

/// Mostly bold numbers (an outline import): only those are rules, so the book's tables,
/// dates and sentences that start with a number stay text.
fn is_explicit<'a>(lines: impl IntoIterator<Item = &'a Line>) -> bool {
    let (bold, plain) = lines.into_iter().fold((0, 0), |(b, p), line| match line {
        Line::Rule { bold: true, .. } => (b + 1, p),
        Line::Rule { .. } => (b, p + 1),
        _ => (b, p),
    });
    bold > plain
}

/// The offending line as the steward wrote it, short enough for one row of the problem list.
fn excerpt(line: &str) -> String {
    let line = decode_entities(line.trim());
    let line = line.as_str();
    match line.char_indices().nth(EXCERPT_CHARS) {
        Some((cut, _)) => format!("{}…", &line[..cut]),
        None => line.to_string(),
    }
}

#[cfg(test)]
#[path = "check_tests.rs"]
mod tests;
