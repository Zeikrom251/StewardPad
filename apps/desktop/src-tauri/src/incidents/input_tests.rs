use crate::domain::{InvolvedCar, InvolvedRole};

#[test]
fn a_car_can_be_marked_as_the_one_that_caused_it_or_suffered_from_it() {
    for (wire, role) in [("CAUSED", InvolvedRole::Caused), ("AFFECTED", InvolvedRole::Affected)] {
        let json = format!(
            r#"{{"carNumber":"38","driverName":"T. Lindqvist","carClass":"LMGT3","lapAtIncident":12,"role":"{wire}"}}"#
        );
        let car: InvolvedCar = serde_json::from_str(&json).expect("role from the UI");
        assert_eq!(car.role, role);
    }
}
