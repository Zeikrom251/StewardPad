//! The league's live timing, rebuilt from the API's `timing` events: a keyframe replaces the
//! frame, a delta applies only on top of the frame it was cut from (apps/server/src/modules/
//! streams/timing-codec.ts, applyTiming, in the website repo). A missed delta waits for the
//! next keyframe (30 s at most), so the timing shown is never wrong, at worst late.

use serde::Deserialize;
use serde_json::{Map, Value};

use crate::api::wire::TimingFrame;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Delta {
    stream_id: String,
    seq: u32,
    base_seq: u32,
    #[serde(default)]
    session: Map<String, Value>,
    #[serde(default)]
    changed: Vec<Map<String, Value>>,
    #[serde(default)]
    removed: Vec<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Keyframe {
    stream_id: String,
    #[serde(flatten)]
    frame: TimingFrame,
}

/// The frame after `event`, with its stream id; None when the event doesn't apply.
pub(super) fn apply_timing(held: Option<&(String, TimingFrame)>, event: &Value) -> Option<(String, TimingFrame)> {
    match event.get("type").and_then(Value::as_str)? {
        "key" => {
            let key: Keyframe = serde_json::from_value(event.clone()).ok()?;
            Some((key.stream_id, key.frame))
        }
        "delta" => {
            let delta: Delta = serde_json::from_value(event.clone()).ok()?;
            let (stream_id, frame) = held?;
            (*stream_id == delta.stream_id && frame.seq == delta.base_seq).then(|| apply_delta(frame, delta))?
        }
        _ => None,
    }
}

fn apply_delta(frame: &TimingFrame, delta: Delta) -> Option<(String, TimingFrame)> {
    let mut session = object(serde_json::to_value(&frame.session).ok()?);
    session.extend(delta.session);
    let mut cars: Vec<Map<String, Value>> = frame
        .standings
        .iter()
        .filter(|car| !delta.removed.contains(&car.slot_id))
        .filter_map(|car| serde_json::to_value(car).ok().map(object))
        .collect();
    for change in delta.changed {
        let slot = change.get("slotId").cloned();
        match cars.iter_mut().find(|car| car.get("slotId") == slot.as_ref()) {
            Some(car) => car.extend(change),
            // A car this PC doesn't hold yet arrives whole.
            None => cars.push(change),
        }
    }
    let next = serde_json::json!({ "seq": delta.seq, "session": session, "standings": cars });
    Some((delta.stream_id, serde_json::from_value(next).ok()?))
}

fn object(value: Value) -> Map<String, Value> {
    match value {
        Value::Object(map) => map,
        _ => Map::new(),
    }
}

#[cfg(test)]
#[path = "timing_tests.rs"]
mod tests;
