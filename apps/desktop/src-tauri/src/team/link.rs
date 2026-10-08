//! The link between this PC's session and a league's race session: saved in the session file
//! with the changes not yet sent, so a crash or a night offline loses none of them.

use serde::{Deserialize, Serialize};

use super::outbox::Outbox;
use crate::api::wire::{LeagueRole, SessionStatus, SessionView};
use crate::core::Core;
use crate::error::{AppError, AppResult};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TeamLink {
    pub league_id: String,
    pub league_name: String,
    /// The account this link belongs to: another steward signing in on this PC doesn't inherit it.
    pub user_id: String,
    /// The race session the incidents belong to; None once the league deleted it.
    pub session: Option<SessionView>,
    /// The last league revision applied: live events resume after it.
    pub revision: String,
    #[serde(default)]
    pub outbox: Outbox,
}

impl TeamLink {
    pub fn new(league_id: String, league_name: String, user_id: String, session: SessionView) -> Self {
        Self {
            league_id,
            league_name,
            user_id,
            session: Some(session),
            revision: "0".into(),
            outbox: Outbox::default(),
        }
    }

    /// Read back from disk: what was in flight when the app stopped may have reached the API.
    pub fn restored(mut self) -> Self {
        self.outbox.mark_all_sent();
        self
    }

    pub fn session_id(&self) -> Option<&str> {
        self.session.as_ref().map(|session| session.id.as_str())
    }

    /// Revisions are 64-bit counters sent as text: compare them as numbers.
    pub fn advance(&mut self, revision: &str) {
        let parse = |r: &str| r.parse::<u64>().unwrap_or(0);
        if parse(revision) > parse(&self.revision) {
            self.revision = revision.to_string();
        }
    }
}

impl Core {
    pub fn link(&self) -> Option<&TeamLink> {
        self.store.team.as_ref()
    }

    pub(crate) fn link_mut(&mut self) -> Option<&mut TeamLink> {
        self.store.team.as_mut()
    }

    /// The linked league session, when there is one and it is open for changes.
    pub(crate) fn open_session_id(&self) -> Option<String> {
        let session = self.link()?.session.as_ref()?;
        (session.status == SessionStatus::Open).then(|| session.id.clone())
    }

    pub fn my_role(&self) -> Option<LeagueRole> {
        self.team.league.as_ref().map(|league| league.league.role)
    }

    /// In a league: the session must be open, and some changes need a head steward.
    pub(crate) fn check_team_write(&self, needs: Option<LeagueRole>) -> AppResult<()> {
        let Some(link) = self.link() else { return Ok(()) };
        if link.session.as_ref().is_some_and(|s| s.status == SessionStatus::Closed) {
            return Err(AppError::invalid("This session is closed: its incidents are read-only"));
        }
        match (needs, self.my_role()) {
            (Some(needed), Some(role)) if role < needed => {
                Err(AppError::invalid("In a league, only head stewards and the owner do that"))
            }
            _ => Ok(()),
        }
    }

    /// Refuses what doesn't fit a league session (clearing it, importing session files).
    pub(crate) fn check_solo(&self, action: &str) -> AppResult<()> {
        match self.link() {
            Some(link) => Err(AppError::invalid(format!(
                "{action} is for stewarding on your own: this session syncs with {}",
                link.league_name
            ))),
            None => Ok(()),
        }
    }
}
