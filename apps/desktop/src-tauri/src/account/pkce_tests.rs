use super::*;

#[test]
fn the_challenge_is_rfc_7636_s256() {
    // RFC 7636, appendix B.
    assert_eq!(challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
}

#[test]
fn the_link_carries_the_challenge_state_and_pc_but_never_the_verifier() {
    let request = new_sign_in("https://stewardpad.com", Some("Léa's PC"), 1_700_000_000_000);
    assert_eq!(request.verifier.len(), 64);
    assert!(request.url.starts_with("https://stewardpad.com/sign-in/desktop?challenge="));
    assert!(request.url.contains(&format!("challenge={}&state={}", challenge(&request.verifier), request.state)));
    assert!(request.url.ends_with("&pc=L%C3%A9a%27s%20PC&t=1700000000000"));
    assert!(!request.url.contains(&request.verifier));
    assert_ne!(new_sign_in("s", None, 0).verifier, request.verifier);
}

#[test]
fn a_code_is_read_as_typed_or_from_the_link() {
    let typed = Handoff { code: "4f7k 2q9m".into(), state: None };
    assert_eq!(read_handoff(" 4f7k 2q9m "), Some(typed));
    let linked = read_handoff("stewardpad://signed-in?code=4F7K-2Q9M&state=abc");
    assert_eq!(linked, Some(Handoff { code: "4F7K-2Q9M".into(), state: Some("abc".into()) }));
    for wrong in ["", "4F7K", "4F7K-2Q9M-XXXX", "stewardpad://join?code=4F7K-2Q9M", "4F7K-2Q9!"] {
        assert_eq!(read_handoff(wrong), None, "{wrong}");
    }
}
