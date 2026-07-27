# TV Audit — 07: Database & Security

_Scope: RLS on TV tables, the anon-key exposure surface, the 16 Lovable
warnings, zombie cleanup. **Probed live with the app's public anon key.**
Severity S = security._

## ⚠️ Live-verified exposure (anon key = the key shipped in the app)

| Probe | Result |
|---|---|
| READ tv_sessions / tv_players / player_answers / poll_* / queue | **all readable** |
| READ profiles incl. `security_answer_hash`, `coins`, `gems`, `referral_code` | **all readable** |
| PATCH tv_sessions.status directly (bypass RPC) | **204 — allowed** |
| DELETE tv_players | **204 — allowed** |
| PATCH another player's `current_round_score` → 99999 | **204 — CONFIRMED overwrote a real row** |
| PATCH game_rooms | **allowed** |

These are exploitable by anyone who opens devtools on mytrivia.io. The anon
key is public by design — **RLS is the only defense, and it is effectively
open on these tables.**

## Findings

### S-1 (HIGH): profiles leaks secrets to anon
`security_answer_hash` (password-reset secret), `coins`, `gems`,
`referral_code` are readable for EVERY user via the public key. The hash is
the most serious — it's the credential-recovery secret. Fix: restrict
`profiles` SELECT to public-safe columns via a view or column privileges;
never expose `security_answer_hash` to anon/authenticated-other. (This is
almost certainly among Lovable's 16 warnings.)

### S-2 (HIGH): TV tables are writable by anyone
`tv_sessions`, `tv_players`, `game_rooms` accept anon UPDATE/DELETE with no
policy check. Anyone can: end any live game (`status='completed'`), set any
player's score, delete players, rename rooms. Guests legitimately need SOME
writes (join, answer) — but state transitions must go through the
SECURITY DEFINER RPCs only, and score/roster writes must be constrained
(own row, or RPC-only). Fix: tighten UPDATE/DELETE policies to
owner/host/self; route all session-state writes through RPCs; the score
write should move server-side (the RPC already computes it).

### S-3 (MED): player_answers insert policy is broad
Insert is allowed whenever an active TV session exists (guest support) —
so anyone can stuff answers for any player id in any live session. The RPC
validates index/round, but the DIRECT table insert (fallback path + open
policy) does not. Once RPC is the sole path, lock the table to RPC-only
insert.

### S-4 (MED): No zombie-session cleanup for TV
Stranded `playing`/`reveal` sessions persist until `expires_at` (+24h),
remain code-joinable (lifecycle M-3), and accumulate. A `cleanup-old-rooms`
edge function exists for rooms — confirm coverage/cadence for tv_sessions;
add "no presence for N min → completed."

### S-5 (LOW): RPC is SECURITY DEFINER with search_path pinned — good
`submit_tv_answer` correctly sets `search_path=public` and validates input.
Model the hardening of other writes on it.

## The 16 Lovable warnings

Not yet enumerable via the anon key (needs dashboard/advisor access). Based
on the live probes, they almost certainly include: profiles column
exposure (S-1), permissive RLS on multiple tables (S-2/S-3), and
SECURITY DEFINER views/functions lacking search_path. **Recommendation:
do NOT bulk auto-fix** (breaks guest writes the game depends on); fix
per-item, guided by S-1..S-4, testing multiplayer after each.

## Ownership note
Migrations delivered via GitHub are NOT auto-applied by Lovable (proven
this week — the RPC had to be run by hand). The DB is Lovable-managed
(project `sqwpzezkhpqkdyltvsim` not in the user's personal Supabase account
as of 2026-07-28). Getting DB ownership + a real migration pipeline is a
prerequisite for reliably shipping these security fixes.
