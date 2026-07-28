-- Tier 0 · S-2 (final score step): make tv_players.current_round_score
-- writable ONLY by the server.
--
-- Verified exploitable before this: any client could PATCH another player's
-- score to an arbitrary value (10 -> 99999).
--
-- ⚠️ RUN ONLY AFTER the build that removes the last client-side score writes
-- is published, otherwise "play again" stops zeroing scores. That build:
--   * answer scoring   -> submit_tv_answer (server-computed delta)
--   * observer bonus   -> award_tv_observer_bonus (server-computed, idempotent)
--   * score resets     -> reset_tv_session_scores (host calls once)
-- Clients then only ever write nickname / avatar_url / is_active / user_id
-- (verified by enumerating every tv_players update in the codebase).
--
-- As with profiles: a column-level REVOKE is a no-op while a table-level
-- UPDATE grant exists, so the table grant is replaced by a column list.

REVOKE UPDATE ON public.tv_players FROM anon;
REVOKE UPDATE ON public.tv_players FROM authenticated;

GRANT UPDATE (nickname, avatar_url, is_active, user_id)
  ON public.tv_players TO anon, authenticated;

-- INSERT (joining) and SELECT are unchanged; SECURITY DEFINER functions keep
-- full access and are now the only writers of current_round_score.
