mod app;
mod commands;
mod core;
mod domain;
mod error;
mod export;
mod incidents;
mod lmu;
mod store;
#[cfg(test)]
mod test_support;
mod text;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(app::setup)
        .invoke_handler(tauri::generate_handler![
            commands::get_snapshot,
            commands::get_incident,
            commands::quick_log,
            commands::create_incident,
            commands::update_incident,
            commands::delete_incident,
            commands::merge_incidents,
            commands::archive_session,
            commands::update_config,
            commands::export_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running StewardPad");
}
