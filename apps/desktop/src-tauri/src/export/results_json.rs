//! The results file: every decision and penalty of the session as versioned JSON, for a
//! league website or a Discord bot. Public data only: no steward notes, no penalty notes,
//! no steward names (the lossless team file in share/ is the one that carries those).

use serde::Serialize;

use crate::domain::{
    Incident, IncidentStatus, IncidentType, InvolvedCar, PenaltyType, RuleRef, SessionInfo, SessionType,
};
use crate::text::{decode_entities, format_hms};

const FORMAT: &str = "stewardpad-results";
const VERSION: u32 = 1;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResultsFile {
    pub format: &'static str,
    pub version: u32,
    pub exported_at: String,
    pub event: Event,
    /// Every incident, in race order; `status` tells decided from still open.
    pub decisions: Vec<Decision>,
    /// One entry per penalised car, in incident order.
    pub penalties: Vec<PenaltyEntry>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub track_name: String,
    pub session_type: SessionType,
    pub server_name: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Decision {
    pub number: u32,
    /// "01:23:45", the session clock the replay is scrubbed to.
    pub session_time: String,
    pub event_seconds: f64,
    #[serde(rename = "type")]
    pub kind: IncidentType,
    pub status: IncidentStatus,
    pub cars: Vec<InvolvedCar>,
    pub rules: Vec<RuleRef>,
    /// Markdown, as the stewards wrote it.
    pub investigation: String,
    pub decision: String,
    pub penalty: Option<PenaltyEntry>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PenaltyEntry {
    pub incident: u32,
    pub car_number: String,
    pub car_class: String,
    pub driver_name: String,
    #[serde(rename = "type")]
    pub kind: PenaltyType,
    pub seconds: Option<i64>,
    pub served: bool,
    pub rules: Vec<String>,
}

/// `active` is already filtered to non-merged incidents.
pub fn build_results(active: &[Incident], session: &SessionInfo, exported_at: String) -> ResultsFile {
    let mut ordered: Vec<&Incident> = active.iter().collect();
    ordered.sort_by(|a, b| a.event_seconds.total_cmp(&b.event_seconds));
    let decisions: Vec<Decision> = ordered.into_iter().map(decision).collect();
    let mut penalties: Vec<PenaltyEntry> = decisions.iter().filter_map(|d| d.penalty.clone()).collect();
    penalties.sort_by_key(|p| p.incident);
    ResultsFile {
        format: FORMAT,
        version: VERSION,
        exported_at,
        event: Event {
            track_name: session.track_name.clone(),
            session_type: session.session_type,
            server_name: session.server_name.clone(),
        },
        decisions,
        penalties,
    }
}

fn decision(i: &Incident) -> Decision {
    Decision {
        number: i.sequence_number,
        session_time: format_hms(i.event_seconds),
        event_seconds: i.event_seconds,
        kind: i.kind,
        status: i.status,
        cars: i.cars.clone(),
        rules: i.rules.clone(),
        investigation: decode_entities(&i.summary),
        decision: decode_entities(&i.decision),
        penalty: penalty(i),
    }
}

/// The penalised car's class and driver come from the incident's own cars.
fn penalty(i: &Incident) -> Option<PenaltyEntry> {
    let penalty = i.penalty.as_ref()?;
    let car = i.cars.iter().find(|c| c.car_number == penalty.applied_to);
    Some(PenaltyEntry {
        incident: i.sequence_number,
        car_number: penalty.applied_to.clone(),
        car_class: car.map(|c| c.car_class.clone()).unwrap_or_default(),
        driver_name: car.map(|c| c.driver_name.clone()).unwrap_or_default(),
        kind: penalty.kind,
        seconds: penalty.seconds,
        served: penalty.served,
        rules: i.rules.iter().map(|r| r.code.clone()).collect(),
    })
}

#[cfg(test)]
#[path = "results_json_tests.rs"]
mod tests;
