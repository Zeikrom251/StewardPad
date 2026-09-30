mod app;
mod commands;
mod core;
mod discord;
mod display;
mod domain;
mod error;
mod export;
mod export_commands;
mod incidents;
mod lmu;
mod rulebook;
mod share;
mod store;
#[cfg(test)]
mod test_support;
mod text;

/// Linux (the WSL dev setup) only: WebKitGTK's DMA-BUF renderer can't reach the GPU under
/// WSLg ("libEGL: DRI2: failed to create screen"), and the window stops painting and taking
/// input while the app keeps running. Software rendering is plenty for this UI. An explicit
/// value in the environment still wins. Windows (WebView2) is unaffected.
fn avoid_webkit_gpu_freeze() {
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    avoid_webkit_gpu_freeze();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(app::setup)
        .invoke_handler(tauri::generate_handler![
            commands::get_snapshot,
            commands::get_incident,
            commands::quick_log,
            commands::create_incident,
            commands::update_incident,
            commands::delete_incident,
            commands::delete_incidents,
            commands::merge_incidents,
            commands::archive_session,
            commands::flush_session,
            commands::update_config,
            commands::set_adapter,
            commands::import_rulebook,
            commands::remove_rulebook,
            commands::check_rulebook,
            commands::number_rulebook,
            commands::save_rulebook,
            export_commands::save_markdown,
            export_commands::export_csv,
            export_commands::save_csv,
            export_commands::save_session_file,
            export_commands::save_results_json,
            export_commands::save_html,
            commands::import_sessions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running StewardPad");
}
