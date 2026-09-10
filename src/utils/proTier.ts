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

/**
 * How many seats the subscription carries to give away. The table mirrors
 * ProSeatsSection's; grant_pro_seat is what enforces it.
 */
export const PRO_SEATS_BY_TIER: Record<string, number> = {
  pro: 1,
  standard: 1,
  pro_plus: 5,
  pro_master: 5,
};

export function proSeatsTotal(
  subscription: { vip_tier?: string | null; purchase_platform?: string | null } | null | undefined,
  isVip: boolean,
): number {
  if (!isVip || subscription?.purchase_platform === "seat") return 0;
  return PRO_SEATS_BY_TIER[subscription?.vip_tier ?? ""] ?? 0;
}

/**
 * What the pill offers this hour.
 *
 * A Friends PRO holder is always offered to send. A solo PRO with their one
 * seat still unspent is offered it EVERY OTHER HOUR, and the upgrade in
 * between — the seat is worth suggesting, and so is the step up, and the
 * hour is what keeps the pill from saying one thing forever (owner: "every 1
 * hour we can change the buttons, sometimes we show upgrade sometimes we
 * show send pro ... if they still have 1 pro to send to a friend we should
 * suggest to send it"). A solo PRO whose seat is spent is offered the
 * upgrade; without PRO, the trial.
 */
export type ProCta = "try" | "upgrade" | "send";

export function proCtaChoice(tier: ProTier, seatsFree: number, now: number = Date.now()): ProCta {
  if (tier === "none") return "try";
  if (tier === "friends") return "send";
  if (seatsFree > 0 && Math.floor(now / 3_600_000) % 2 === 0) return "send";
  return "upgrade";
}
