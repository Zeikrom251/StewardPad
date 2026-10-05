mod account;
mod api;
mod app;
mod commands;
mod core;
mod domain;
mod error;
mod export;
mod incidents;
mod lmu;
mod rulebook;
mod settings;
mod share;
mod store;
mod team;
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
        // First: a second launch (a stewardpad:// link) hands its link to this window and exits.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| app::links::focus(app)))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(app::setup)
        .invoke_handler(tauri::generate_handler![
            commands::incidents::get_snapshot,
            commands::incidents::get_incident,
            commands::incidents::quick_log,
            commands::incidents::create_incident,
            commands::incidents::update_incident,
            commands::incidents::delete_incident,
            commands::incidents::delete_incidents,
            commands::incidents::merge_incidents,
            commands::incidents::archive_session,
            commands::incidents::flush_session,
            commands::incidents::import_sessions,
            commands::settings::update_config,
            commands::settings::set_adapter,
            commands::rulebook::import_rulebook,
            commands::rulebook::remove_rulebook,
            commands::rulebook::check_rulebook,
            commands::rulebook::number_rulebook,
            commands::rulebook::save_rulebook,
            commands::exports::save_markdown,
            commands::exports::export_csv,
            commands::exports::save_csv,
            commands::exports::save_session_file,
            commands::exports::save_results_json,
            commands::exports::save_html,
            commands::account::account_get,
            commands::account::account_sign_in,
            commands::account::account_cancel_sign_in,
            commands::account::account_redeem,
            commands::account::account_refresh,
            commands::account::account_sign_out,
            commands::account::account_subscription,
            commands::account::account_request_subscription,
            commands::account::account_cancel_request,
            commands::account::account_export,
            commands::account::account_delete,
            commands::team::team_get,
            commands::team::team_leagues,
            commands::team::team_create_league,
            commands::team::team_preview_invite,
            commands::team::team_join,
            commands::team::team_enter,
            commands::team::team_leave_link,
            commands::team::team_sessions,
            commands::team::team_open_session,
            commands::team::team_switch_session,
            commands::team::team_set_session_status,
            commands::team::team_start_stream,
            commands::team::team_stop_stream,
            commands::team::team_invite,
            commands::team::team_change_role,
            commands::team::team_remove_member,
            commands::team::team_hand_over,
            commands::team::team_rename_league,
            commands::team::team_delete_league,
        ])
        .run(tauri::generate_context!())
        .expect("error while running StewardPad");
}
