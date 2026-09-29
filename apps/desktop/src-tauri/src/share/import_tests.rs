use crate::core::Core;
use crate::domain::SessionType;
use crate::incidents::input::QuickLogInput;
use crate::lmu::{LmuEvent, LmuUpdate};
use crate::store::{Paths, Saver, Store};
use crate::test_support::{incident, session};

fn core_at(dir: &std::path::Path, track: &str) -> Core {
    let (saver, _) = Saver::channel();
    let mut core = Core::new(Store::empty(), Paths::in_dir(dir), saver);
    let update = LmuUpdate { session: session(track, SessionType::Race, 60.0), standings: vec![], collisions: vec![] };
    core.apply_lmu(LmuEvent::Update(update));
    core
}

fn temp(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("stewardpad-share-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).expect("temp dir");
    dir
}

/// Steward 2's PC: one incident of their own, exported to a file.
fn exported_by_steward_2(dir: &std::path::Path, track: &str) -> std::path::PathBuf {
    let mut other = core_at(&dir.join("steward-2"), track);
    other.store.save(incident("s2-manual", 1));
    let path = dir.join("steward-2.json");
    std::fs::write(&path, serde_json::to_string(&other.session_file()).expect("json")).expect("writes");
    path
}

#[test]
fn imports_another_stewards_file_after_backing_up_this_session() {
    let dir = temp("ok");
    let mut mine = core_at(&dir.join("steward-1"), "Monza");
    mine.quick_log(QuickLogInput::default()).expect("logs");
    let report = mine.import_sessions(&[exported_by_steward_2(&dir, "Monza")]).expect("imports");
    let file = &report.files[0];
    assert_eq!((file.added, file.error.as_deref()), (1, None));
    assert_eq!(mine.list().len(), 2);
    assert!(std::path::Path::new(&report.backup.expect("backed up")).exists());
}

#[test]
fn a_file_from_another_session_is_skipped_with_a_reason() {
    let dir = temp("other");
    let mut mine = core_at(&dir.join("steward-1"), "Monza");
    let report = mine.import_sessions(&[exported_by_steward_2(&dir, "Sebring")]).expect("imports");
    assert!(report.files[0].error.as_deref().is_some_and(|e| e.contains("Sebring")));
    assert!(mine.list().is_empty());
}
