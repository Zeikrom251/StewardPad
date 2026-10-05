//! Requesting a subscription (boards 03b and 03c): PayPal email and 1, 2 or 3 months; staff
//! check each request by hand and send a PayPal payment request. Nothing is charged in the app.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use super::service::refresh;
use crate::api::wire::{HowToPay, MyRequest, SubscriptionRequest};
use crate::app::AppState;
use crate::error::{AppError, AppResult};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionView {
    /// The latest request, whatever became of it.
    pub request: Option<SubscriptionRequest>,
    /// The payment instructions staff keep up to date (Markdown).
    pub how_to_pay: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RequestInput {
    pub paypal_email: String,
    pub months: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl RequestInput {
    /// The API checks the same; this says so before the round trip.
    fn validate(&self) -> AppResult<()> {
        let email = self.paypal_email.trim();
        let (user, domain) = email.split_once('@').unwrap_or(("", ""));
        if user.is_empty() || !domain.contains('.') || email.len() > 254 || email.contains(' ') {
            return Err(AppError::invalid("Enter the email address of your PayPal account"));
        }
        if !(1..=3).contains(&self.months) {
            return Err(AppError::invalid("A subscription runs 1, 2 or 3 months"));
        }
        if self.message.as_ref().is_some_and(|m| m.chars().count() > 1000) {
            return Err(AppError::invalid("The message is limited to 1000 characters"));
        }
        Ok(())
    }
}

pub fn overview(app: &AppHandle) -> AppResult<SubscriptionView> {
    let state = app.state::<AppState>();
    let mine: MyRequest = state.api.get("/subscription-requests/mine")?;
    let how: HowToPay = state.api.get("/settings/how-to-pay")?;
    Ok(SubscriptionView { request: mine.request, how_to_pay: how.markdown })
}

pub fn request(app: &AppHandle, mut input: RequestInput) -> AppResult<SubscriptionRequest> {
    input.validate()?;
    input.paypal_email = input.paypal_email.trim().to_string();
    input.message = input.message.map(|m| m.trim().to_string()).filter(|m| !m.is_empty());
    let request = app.state::<AppState>().api.post("/subscription-requests", &input)?;
    refresh(app)?;
    Ok(request)
}

pub fn cancel(app: &AppHandle) -> AppResult<()> {
    app.state::<AppState>().api.delete::<()>("/subscription-requests/mine")?;
    refresh(app)?;
    Ok(())
}

/// Settings → Account → Download my data (GDPR art. 15 and 20): everything the API holds.
pub fn export(app: &AppHandle) -> AppResult<String> {
    let data: serde_json::Value = app.state::<AppState>().api.get("/me/export")?;
    serde_json::to_string_pretty(&data).map_err(|e| AppError::io("Could not write your data", e))
}
