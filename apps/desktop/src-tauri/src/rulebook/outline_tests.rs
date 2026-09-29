use super::{is_outline, number_outline};
use crate::rulebook::parse_rules;

// Shaped like the VMS regulations exported from Google Docs as plain text: a contents list,
// levels indented three spaces, each level numbered from 1.
const EXPORT: &str = "VMS Regulations
Content:
Section 1: General Rules
Section 3: Racing Guidelines

Section 3: Racing Regulations
1. General Racing Regulations
   1. Drivers are expected to follow racing regulations at all times.
   2. Should the racing regulations not be followed, incidents can be reported.
      1. Incidents can be reported as outlined in section 4.
2. Behaviour on-track during Qualifying
   1. Bump drafting is not permitted during qualifying.
3. Behaviour on-track while Overtaking and Defending
   1. When a car has established overlap, racing room must be left.
   5. Overtaking and defending regulations are as follows:
      3. On a straight, adequate racing room should be given.
         1. Even with any overlap.
Section 4: Reports, Appeals & Penalties
8. Live Race Control
1. A live race control may be used in any session.
2. Penalties may be applied during a qualifying or race session.
PENALTY POINTS
0 or 1
5 Seconds/2m Quali hold
Section 9: Financial Regulations
Section 1: Purpose & Scope
Section 2: Entry Fees
1. Entry fees are present for all splits.
Section 10: Changelog
1. Regulations may be changed at any point.
";

fn rules(text: &str) -> Vec<String> {
    parse_rules(&number_outline(text)).into_iter().map(|r| format!("{} {}", r.code, r.title)).collect()
}

#[test]
fn a_google_docs_export_is_an_outline_and_a_hand_written_book_is_not() {
    assert!(is_outline(EXPORT));
    assert!(!is_outline("3 Racing\n3.1 Collisions\n3.2 Blocking\n3.3 Track limits"));
}

#[test]
fn levels_are_numbered_1_a_i_under_their_section() {
    let got = rules(EXPORT);
    for expected in [
        "3 Racing Regulations",
        "3.1 General Racing Regulations",
        "3.1.b Should the racing regulations not be followed, incidents can be reported.",
        "3.1.b.i Incidents can be reported as outlined in section 4.",
        "3.2.a Bump drafting is not permitted during qualifying.",
        "3.3.e Overtaking and defending regulations are as follows:",
        "3.3.e.iii On a straight, adequate racing room should be given.",
        "3.3.e.iii.1 Even with any overlap.",
    ] {
        assert!(got.iter().any(|r| r == expected), "missing {expected:?} in {got:#?}");
    }
}

#[test]
fn a_list_that_lost_its_indentation_is_nested_by_its_numbers() {
    let got = rules(EXPORT);
    assert!(got.contains(&"4.8 Live Race Control".to_string()));
    assert!(got.contains(&"4.8.a A live race control may be used in any session.".to_string()));
    assert!(got.contains(&"4.8.b Penalties may be applied during a qualifying or race session.".to_string()));
}

#[test]
fn the_contents_list_tables_and_an_appendix_with_its_own_sections_fit() {
    let got = rules(EXPORT);
    assert_eq!(got.iter().filter(|r| r.starts_with("1 ")).count(), 0, "contents entries are not rules");
    assert!(!got.iter().any(|r| r.starts_with("5 ") || r.starts_with("0 ")), "table cells are not rules");
    assert!(got.contains(&"9.2 Entry Fees".to_string()));
    assert!(got.contains(&"9.2.1 Entry fees are present for all splits.".to_string()));
    assert!(got.contains(&"10.1 Regulations may be changed at any point.".to_string()));
}

#[test]
fn a_list_pasted_into_the_editor_is_numbered_too() {
    // What the editor sends after pasting from Google Docs: 2-space nested lists, "&amp;".
    let pasted = "Section 1: General &amp; Conduct\n\n1. Discord Server &amp; Events\n  1. All drivers must be present.\n  2. All drivers must follow VMS.\n    1. Please use tickets.\n2. Hardware\n  1. Sufficient hardware.\n  2. Logging enabled.\n    1. Provide logs.\n    2. Within 24 hours.\n";
    assert!(is_outline(pasted));
    let got = rules(pasted);
    assert!(got.contains(&"1.1 Discord Server & Events".to_string()), "{got:#?}");
    assert!(got.contains(&"1.1.b.i Please use tickets.".to_string()), "{got:#?}");
    assert!(got.contains(&"1.2.b.ii Within 24 hours.".to_string()), "{got:#?}");
}

// Shaped like VMS Section 6: unnumbered sub-headings, and numbering that continues
// across lists ("5." under the second LMGT3), as Google Docs' "continue numbering" writes.
const FORMATS: &str = "Section 6: Event Format
Sprint Race Format (Pro ONLY):
   1. Practice - 10 minutes.
   2. In a multiclass event, qualifying will work as follows:
LMGT3:
         1. Will always qualify first.
         2. Will be allowed on track from 25:00.
HYPERCAR:
1. Are allowed to queue from 11:00.
2. Will be allowed on track from 10:00.
Endurance Race Format (Pro ONLY):
1. Practice - 10 minutes.
2. In a multiclass event, qualifying will work as follows:
LMGT3:
         3. Will always qualify first.
HYPERCAR:
3. Are allowed to queue from 11:00.
Section 7: Points
1. Champions
   1. The champion has the most points.
   2. Ties go to countback:
      1. Wins first.
   1. If no champion can be determined, the Admin team decides.
";

#[test]
fn sub_headings_group_the_rules_under_them() {
    let got = rules(FORMATS);
    for expected in [
        "6.1 Sprint Race Format (Pro ONLY)",
        "6.1.b.i LMGT3",
        "6.1.b.i.1 Will always qualify first.",
        "6.1.b.ii HYPERCAR",
        "6.1.b.ii.1 Are allowed to queue from 11:00.",
        "6.2 Endurance Race Format (Pro ONLY)",
        "6.2.b.i.3 Will always qualify first.",
        "6.2.b.ii.3 Are allowed to queue from 11:00.",
    ] {
        assert!(got.iter().any(|r| r == expected), "missing {expected:?} in {got:#?}");
    }
}

#[test]
fn every_rule_number_is_unique_even_when_a_list_restarts() {
    let numbered = number_outline(FORMATS);
    let check = crate::rulebook::check_rules(&numbered);
    assert!(check.problems.is_empty(), "{:?}", check.problems);
    let got = rules(FORMATS);
    assert!(got.contains(&"7.1.c If no champion can be determined, the Admin team decides.".to_string()), "{got:#?}");
}
