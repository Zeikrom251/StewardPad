use serde_json::json;

use crate::core::Core;
use crate::incidents::input::{IncidentFields, QuickLogInput};
use crate::store::{Paths, Saver, Store};

fn core(name: &str) -> Core {
    let (saver, _changes) = Saver::channel();
    let dir = std::env::temp_dir().join(format!("stewardpad-claims-{name}-{}", std::process::id()));
    Core::new(Store::empty(), Paths::in_dir(&dir), saver)
}

fn edit(core: &mut Core, id: &str, fields: serde_json::Value) {
    let fields: IncidentFields = serde_json::from_value(fields).expect("fields");
    core.update(id, fields).expect("updates");
}

#[test]
fn stewards_claim_in_turn_and_each_removes_only_their_own() {
    let mut core = core("turns");
    let id = core.quick_log(QuickLogInput::default()).expect("logs").id;
    core.store.config.steward_name = "Ryan".into();
    assert_eq!(core.claim(&id).expect("claims").reviewers, ["Ryan"]);
    assert_eq!(core.claim(&id).expect("again").reviewers, ["Ryan"], "once each");
    core.store.config.steward_name = "Nina".into();
    assert_eq!(core.claim(&id).expect("claims").reviewers, ["Ryan", "Nina"]);
    assert_eq!(core.unclaim(&id).expect("unclaims").reviewers, ["Ryan"]);
    assert_eq!(core.unclaim(&id).expect("again").reviewers, ["Ryan"], "Ryan's claim stays");
}

#[test]
fn an_edit_claims_the_incident_once_and_a_save_that_changes_nothing_claims_nothing() {
    let mut core = core("edits");
    let id = core.quick_log(QuickLogInput::default()).expect("logs").id;
    assert!(core.get(&id).expect("kept").reviewers.is_empty(), "logging it claims nothing");
    core.store.config.steward_name = "Nina".into();
    edit(&mut core, &id, json!({ "status": "UNDER_INVESTIGATION" }));
    edit(&mut core, &id, json!({ "decision": "Five seconds" }));
    core.store.config.steward_name = "Ryan".into();
    edit(&mut core, &id, json!({ "decision": "Five seconds" }));
    assert_eq!(core.get(&id).expect("kept").reviewers, ["Nina"]);
}

#[test]
fn a_claim_needs_a_name_to_sign_it() {
    let mut core = core("nameless");
    let id = core.quick_log(QuickLogInput::default()).expect("logs").id;
    assert!(core.claim(&id).is_err());
}

#[test]
fn two_stewards_with_the_same_name_unclaim_one_at_a_time() {
    let mut reviewers = vec!["Alex".to_string(), "Nina".to_string(), "Alex".to_string()];
    crate::incidents::mark(&mut reviewers, "Alex", false);
    assert_eq!(reviewers, ["Alex", "Nina"]);
}
