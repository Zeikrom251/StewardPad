// Team: the account and the league as the desktop's backend shows them to the UI
// (src-tauri/src/account, src-tauri/src/team, and the API shapes in src-tauri/src/api/wire —
// themselves the website repo's packages/types). Change them together.
import type { SessionType } from './lmu.js'

export type SubscriptionStatus = 'none' | 'pending' | 'active' | 'ended'

/** GET /me: the signed-in steward. Never saved on the PC. */
export interface Me {
  id: string
  discordUsername: string
  displayName: string
  email: string
  avatarUrl: string | null
  subscriptionStatus: SubscriptionStatus
  subscriptionEndsAt: string | null
  createdAt: string
}

export type AccountStatus = 'signedOut' | 'signingIn' | 'checking' | 'offline' | 'signedIn'

/** `account:update`. The token never reaches the UI: only this. */
export interface AccountView {
  status: AccountStatus
  me: Me | null
  /** The sign-in page the browser was sent to ("Browser didn't open? Copy link"). */
  signInUrl: string | null
}

export interface SubscriptionRequest {
  id: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  message: string | null
  paypalEmail: string
  months: number
  declineReason: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface SubscriptionView {
  request: SubscriptionRequest | null
  /** Payment instructions (Markdown), kept up to date by staff. */
  howToPay: string | null
}

export interface RequestSubscriptionInput {
  paypalEmail: string
  months: 1 | 2 | 3
  message?: string
}

export type LeagueRole = 'OWNER' | 'HEAD_STEWARD' | 'STEWARD'
export type MemberRole = Exclude<LeagueRole, 'OWNER'>

export interface Person {
  id: string
  displayName: string
}

export interface LiveStream {
  id: string
  sessionId: string
  streamer: Person
  startedAt: string
  lastFrameAt: string | null
}

export interface MyLeague {
  id: string
  name: string
  role: LeagueRole
  /** Sync runs while the owner's subscription does. */
  syncOn: boolean
  owner: Person
  members: number
  stream: LiveStream | null
  createdAt: string
}

export interface Member {
  userId: string
  displayName: string
  role: LeagueRole
  discordUsername: string
  joinedAt: string
}

export interface LeagueView extends MyLeague {
  roster: Member[]
}

export interface LeagueSession {
  id: string
  title: string
  trackName: string
  type: SessionType
  status: 'open' | 'closed'
  closedAt: string | null
  incidents: number
}

export interface InvitePreview {
  league: { name: string; members: number }
  role: MemberRole
  invitedBy: string | null
  expiresAt: string
  /** null: any number until it expires. */
  placesLeft: number | null
}

export interface InviteInput {
  role?: MemberRole
  maxUses?: number
  expiresInHours?: number
}

/** A new invite: the code shows once; `url` is the website's join page. */
export interface InviteLink {
  code: string
  url: string
}

export type Connection = 'off' | 'connecting' | 'live' | 'offline' | 'inactive'

/** `team:update`: the league this PC syncs with, if any. */
export interface TeamView {
  leagueId: string | null
  leagueName: string | null
  league: LeagueView | null
  session: LeagueSession | null
  /** User ids of the members connected now. */
  online: string[]
  stream: LiveStream | null
  /** This PC streams its timing. */
  streaming: boolean
  /** A teammate streams this session: their timing is the clock here. */
  watching: boolean
  connection: Connection
  /** Changes kept on this PC until the league confirms them. */
  pending: number
  notice: string | null
}
