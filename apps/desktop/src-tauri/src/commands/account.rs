//! The account (Team): sign-in through the browser, the subscription, and the steward's rights
//! over their data (Settings → Account). The token never comes here: the UI sees a status.

use std::path::PathBuf;

use tauri::{AppHandle, State};

use super::in_background;

use super::exports::save_as;
use crate::account::service;
use crate::account::subscription::{self, RequestInput, SubscriptionView};
use crate::account::AccountView;
use crate::api::wire::SubscriptionRequest;
use crate::app::AppState;
use crate::error::AppResult;

#[tauri::command]
pub fn account_get(state: State<AppState>) -> AccountView {
    state.lock().account.view()
}

/// Opens the website's sign-in page in the browser.
#[tauri::command]
pub fn account_sign_in(app: AppHandle) -> AccountView {
    service::start(&app)
}

#[tauri::command]
pub fn account_cancel_sign_in(app: AppHandle) -> AccountView {
    service::cancel(&app)
}

/// "App didn't open? Paste this code": the code (or the whole stewardpad:// link).
#[tauri::command]
pub async fn account_redeem(app: AppHandle, code: String) -> AppResult<AccountView> {
    in_background(app, move |app| service::redeem(app, &code)).await
}

#[tauri::command]
pub async fn account_refresh(app: AppHandle) -> AppResult<AccountView> {
    in_background(app, service::refresh).await
}

#[tauri::command]
pub async fn account_sign_out(app: AppHandle) -> AppResult<AccountView> {
    in_background(app, move |app| Ok(service::sign_out(app))).await
}

#[tauri::command]
pub async fn account_subscription(app: AppHandle) -> AppResult<SubscriptionView> {
    in_background(app, subscription::overview).await
}

#[tauri::command]
pub async fn account_request_subscription(app: AppHandle, input: RequestInput) -> AppResult<SubscriptionRequest> {
    in_background(app, move |app| subscription::request(app, input)).await
}

#[tauri::command]
pub async fn account_cancel_request(app: AppHandle) -> AppResult<()> {
    in_background(app, subscription::cancel).await
}

/// Download my data: everything the API holds about the steward, as .json where they chose.
#[tauri::command]
pub async fn account_export(app: AppHandle, path: PathBuf) -> AppResult<()> {
    in_background(app, move |app| save_as(&path, "json", &subscription::export(app)?)).await
}

/// Delete my account: refused (OWNS_LEAGUES) while it owns a league.
#[tauri::command]
pub async fn account_delete(app: AppHandle) -> AppResult<AccountView> {
    in_background(app, service::delete).await
}
