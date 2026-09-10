/**
 * Which PRO a player holds, as the header pill needs to know it.
 *
 *   none     no active subscription — the pill says "Try PRO"
 *   solo     PRO (one seat, or a seat somebody gave them) — "Upgrade", to
 *            the Friends tier
 *   friends  Friends PRO (five seats of their own) — "Send PRO", to the
 *            seats panel where they give one away
 *
 * The pill used to say "Upgrade" to a player with no PRO at all whenever a
 * free game was left in the day, and the same "Upgrade" to a Friends PRO
 * holder with nothing left to upgrade to (owner: "if user has no pro we
 * show try pro, we should show upgrade button when user already has pro
 * solo and can upgrade to friends pro and if user has friends pro sees send
 * pro").
 *
 * The seat counts mirror ProSeatsSection's table; the database is what
 * enforces them (grant_pro_seat reads the allowance off the subscription).
 */
export type ProTier = "none" | "solo" | "friends";

const FRIENDS_TIERS = new Set(["pro_plus", "pro_master"]);

export function proTierOf(
  subscription: { vip_tier?: string | null; purchase_platform?: string | null } | null | undefined,
  isVip: boolean,
): ProTier {
  if (!isVip) return "none";
  // A seat somebody gave them is PRO to play with, not PRO to give away.
  if (subscription?.purchase_platform === "seat") return "solo";
  return FRIENDS_TIERS.has(subscription?.vip_tier ?? "") ? "friends" : "solo";
}
