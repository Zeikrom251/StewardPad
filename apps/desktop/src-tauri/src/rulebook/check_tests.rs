use super::parse_rules;

fn codes(text: &str) -> Vec<(String, String)> {
    parse_rules(text).into_iter().map(|r| (r.code, r.title)).collect()
}

#[test]
fn numbered_lines_become_rules_in_document_order() {
    let text = "LEAGUE SPORTING CODE\n\n3 Racing conduct\n3.2 Causing a collision\nDrivers must leave room.\n3.2.1. Lap one incidents";
    assert_eq!(
        codes(text),
        vec![
            ("3".into(), "Racing conduct".into()),
            ("3.2".into(), "Causing a collision".into()),
            ("3.2.1".into(), "Lap one incidents".into()),
        ]
    );
}

#[test]
fn understands_markdown_headings_and_common_prefixes() {
    let text = "## 4.1.a — Blocking\nArticle 12: Track limits\n§ 7) Pit lane speed\n- 8.3 Unsafe rejoin";
    let got: Vec<String> = codes(text).into_iter().map(|(c, t)| format!("{c} {t}")).collect();
    assert_eq!(got, ["4.1.a Blocking", "12 Track limits", "7 Pit lane speed", "8.3 Unsafe rejoin"]);
}

#[test]
fn ignores_prose_dates_and_bare_numbers() {
    let text = "Page 3 of 40\n2026 season\n14\nThe stewards may apply 5 second penalties.";
    // "2026 season" is a numbered line by shape; prose and bare numbers are not.
    assert_eq!(codes(text), vec![("2026".into(), "season".into())]);
}

#[test]
fn a_repeated_number_keeps_its_first_title() {
    let text = "3.2 Causing a collision\n3.2 Causing a collision (continued)";
    assert_eq!(codes(text).len(), 1);
}

mod check {
    use super::super::{check_rules, edited_rulebook};

    fn messages(text: &str) -> Vec<String> {
        check_rules(text).problems.into_iter().map(|p| p.message).collect()
    }

    #[test]
    fn a_well_formed_book_has_no_problems() {
        let text = "# League code\n\n## 3 Racing conduct\n\n3.2 Causing a collision\nDrivers must leave room.\n\n14\n";
        let check = check_rules(text);
        assert!(check.problems.is_empty(), "{:?}", check.problems);
        assert_eq!(check.rules.len(), 2);
    }

    #[test]
    fn flags_a_repeated_number_with_the_line_at_fault() {
        let check = check_rules("3.2 Causing a collision\n3.2 Blocking");
        assert_eq!(check.problems.len(), 1);
        assert_eq!(check.problems[0].line, "3.2 Blocking");
        assert!(check.problems[0].message.contains("numbered twice"));
    }

    #[test]
    fn flags_bad_numbers_and_untitled_rules() {
        let got = messages("1 General\n3.2A Blocking\n3.2");
        assert_eq!(got.len(), 2, "{got:?}");
        assert!(got[0].contains("not a rule number"));
        assert!(got[1].contains("has no title"));
    }

    #[test]
    fn a_long_rule_is_titled_by_its_first_sentence() {
        let text = format!("4.1 Racing room must be left. {}", "More detail. ".repeat(20));
        let check = check_rules(&text);
        assert!(check.problems.is_empty());
        assert_eq!(check.rules[0].title, "Racing room must be left.");
    }

    #[test]
    fn dates_times_and_table_cells_are_not_rules() {
        let got = super::codes("25/05/2026 - S5 V1.0:\n18:00 GMT\n0 or 1\n1st\n3.2 Causing a collision");
        assert_eq!(got, vec![("3.2".into(), "Causing a collision".into())]);
    }

    #[test]
    fn in_a_book_of_bold_numbers_only_those_are_rules() {
        let text = "**3.3.a** Causing a collision is prohibited.\n**3.3.b** Blocking.\n**3.3.d** Brake testing.\n5 Seconds/2m Quali hold\n3.3.c Forgot the bold";
        let check = check_rules(text);
        assert!(check.explicit);
        assert_eq!(check.rules.len(), 3);
        assert_eq!(check.problems.len(), 1, "{:?}", check.problems);
        assert!(check.problems[0].message.contains("not bold"));
    }

    #[test]
    fn a_book_without_rules_is_a_problem() {
        assert_eq!(messages("Just prose.").len(), 1);
    }

    #[test]
    fn reads_escaped_list_numbers_and_bold_titles() {
        let check = check_rules("5\\. Pit lane\n**3.2 Causing a collision**");
        let got: Vec<String> = check.rules.into_iter().map(|r| format!("{} {}", r.code, r.title)).collect();
        assert_eq!(got, ["5 Pit lane", "3.2 Causing a collision"]);
    }

    #[test]
    fn an_edit_with_a_problem_is_refused_and_a_clean_one_kept_whole() {
        assert!(edited_rulebook("Book".into(), "3.2 A\n3.2 B".into()).is_err());
        let book = edited_rulebook("Book".into(), "3.2 A\nBody text.".into()).expect("clean book");
        assert_eq!(book.text, "3.2 A\nBody text.");
        assert_eq!(book.rules.len(), 1);
    }
}
