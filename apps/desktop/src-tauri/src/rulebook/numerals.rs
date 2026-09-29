//! How an outline level writes its numbers, as Google Docs and Word do by default.

/// Level 0 is 1, 2, 3; level 1 is a, b, c; level 2 is i, ii, iii; then round again.
pub(super) fn numeral(level: usize, number: u32) -> String {
    match level % 3 {
        0 => number.to_string(),
        1 => letters(number),
        _ => roman(number),
    }
}
/// a … z, then aa, ab (Google Docs' own sequence).
fn letters(mut n: u32) -> String {
    let mut out = Vec::new();
    while n > 0 {
        n -= 1;
        out.push(char::from(b'a' + (n % 26) as u8));
        n /= 26;
    }
    out.iter().rev().collect()
}

fn roman(mut n: u32) -> String {
    const NUMERALS: [(u32, &str); 13] = [
        (1000, "m"),
        (900, "cm"),
        (500, "d"),
        (400, "cd"),
        (100, "c"),
        (90, "xc"),
        (50, "l"),
        (40, "xl"),
        (10, "x"),
        (9, "ix"),
        (5, "v"),
        (4, "iv"),
        (1, "i"),
    ];
    let mut out = String::new();
    for (value, numeral) in NUMERALS {
        while n >= value {
            out.push_str(numeral);
            n -= value;
        }
    }
    out
}
