import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The panel offers a seat only to friends who can receive one.
 *
 * Every accepted friend got a Send PRO button, and `grant_pro_seat` refuses
 * the ones who already hold PRO — a seat must never overwrite a subscription
 * somebody is paying for. So the button on those rows raised
 * `pro_seat_holder_has_pro` and the row read as broken (owner: "i click send
 * pro and nothing happens because they already have it").
 *
 * The app cannot work out who they are by itself: RLS on `vip_subscriptions`
 * is `auth.uid() = user_id`, so it can read its own row and nobody else's.
 * `pro_seat_candidates()` answers it server-side, with the same check the
 * refusal uses — one rule, not two — and returns only the friends a seat CAN
 * go to, so nothing is disclosed about who has PRO beyond their absence.
 *
 * The one thing that must not happen is a list that goes quietly empty
 * because the question could not be asked, so "could not ask" is a distinct
 * answer from "nobody is left".
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const SQL = read("supabase/migrations/20261107100000_pro_seat_candidates.sql");
const SEAT_SQL = read("supabase/migrations/20260821130000_pro_seats_block_only_real_pro.sql");
const HOOK = read("src/hooks/useProSeats.ts");
const SECTION = read("src/components/profile/ProSeatsSection.tsx");
const SUITE = read("supabase/tests/03-pro-seats.sql");
const EN = read("src/locales/en.ts");

describe("pro_seat_candidates", () => {
  it("asks the same question the refusal asks", () => {
    // Not a second copy of "which tiers count as PRO" — the list and the
    // refusal would be free to drift, and the drift IS the broken button.
    expect(SQL).toMatch(/NOT public\.pro_seat_holder_has_pro\(\s*\n?\s*v\.vip_tier, v\.expires_at, v\.purchase_platform\)/);
    expect(SEAT_SQL).toMatch(/CREATE OR REPLACE FUNCTION public\.pro_seat_holder_has_pro\(/);
  });

  it("reads only the caller's own accepted friendships", () => {
    expect(SQL).toMatch(/WHERE f\.status = 'accepted'/);
    expect(SQL).toMatch(/AND auth\.uid\(\) IN \(f\.user_id, f\.friend_id\)/);
    expect(SQL).toMatch(/WHERE auth\.uid\(\) IS NOT NULL/);
  });

  it("does not name its output column after a column of a table it reads", () => {
    // A RETURNS TABLE column named `user_id` makes every unqualified mention
    // ambiguous; CREATE FUNCTION accepts it and 42702 arrives at the first
    // call. (The shop migration shipped exactly that once.)
    expect(SQL).toMatch(/RETURNS TABLE \(candidate_id uuid\)/);
  });

  it("is granted to signed-in callers and nobody else", () => {
    // A new SECURITY DEFINER function is executable by PUBLIC by default.
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.pro_seat_candidates\(\) FROM PUBLIC, anon;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.pro_seat_candidates\(\) TO authenticated;/);
  });

  it("is executed against a real Postgres, not just compiled", () => {
    expect(SUITE).toMatch(/FROM public\.pro_seat_candidates\(\)/);
    expect(SUITE).toMatch(/the panel is offered exactly the friends without PRO of their own/);
    expect(SUITE).toMatch(/a stranger reads nobody''s friends/);
    expect(SUITE).toMatch(/signed out returns nothing/);
  });
});

describe("the panel", () => {
  it("offers only the friends the server named", () => {
    expect(HOOK).toMatch(/callRpc<\s*\n?\s*\{ candidate_id: string \}\[\]\s*\n?\s*>\("pro_seat_candidates"\)/);
    expect(SECTION).toMatch(/candidates === null \|\| candidates\.has\(f\.friendId\)/);
  });

  it("offers everyone again if the question could not be asked", () => {
    // Fail open, and only on an error: an empty answer is an answer.
    expect(HOOK).toMatch(/if \(eligibleError\) \{[\s\S]*?setCandidates\(null\);/);
    expect(HOOK).toMatch(/setCandidates\(new Set\(\(eligible \?\? \[\]\)\.map\(\(r\) => r\.candidate_id\)\)\);/);
  });

  it("says which kind of nobody it is", () => {
    // "Add a friend first" is wrong for someone with five friends who all
    // have PRO already.
    expect(SECTION).toMatch(/accepted\.length === 0\s*\n\s*\? t\("extra\.proSeatsNoFriends"\)\s*\n\s*: t\("extra\.proSeatsAllHavePro"\)/);
    expect(EN).toMatch(/proSeatsAllHavePro: "/);
  });
});
