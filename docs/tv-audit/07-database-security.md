# TV Audit — 07: Database & Security

_Scope: RLS on TV tables, the anon-key exposure surface, the 16 Lovable
warnings, zombie cleanup. **Probed live with the app's public anon key.**
Severity S = security._

## ⚠️ Live-verified exposure (anon key = the key shipped in the app)

| Probe | Result |
|---|---|
| READ tv_sessions / tv_players / player_answers / poll_* / queue | **all readable** |
| READ profiles incl. `security_answer_hash`, `coins`, `gems`, `referral_code` | **all readable** |
| PATCH tv_sessions.status `playing`→`completed` on a live game | **CONFIRMED allowed** |
| PATCH tv_sessions.current_question_index 0→9 (skip a round) | **CONFIRMED allowed** |
| PATCH another player's `current_round_score` → 99999 | **CONFIRMED allowed** |
| DELETE tv_players | **BLOCKED by RLS** ✅ |
| PATCH `profiles` (points/coins/currency) | **BLOCKED by RLS** ✅ |

> **Correction (2026-07-28):** the first pass reported DELETE and `profiles`
> writes as allowed based on `204` responses. PostgREST returns 204 even when
> RLS filters the row set to nothing. Re-probed with `Prefer:
> return=representation` (an echoed row proves the write landed): DELETE and
> `profiles` writes are correctly BLOCKED. The three UPDATE exploits above are
> real and were verified by reading the mutated value back.

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

### S-2 (HIGH): TV tables accept arbitrary UPDATEs from anyone
Scoped by re-probe to **UPDATE only** (DELETE/profiles are protected):
anyone holding a session id can set any player's `current_round_score`,
end a live game, or jump `current_question_index`. Inserts/deletes and
`profiles` are fine.

**Enabler:** `tv_sessions` is SELECTable by anon, so session ids can be
*enumerated* — an attacker doesn't need to be in the game.

**Why the fix is not trivial:** guest players have no `auth.uid()`, so RLS
cannot distinguish "the host" from a stranger. Three viable designs:

- **(a) Require hosts to be authenticated** → policies become
  `USING (host_user_id = auth.uid())`. Strongest and simplest; needs the
  product decision "can a logged-out guest host a TV game?" (rooms already
  require auth, so this may already be true in practice).
- **(b) Host token**: `tv_sessions.host_token` issued by an atomic
  `tv_claim_host()` RPC (which also fixes 01:H-1), SELECT revoked on the
  column; host writes go through RPCs carrying the token. Preserves guest
  hosting; more machinery.
- **(c) RPC-only state writes** for everything, table UPDATE revoked
  wholesale. Cleanest end state, largest refactor.

**Progress 2026-07-28:** scoring moved server-side (the RPC now owns
`current_round_score`), removing the client's need to write it — a
prerequisite for revoking that column. The remaining client-side score
write is the observer bonus (see 03:M-1), so the revoke lands with that fix.

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
