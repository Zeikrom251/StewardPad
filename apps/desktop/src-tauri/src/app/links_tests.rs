use super::as_written;

#[test]
fn reads_a_link_windows_gave_a_slash_before_the_query() {
    let code = "stewardpad://signed-in?code=4F7K-2Q9M&state=abc";
    assert_eq!(as_written("stewardpad://signed-in/?code=4F7K-2Q9M&state=abc"), code);
    assert_eq!(as_written(code), code, "as the website writes it");
    assert_eq!(as_written("stewardpad://join/?code=x"), "stewardpad://join?code=x");
    assert_eq!(as_written("stewardpad://other/?a=1"), "stewardpad://other/?a=1", "unknown links stay as they are");
}
