//! The desktop against a running API (the website repo's `docker compose up`): two stewards'
//! PCs sharing a league session. Ignored by default; DEVELOPMENT.md → "Team sync against a
//! local API" says how to seed the two accounts and run them.

use std::sync::mpsc::{channel, Receiver};
use std::time::Duration;

use serde_json::{json, Value};

use super::sender::send;
use super::TeamLink;
use crate::api::events::{EventStream, Line, SseEvent};
use crate::api::wire::{CreatedInvite, Me, MyLeague, SessionView};
use crate::api::Api;
use crate::core::Core;
use crate::domain::{IncidentStatus, InvolvedRole};
use crate::incidents::input::IncidentFields;
use crate::store::{Paths, Saver, Store};
use crate::test_support::car;

pub(super) struct Pc {
    pub api: Api,
    pub core: Core,
}

pub(super) fn env(key: &str) -> Option<String> {
    std::env::var(format!("STEWARDPAD_E2E_{key}")).ok()
}

fn pc(token: String) -> Pc {
    let api = Api::new();
    api.set_token(Some(token));
    let (saver, _changes) = Saver::channel();
    let dir = std::env::temp_dir().join(format!("stewardpad-e2e-{}", uuid::Uuid::new_v4().simple()));
    let mut core = Core::new(Store::empty(), Paths::in_dir(&dir), saver);
    core.account.me = Some(api.get::<Me>("/me").expect("the seeded token works"));
    Pc { api, core }
}

/// The owner's PC and a steward's, in a fresh league with one open session.
pub(super) fn crew() -> Option<(Pc, Pc, MyLeague, SessionView)> {
    let (mut owner, mut steward) = (pc(env("OWNER_DESKTOP")?), pc(env("STEWARD_DESKTOP")?));
    let name = format!("E2E {}", &uuid::Uuid::new_v4().simple().to_string()[..8]);
    let league: MyLeague = owner.api.post("/leagues", &json!({ "name": name })).expect("owner subscribed");
    let invite: CreatedInvite = owner.api.post(&format!("/leagues/{}/invites", league.id), &json!({})).expect("invite");
    steward.api.post::<_, Value>(&format!("/invites/{}/accept", invite.code), &json!({})).expect("joins");
    let body = json!({ "title": "Round 1", "trackName": "Spa", "type": "RACE" });
    let session: SessionView = owner.api.post(&format!("/leagues/{}/sessions", league.id), &body).expect("session");
    for pc in [&mut owner, &mut steward] {
        let me = pc.core.account.me.clone().expect("signed in");
        pc.core.store.team = Some(TeamLink::new(league.id.clone(), name.clone(), me.id, session.clone()));
    }
    Some((owner, steward, league, session))
}

/// Sends everything this PC has queued, as the sender thread would.
pub(super) fn flush(pc: &mut Pc) {
    while let Some(item) = pc.core.next_outgoing() {
        let answer = send(&pc.api, &item);
        pc.core.settle(&item, answer);
    }
}

pub(super) fn events(pc: &Pc, league: &MyLeague) -> Receiver<SseEvent> {
    let body = pc.api.open_events(&format!("/leagues/{}/events", league.id), Some("0")).expect("events open");
    let (lines, incoming) = channel();
    std::thread::spawn(move || {
        let mut stream = EventStream::new(body);
        while let Ok(Some(line)) = stream.next_line() {
            if let Line::Event(event) = line {
                if lines.send(event).is_err() {
                    return;
                }
            }
        }
    });
    incoming
}

/// Applies the live events that arrive within a second or two.
pub(super) fn drain(pc: &mut Pc, incoming: &Receiver<SseEvent>) -> Vec<String> {
    let mut names = Vec::new();
    while let Ok(event) = incoming.recv_timeout(Duration::from_millis(1500)) {
        pc.core.on_live_event(&event);
        names.push(event.name);
    }
    names
}

pub(super) fn delete_league(owner: &Pc, league: &MyLeague) {
    owner.api.delete::<()>(&format!("/leagues/{}", league.id)).expect("the owner deletes the test league");
}

#[test]
#[ignore = "needs a local API and two seeded accounts"]
fn two_pcs_share_one_incident_and_settle_a_same_field_edit() {
    let Some((mut owner, mut steward, league, _)) = crew() else { return };
    let live = events(&steward, &league);
    let mut cars = vec![car("7", "HYPERCAR"), car("51", "LMGT3")];
    cars[0].role = InvolvedRole::Caused;
    let fields = IncidentFields { event_seconds: Some(120.0), cars: Some(cars), ..IncidentFields::default() };
    let logged = owner.core.create(fields).expect("logged");
    flush(&mut owner);
    let synced = owner.core.get(&logged.id).expect("kept");
    assert_eq!((synced.version, synced.sequence_number, synced.logged_by.as_str()), (1, 1, "E2E Owner"));

    // The steward's PC hears of it live, then changes the status while the owner (still on
    // version 1) writes the summary and the status too.
    drain(&mut steward, &live);
    let theirs = steward.core.get(&logged.id).expect("arrived live");
    assert_eq!(theirs.cars.len(), 2);
    let status = |status| IncidentFields { status: Some(status), ..IncidentFields::default() };
    steward.core.update(&logged.id, status(IncidentStatus::UnderInvestigation)).expect("steward edits");
    flush(&mut steward);
    let summary = IncidentFields { summary: Some("Contact at La Source".into()), ..IncidentFields::default() };
    owner.core.update(&logged.id, summary).expect("summary");
    owner.core.update(&logged.id, status(IncidentStatus::NoFurtherAction)).expect("status");
    flush(&mut owner);

    let mine = owner.core.get(&logged.id).expect("kept");
    assert_eq!(mine.status, IncidentStatus::NoFurtherAction, "the newer edit wins");
    assert!(mine.edited_twice, "and says it was edited twice");
    assert_eq!(owner.core.link().map(|l| l.outbox.len()), Some(0), "nothing left to send");
    drain(&mut steward, &live);
    let theirs = steward.core.get(&logged.id).expect("kept");
    assert_eq!((theirs.status, theirs.summary.as_str()), (mine.status, "Contact at La Source"));
    assert_eq!(theirs.version, mine.version);
    assert_eq!(theirs.reviewers, ["E2E Steward", "E2E Owner"], "both edited it: both claimed it");
    // Both edited it, so both claimed it. The owner steps back; the steward's PC hears of it.
    owner.core.unclaim(&logged.id).expect("unclaims");
    flush(&mut owner);
    drain(&mut steward, &live);
    assert_eq!(steward.core.get(&logged.id).expect("kept").reviewers, ["E2E Steward"]);
    delete_league(&owner, &league);
}
