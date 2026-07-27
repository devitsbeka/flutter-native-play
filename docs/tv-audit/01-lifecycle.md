# TV Audit — 01: Session Lifecycle & Identity

_Scope: session creation, pairing, join (QR/code), identity & bindings,
host assignment, rejoin, room→TV bridge, expiry. Severity: H/M/L._

## How it works (verified)

1. **Create**: TV inserts `tv_sessions` (status `waiting`, random 4-digit
   `tv_pairing_code`, `expires_at = now+24h`). TV joins presence as
   `TV_DISPLAY` (never host, never counted).
2. **Join**: QR encodes `/join/session/<sessionId>` (uuid — collision-free).
   Manual entry uses the 4-digit code → newest active session with that code.
   Join is idempotent per device via localStorage binding (24h TTL).
3. **Identity**: authenticated → playerId = auth uid (stable across devices);
   guest → device-local random uuid (new identity if storage cleared —
   nickname grouping + unique-nickname suffix compensate).
4. **Host**: first non-TV joiner with `host_user_id` empty becomes host and
   writes `host_user_id`; later joiners match by playerId OR auth uid.
5. **Roster**: join upserts `tv_players` (rejoin reactivates row, updates
   nickname/avatar); mid-game joiners inserted `is_active=false` until next
   question so they don't break the locked count.
6. **Room bridge**: room-created sessions carry `room_id`; room invitees show
   as grayed "invited" cards (from `room_participants`), promoted to
   `joined` when they actually join; room lobby redirects non-hosts into the
   TV join flow when an active session exists.

## Findings

### H-1: Host assignment race (no CAS)
`joinSession` computes `isHostPlayer = !session.host_user_id || ...` from a
read, then writes `host_user_id` unconditionally. Two players joining a
fresh session simultaneously can BOTH read null → both believe they are
host locally; last write wins in DB. Two live "hosts" → duplicated engine
timers, double advances (CAS on transitions limits damage now, but both
render host UI; observer bonus and round control duplicated).
**Fix direction**: `UPDATE ... SET host_user_id=X WHERE id=Y AND
host_user_id IS NULL` + re-read to decide `isHost`.

### M-1: 4-digit code collisions on manual join
`generate4DigitCode()` is random 1000–9999 with no uniqueness check against
other ACTIVE sessions. Manual code join picks the NEWEST match, so a
concurrent session with the same code is shadowed — players typing the code
land in the newer stranger's session. QR flow is immune (sessionId).
**Fix direction**: retry code generation against active sessions, or scope
codes by checking `expires_at > now` uniqueness at create.

### M-2: Auth user on two devices = one presence key
playerId for authenticated users is the auth uid, so the same account on
two devices shares presence key and answers slot (upsert same
`(session,user,index)`): second device silently overwrites the first's
answer; presence metas pile under one key (content-pick mitigates display).
Probably acceptable ("one account = one seat") but undocumented.
**Decision needed**: bless as rule or per-device seats for same account.

### M-3: Stranded sessions remain joinable for 24h
Sessions stuck in `playing`/`reveal` (engine died) stay matchable by code
join until `expires_at`. A player entering the 4-digit code can land in a
dead game with no exit hint. Watchdogs reduce stranding, but cleanup of
zombie sessions (e.g. no presence for N minutes → mark completed) is
missing client- and server-side. (Cleanup edge function exists for rooms —
its cadence/coverage checked in Run 7.)

### L-1: Binding vs identity drift
Session binding stores playerId per session, but if the user logs IN
between visits (guest → auth), the binding returns the old guest id while
`getOrCreatePlayerId` would return the auth uid → device keeps playing as
the guest identity for that session. Consistent (not a break), but scores
land on the guest identity. Acceptable; note for support questions.

### L-2: `activeStatuses` for join includes `completed`
Deliberate (rejoining to see results), but combined with M-1 code reuse it
slightly widens the wrong-session window for manual joins.

### L-3: TVLobby/TVJoin legacy pages
`/tv/:code` (TVDisplay) takes a `code` param it mostly ignores in favor of
session state; `TVLobby.tsx` and `TVJoin.tsx` contain older duplicated join
logic. Candidates for the dead-code cleanup (separate from audit).

## Cross-references
- Nickname uniqueness & rebind-merge rules: see PR #41 rationale.
- Answer identity (uuid) contract: RPC rejects non-uuid player ids —
  guests and auth users both satisfy it today. Guard any future id scheme.
