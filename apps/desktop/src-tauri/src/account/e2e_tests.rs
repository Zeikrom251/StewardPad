//! Desktop sign-in against a running API: the browser's session (seeded, as Discord's callback
//! leaves it) becomes a one-time code, and only this PC's verifier turns it into a token.

use std::time::Duration;

use serde_json::json;

use super::pkce::{new_sign_in, read_handoff};
use crate::api::wire::{DesktopSignIn, Me};
use crate::api::Api;

fn finish(api_url: &str, sign_in_url: &str, cookie: &str) -> String {
    let query = sign_in_url.split_once('?').map(|(_, q)| q).expect("a query");
    let finish = format!("{api_url}/api/desktop-sign-in/finish?{query}");
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .max_redirects(0)
        .http_status_as_error(false)
        .timeout_global(Some(Duration::from_secs(10)))
        .build()
        .into();
    let response = agent.get(&finish).header("cookie", cookie).call().expect("the API answers");
    let location = response.headers().get("location").and_then(|l| l.to_str().ok()).unwrap_or_default();
    location.split_once('#').map(|(_, fragment)| fragment.to_string()).expect("a fragment")
}

#[test]
#[ignore = "needs a local API and a seeded browser session"]
fn the_browsers_code_and_this_pcs_verifier_sign_the_app_in() {
    let (Ok(api_url), Ok(cookie)) =
        (std::env::var("STEWARDPAD_API_URL"), std::env::var("STEWARDPAD_E2E_OWNER_BROWSER"))
    else {
        return;
    };
    let cookie = format!("sp.session_token={}", cookie.replace('+', "%2B").replace('/', "%2F").replace('=', "%3D"));
    let request = new_sign_in("http://localhost:5173", Some("E2E-PC"), 1);
    let fragment = finish(&api_url, &request.url, &cookie);
    let link = format!("stewardpad://signed-in?{}", fragment.replace("&name=", "&x=").replace("&user=", "&y="));
    let handoff = read_handoff(&link).expect("the page's link reads");
    assert_eq!(handoff.state.as_deref(), Some(request.state.as_str()));

    let api = Api::new();
    let stolen = json!({ "code": handoff.code, "verifier": new_sign_in("s", None, 1).verifier });
    let refused =
        api.post::<_, DesktopSignIn>("/desktop-sign-in/redeem", &stolen).err().expect("a code alone is useless");
    assert_eq!(refused.code(), Some("INVALID_CODE"));
    let body = json!({ "code": handoff.code, "verifier": request.verifier });
    let signed: DesktopSignIn = api.post("/desktop-sign-in/redeem", &body).expect("this PC's verifier");
    api.set_token(Some(signed.token));
    let me: Me = api.get("/me").expect("the new token works");
    assert_eq!(me.id, signed.user.id);
    api.post::<_, serde_json::Value>("/auth/sign-out", &json!({})).expect("signs out");
    assert!(api.get::<Me>("/me").expect_err("the token is gone").is_signed_out());
}
