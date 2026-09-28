use super::*;
use crate::test_support::standing;

fn live_incidents() -> Vec<RawLmuContact> {
    serde_json::from_str(include_str!("../../tests/fixtures/live-incidents.json")).expect("fixture parses")
}

fn live_standings() -> Vec<StandingEntry> {
    vec![
        standing(1, "7", "Anton Saxe", ""),
        standing(2, "23", "Charly Charpentier", ""),
        standing(3, "55", "Dan Butler", ""),
    ]
}

fn contact(player: &str, contact_with: &str, et: f64) -> RawLmuContact {
    RawLmuContact { player: player.into(), contact_with: contact_with.into(), et }
}

fn resolve(raw: &[RawLmuContact], standings: &[StandingEntry]) -> (Vec<LmuCollision>, Vec<String>) {
    let mut reported = Vec::new();
    let collisions = resolve_collisions(raw, standings, &mut |name| reported.push(name.to_string()));
    (collisions, reported)
}

#[test]
fn collapses_the_live_46_entry_feed_to_35_collisions() {
    let (collisions, reported) = resolve(&live_incidents(), &live_standings());
    assert!(reported.is_empty());
    assert_eq!(collisions.len(), 35);
    assert_eq!(collisions.iter().filter(|c| c.kind == IncidentType::Contact).count(), 16);
    assert_eq!(collisions.iter().filter(|c| c.kind == IncidentType::OffTrack).count(), 19);
}

#[test]
fn a_symmetric_pair_becomes_one_two_car_contact_at_the_earlier_time() {
    let raw =
        [contact("Anton Saxe", "Charly Charpentier", 1831.68), contact("Charly Charpentier", "Anton Saxe", 1831.69)];
    let (collisions, _) = resolve(&raw, &live_standings());
    assert_eq!(collisions.len(), 1);
    assert_eq!(collisions[0].kind, IncidentType::Contact);
    assert_eq!(collisions[0].et, 1831.68);
    let mut numbers: Vec<&str> = collisions[0].cars.iter().map(|c| c.car_number.as_str()).collect();
    numbers.sort();
    assert_eq!(numbers, ["23", "7"]);
}

#[test]
fn two_contacts_between_the_same_pair_seconds_apart_stay_two() {
    let raw = [
        contact("Anton Saxe", "Charly Charpentier", 2049.79),
        contact("Charly Charpentier", "Anton Saxe", 2049.85),
        contact("Anton Saxe", "Charly Charpentier", 2051.28),
        contact("Charly Charpentier", "Anton Saxe", 2051.35),
    ];
    assert_eq!(resolve(&raw, &live_standings()).0.len(), 2);
}

#[test]
fn immovable_yields_a_one_car_off_track_never_a_phantom_second_car() {
    let (collisions, _) = resolve(&[contact("Charly Charpentier", "Immovable", 1873.29)], &live_standings());
    assert_eq!(collisions[0].kind, IncidentType::OffTrack);
    assert_eq!(collisions[0].cars.len(), 1);
    assert_eq!(collisions[0].cars[0].car_number, "23");
    assert_eq!(collisions[0].unresolved_other, None);
}

#[test]
fn an_unresolvable_player_is_reported_not_fabricated() {
    let raw = [contact("Ghost Driver", "Anton Saxe", 100.0), contact("Anton Saxe", "Charly Charpentier", 200.0)];
    let (collisions, reported) = resolve(&raw, &live_standings());
    assert_eq!(reported, ["Ghost Driver"]);
    assert_eq!(collisions.len(), 1);
}

#[test]
fn an_unknown_contact_with_is_one_car_with_the_raw_text_kept() {
    let (collisions, _) = resolve(&[contact("Anton Saxe", "Some New Sentinel", 300.0)], &live_standings());
    assert_eq!(collisions[0].kind, IncidentType::OffTrack);
    assert_eq!(collisions[0].unresolved_other.as_deref(), Some("Some New Sentinel"));
}

#[test]
fn a_grown_cumulative_list_adds_exactly_one_new_key() {
    let first: Vec<String> = resolve(&live_incidents(), &live_standings()).0.into_iter().map(|c| c.key).collect();
    let again: Vec<String> = resolve(&live_incidents(), &live_standings()).0.into_iter().map(|c| c.key).collect();
    assert_eq!(first, again, "same input, same keys");
    let mut grown = live_incidents();
    grown.push(contact("Anton Saxe", "Immovable", 2500.0));
    let new: Vec<LmuCollision> =
        resolve(&grown, &live_standings()).0.into_iter().filter(|c| !first.contains(&c.key)).collect();
    assert_eq!(new.len(), 1);
    assert_eq!(new[0].et, 2500.0);
}

// Regression: two cars sharing #77 in different classes. The contact must resolve to
// its own slot, never whichever standings row comes first for that number.
#[test]
fn shared_car_numbers_resolve_to_the_right_slot() {
    let mut standings = live_standings();
    standings.push(standing(4, "77", "Ryan Chikhi", "LMGT3"));
    standings.push(standing(5, "77", "Tristan Vignal", "HYPERCAR"));
    let (collisions, _) = resolve(&[contact("Tristan Vignal", "Immovable", 500.0)], &standings);
    assert_eq!(collisions[0].cars[0].slot_id, 5);
    assert_eq!(collisions[0].cars[0].car_class, "HYPERCAR");
}

#[test]
fn a_name_matching_two_slots_is_unresolved_never_the_first_match() {
    let mut standings = live_standings();
    standings.push(standing(6, "81", "Sam Ito", "LMP2"));
    standings.push(standing(7, "82", "Sam Ito", "LMP2"));
    let raw = [contact("Sam Ito", "Immovable", 700.0), contact("Anton Saxe", "Charly Charpentier", 800.0)];
    let (collisions, reported) = resolve(&raw, &standings);
    assert_eq!(reported, ["Sam Ito"]);
    assert_eq!(collisions.len(), 1);
}
