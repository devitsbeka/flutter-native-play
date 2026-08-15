-- The invite-a-friend-for-ten-days-of-PRO offer is gone from the app. This
-- takes its server side out too, which matters more than the buttons did.
--
-- `process_referral_reward(invite_id, new_user_id)` was executable by anon
-- and authenticated, and it took the recipient as a parameter. Any signed-in
-- player could insert an invite naming themselves as the inviter — the
-- "Any user can create invites" policy allowed exactly that — and then call
-- the function with their own id. Measured against a real Postgres with every
-- migration applied:
--
--   self-granted PRO until | 2026-08-24 22:38:05+00
--
-- Two calls, no friend, ten days of PRO, repeatable forever. That is the hole
-- AGENTS.md rule 3 is about: a SECURITY DEFINER function that mints an
-- entitlement, granted to PUBLIC by default and never revoked.
--
-- The offer never actually paid out either — the signup insert it depended on
-- was refused by the table's own RLS, so the friend was shown a "you have PRO
-- days" toast and given nothing. Both facts point the same way: take it out,
-- and build it properly if it is ever wanted.
--
-- The table stays. It holds whatever rows were written and its owner can
-- still read them; it just cannot be written to by a client any more.

-- Just the drop. It used to be preceded by three REVOKEs, which read as
-- belt-and-braces and were in fact the one statement here that could fail:
-- DROP removes a function's privileges with it, so on any re-run the
-- function was already gone and REVOKE raised "function does not exist"
-- while the DROP beside it was guarded by IF EXISTS. A migration that only
-- works the first time is one a half-finished paste cannot be recovered
-- from, which is exactly when it gets run twice.
DROP FUNCTION IF EXISTS public.process_referral_reward(uuid, uuid);

-- Nothing in the app writes invites now, and an unused write policy is just
-- a way back in.
DROP POLICY IF EXISTS "Any user can create invites" ON public.friend_invites;
DROP POLICY IF EXISTS "PRO users can create invites" ON public.friend_invites;
DROP POLICY IF EXISTS "Users can update their own invites" ON public.friend_invites;
