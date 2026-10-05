//! The signed-in account: GET /me, desktop sign-in, subscription requests.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum SubscriptionStatus {
    None,
    Pending,
    Active,
    Ended,
}

/// GET /me. Kept in memory only: the session file never holds the account.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Me {
    pub id: String,
    pub discord_username: String,
    pub display_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub subscription_status: SubscriptionStatus,
    pub subscription_ends_at: Option<String>,
    pub created_at: String,
}

/// POST /desktop-sign-in/redeem.
#[derive(Deserialize)]
pub struct DesktopSignIn {
    pub token: String,
    pub user: Me,
}

/// POST /subscription-requests; GET /subscription-requests/mine.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionRequest {
    pub id: String,
    /// pending | accepted | declined | cancelled
    pub status: String,
    pub message: Option<String>,
    pub paypal_email: String,
    pub months: u8,
    pub decline_reason: Option<String>,
    pub created_at: String,
    pub reviewed_at: Option<String>,
}

#[derive(Deserialize)]
pub struct MyRequest {
    pub request: Option<SubscriptionRequest>,
}

/// GET /settings/how-to-pay: the payment instructions staff keep up to date.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub struct HowToPay {
    pub markdown: Option<String>,
}
