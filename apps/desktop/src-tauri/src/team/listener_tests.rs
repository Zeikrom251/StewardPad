use std::time::Duration;

use super::{after_connection, FIRST_RETRY, LONGEST_RETRY};

#[test]
fn a_connection_that_ends_at_once_backs_off_and_a_long_one_reconnects_at_once() {
    let quick = Duration::from_millis(200);
    assert_eq!(after_connection(quick, FIRST_RETRY), (FIRST_RETRY, FIRST_RETRY * 2));
    assert_eq!(after_connection(quick, LONGEST_RETRY), (LONGEST_RETRY, LONGEST_RETRY));
    assert_eq!(after_connection(Duration::from_secs(600), LONGEST_RETRY), (Duration::ZERO, FIRST_RETRY));
}
