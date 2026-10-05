import { invoke } from '@tauri-apps/api/core'
import type {
  AccountView,
  InviteInput,
  InviteLink,
  InvitePreview,
  LeagueRole,
  LeagueSession,
  MyLeague,
  RequestSubscriptionInput,
  SubscriptionRequest,
  SubscriptionView,
  TeamView,
} from '@stewardpad/shared'

/**
 * The account and the league (src-tauri/src/commands/account.rs, team.rs). The Rust side holds
 * the token and calls the StewardPad API; the UI only ever sees views.
 */
export const account = {
  get: () => invoke<AccountView>('account_get'),
  /** Opens the website's sign-in page in the browser. */
  signIn: () => invoke<AccountView>('account_sign_in'),
  cancelSignIn: () => invoke<AccountView>('account_cancel_sign_in'),
  /** The code from the browser (or the whole stewardpad:// link). */
  redeem: (code: string) => invoke<AccountView>('account_redeem', { code }),
  refresh: () => invoke<AccountView>('account_refresh'),
  signOut: () => invoke<AccountView>('account_sign_out'),
  subscription: () => invoke<SubscriptionView>('account_subscription'),
  requestSubscription: (input: RequestSubscriptionInput) =>
    invoke<SubscriptionRequest>('account_request_subscription', { input }),
  cancelRequest: () => invoke<void>('account_cancel_request'),
  /** Everything the API holds about the steward, saved as .json (GDPR art. 15 and 20). */
  exportData: (path: string) => invoke<void>('account_export', { path }),
  /** Refused (code OWNS_LEAGUES) while the account owns a league. */
  deleteAccount: () => invoke<AccountView>('account_delete'),
}

export const team = {
  get: () => invoke<TeamView>('team_get'),
  leagues: () => invoke<MyLeague[]>('team_leagues'),
  createLeague: (name: string) => invoke<MyLeague>('team_create_league', { name }),
  /** What an invite link or code joins, before joining. */
  previewInvite: (invite: string) => invoke<InvitePreview>('team_preview_invite', { invite }),
  join: (invite: string) => invoke<MyLeague>('team_join', { invite }),
  /** Follow this league's open session on this PC. */
  enter: (leagueId: string) => invoke<TeamView>('team_enter', { leagueId }),
  /** Steward on your own again; the incidents stay on this PC. */
  leaveLink: () => invoke<TeamView>('team_leave_link'),
  sessions: () => invoke<LeagueSession[]>('team_sessions'),
  openSession: (title?: string) => invoke<TeamView>('team_open_session', { title }),
  switchSession: (sessionId: string) => invoke<TeamView>('team_switch_session', { sessionId }),
  setSessionStatus: (status: 'open' | 'closed') =>
    invoke<TeamView>('team_set_session_status', { status }),
  startStream: () => invoke<TeamView>('team_start_stream'),
  stopStream: () => invoke<TeamView>('team_stop_stream'),
  invite: (input: InviteInput = {}) => invoke<InviteLink>('team_invite', { input }),
  changeRole: (userId: string, role: LeagueRole) =>
    invoke<void>('team_change_role', { userId, role }),
  /** Removes a member; your own id leaves the league. */
  removeMember: (userId: string) => invoke<void>('team_remove_member', { userId }),
  handOver: (userId: string) => invoke<MyLeague>('team_hand_over', { userId }),
  renameLeague: (name: string) => invoke<MyLeague>('team_rename_league', { name }),
  deleteLeague: () => invoke<void>('team_delete_league'),
}
