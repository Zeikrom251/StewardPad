//! Pure CSV formatting: BOM, quoting, and the formula-injection guard (prompt §7.7).

const FORMULA_PREFIXES: [char; 4] = ['=', '+', '-', '@'];

pub fn escape_field(raw: &str, delimiter: char) -> String {
    let guarded = guard_formula_injection(raw);
    let needs_quoting =
        guarded.contains(delimiter) || guarded.contains('"') || guarded.contains('\n') || guarded.contains('\r');
    if !needs_quoting {
        return guarded;
    }
    format!("\"{}\"", guarded.replace('"', "\"\""))
}

/// A cell starting with = + - @ would run as a formula in Excel — prefix a quote so it's text.
fn guard_formula_injection(value: &str) -> String {
    if value.starts_with(FORMULA_PREFIXES) {
        format!("'{value}")
    } else {
        value.to_string()
    }
}

fn build_row(fields: &[String], delimiter: char) -> String {
    let escaped: Vec<String> = fields.iter().map(|f| escape_field(f, delimiter)).collect();
    escaped.join(&delimiter.to_string())
}

/// UTF-8 BOM so Excel opens it as UTF-8; CRLF line endings.
pub fn build_csv(header: &[&str], rows: &[Vec<String>], delimiter: char) -> String {
    let header: Vec<String> = header.iter().map(|h| h.to_string()).collect();
    let mut lines = vec![build_row(&header, delimiter)];
    lines.extend(rows.iter().map(|row| build_row(row, delimiter)));
    format!("\u{FEFF}{}", lines.join("\r\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quotes_a_field_containing_the_delimiter() {
        assert_eq!(escape_field("a;b", ';'), "\"a;b\"");
    }

    #[test]
    fn leaves_a_field_alone_when_it_contains_the_other_delimiter() {
        assert_eq!(escape_field("a,b", ';'), "a,b");
    }

    #[test]
    fn doubles_internal_quotes_and_wraps_the_field() {
        assert_eq!(escape_field("say \"hi\"", ';'), "\"say \"\"hi\"\"\"");
    }

    #[test]
    fn quotes_a_field_containing_a_newline_or_carriage_return() {
        assert_eq!(escape_field("line1\nline2", ';'), "\"line1\nline2\"");
        assert_eq!(escape_field("line1\rline2", ';'), "\"line1\rline2\"");
    }

    #[test]
    fn prefixes_a_formula_injection_field_with_a_single_quote() {
        assert_eq!(escape_field("=SUM(A1)", ';'), "'=SUM(A1)");
        assert_eq!(escape_field("+1", ';'), "'+1");
        assert_eq!(escape_field("-1", ';'), "'-1");
        assert_eq!(escape_field("@cmd", ';'), "'@cmd");
    }

    #[test]
    fn leaves_a_plain_field_untouched() {
        assert_eq!(escape_field("CONTACT", ';'), "CONTACT");
    }

    #[test]
    fn prefixes_a_bom_and_joins_rows_with_crlf() {
        let csv = build_csv(&["a", "b"], &[vec!["1".into(), "2".into()]], ';');
        assert_eq!(csv, "\u{FEFF}a;b\r\n1;2");
    }
}
