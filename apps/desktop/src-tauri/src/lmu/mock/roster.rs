//! Fictional 24-car grid across three classes — not real drivers or teams. '77' is
//! deliberately used by both HYPERCAR and LMGT3: real grids don't guarantee unique
//! numbers across classes, and this lets the simulator demo the slotID identity fix.

pub struct RosterEntry {
    pub car_number: &'static str,
    pub driver_name: String,
    pub team_name: &'static str,
    pub car_class: &'static str,
    pub base_lap_seconds: f64,
    pub base_top_speed_kph: f64,
}

struct ClassSpec {
    class: &'static str,
    lap_seconds: f64,
    top_speed: f64,
    numbers: [&'static str; 8],
}

const CLASSES: [ClassSpec; 3] = [
    ClassSpec {
        class: "HYPERCAR",
        lap_seconds: 107.0,
        top_speed: 300.0,
        numbers: ["2", "7", "8", "15", "36", "50", "83", "77"],
    },
    ClassSpec {
        class: "LMP2",
        lap_seconds: 112.0,
        top_speed: 290.0,
        numbers: ["9", "22", "23", "28", "31", "35", "38", "48"],
    },
    ClassSpec {
        class: "LMGT3",
        lap_seconds: 119.0,
        top_speed: 270.0,
        numbers: ["46", "54", "55", "60", "63", "77", "85", "92"],
    },
];

const FIRST_NAMES: [&str; 24] = [
    "Liam", "Noah", "Mateo", "Lucas", "Elena", "Sofia", "Kenji", "Priya", "Marco", "Anders", "Hugo", "Fabio", "Nina",
    "Omar", "Theo", "Yuki", "Ben", "Carlos", "Erik", "Freya", "Ivo", "Jonas", "Karin", "Leo",
];

const LAST_NAMES: [&str; 24] = [
    "Dubois",
    "Rossi",
    "Larsen",
    "Alvarez",
    "Kowalski",
    "Nakamura",
    "Silva",
    "Weber",
    "Novak",
    "Petrov",
    "Costa",
    "Berger",
    "Moreau",
    "Haddad",
    "Lindqvist",
    "Okada",
    "Reyes",
    "Fischer",
    "Bianchi",
    "Holm",
    "Andrade",
    "Meyer",
    "Sato",
    "Vidal",
];

const TEAM_NAMES: [&str; 8] = [
    "Nordwind Racing",
    "Scuderia Levante",
    "Ironclad Motorsport",
    "Aurora Endurance",
    "Meridian Racing Team",
    "Vantage Competition",
    "Solstice Motorsport",
    "Redline Racing",
];

pub fn build_roster() -> Vec<RosterEntry> {
    let mut roster = Vec::new();
    for spec in &CLASSES {
        for number in spec.numbers {
            let index = roster.len();
            roster.push(RosterEntry {
                car_number: number,
                driver_name: format!("{} {}", FIRST_NAMES[index % 24], LAST_NAMES[index % 24]),
                team_name: TEAM_NAMES[index % 8],
                car_class: spec.class,
                base_lap_seconds: spec.lap_seconds,
                base_top_speed_kph: spec.top_speed,
            });
        }
    }
    roster
}
