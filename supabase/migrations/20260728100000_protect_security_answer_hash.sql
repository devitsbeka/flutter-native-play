-- Tier 0 · S-1 (credential secret): profiles.security_answer_hash was
-- readable by anon/authenticated for EVERY user via the public key
-- (verified with a live probe). It is the security-question answer hash used
-- for password recovery and must never be client-readable.
--
-- Verification is entirely server-side (edge function
-- reset-password-with-security, service role). The client only WRITES it at
-- signup. So we revoke column-level SELECT from the client roles while
-- keeping INSERT/UPDATE, and keep service_role full access.
--
-- SAFE TO RUN ONLY AFTER the app build that stops selecting `*` on profiles
-- is live (it selects explicit columns via PROFILE_SELECT_COLUMNS, which omit
-- this column). Running it earlier would break own-profile reads (login).

REVOKE SELECT (security_answer_hash) ON public.profiles FROM anon;
REVOKE SELECT (security_answer_hash) ON public.profiles FROM authenticated;

-- Keep write access so signup can set it (own row, gated by existing RLS)
GRANT INSERT (security_answer_hash) ON public.profiles TO authenticated;
GRANT UPDATE (security_answer_hash) ON public.profiles TO authenticated;

-- service_role (edge functions) retains full access implicitly; no change.
