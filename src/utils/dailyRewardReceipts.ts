/**
 * What each claimed day of the week paid, assembled from the two places the
 * database records it.
 *
 * The weekly cards used to show one day itemised — "✓ 🪙 100" — and the rest
 * of the claimed days as a bare tick. That was not a rendering bug: the card
 * reads `user_daily_rewards.coins_awarded`, and those columns arrived in a
 * later migration than the feature. Every day claimed before that migration
 * ran has them NULL, so the card had nothing to print and fell back to the
 * tick. One week could therefore contain both kinds, side by side, for no
 * reason a player could see.
 *
 * The second source is not a guess or a reconstruction from a schedule. The
 * same `claim_daily_reward` call that fills the receipt columns also calls
 * `apply_currency_grant`, which writes a `currency_grants` row carrying the
 * coins and gems it actually paid. That ledger predates the receipt columns,
 * so it covers the days they cannot.
 *
 * It is the weaker of the two, though, and only in one respect: a grant row
 * has no power-up. Power-ups go straight to `user_power_ups` and nothing
 * records which day handed one over. So the ledger goes down first and the
 * receipt columns overwrite it wherever they have something — never the
 * other way round, or a day would lose its power-up to a thinner record of
 * the same claim.
 */

/** What a claim paid — the receipt the claimed pill shows. */
export interface ClaimedReward {
  coins: number;
  gems: number;
  powerUp: string | null;
  powerUpCount: number;
}

export interface DailyRewardRow {
  reward_date: string;
  daily_claimed: boolean | null;
  coins_awarded?: number | null;
  gems_awarded?: number | null;
  power_up?: string | null;
  power_up_count?: number | null;
}

export interface GrantRow {
  coins: number | null;
  gems: number | null;
  /** When the grant was written. Its UTC date is the reward day. */
  created_at: string;
  /**
   * What claim_daily_reward wrote alongside the amounts: "day 3 double_coins",
   * "day 3 gems", or — since 20260913100000 — "day 3 power freeze x2".
   *
   * Older rows carry the short form and simply have no power-up to recover.
   */
  reference?: string | null;
}

/**
 * The power-up out of a ledger reference, when it names one.
 *
 * This is the ledger's one blind spot being closed. A grant row records coins
 * and gems, and a day rebuilt from it could never show the power-up it also
 * granted — so a week recovered from the ledger looked like coins every day,
 * which is not what the player was given.
 *
 * Parsed rather than joined because there is nothing to join to: power-ups go
 * straight into user_power_ups as a running total, with no per-day record
 * anywhere. The reference string is the only place the day and the power-up
 * appear together.
 */
export function powerUpFromReference(
  reference: string | null | undefined,
): { powerUp: string; powerUpCount: number } | null {
  if (!reference) return null;
  // "day 3 power freeze x2" — the trailing count is what the older short
  // form lacks, so requiring it is what keeps this from half-matching.
  const m = /\bpower\s+([a-z0-9-]+)\s+x(\d+)\b/i.exec(reference);
  if (!m) return null;
  const count = Number(m[2]);
  if (!Number.isFinite(count) || count <= 0) return null;
  return { powerUp: m[1], powerUpCount: count };
}

/** The UTC calendar day — the one `reward_date` is stamped on. */
const utcDay = (iso: string) => new Date(iso).toISOString().split("T")[0];

/**
 * Receipts keyed by reward date, for the claimed days only.
 *
 * A date is claimed if and only if `user_daily_rewards` says so. The ledger
 * never promotes a day to claimed on its own — a `daily_reward` grant with
 * no matching claimed row means something is out of step, and painting a
 * claimed card off the back of it would hide that rather than show it.
 */
export function mergeDailyReceipts(
  dailyRows: DailyRewardRow[],
  grantRows: GrantRow[] = []
): Record<string, ClaimedReward> {
  const claimed = new Set(
    dailyRows.filter((r) => r.daily_claimed).map((r) => String(r.reward_date))
  );

  const receipts: Record<string, ClaimedReward> = {};

  // The ledger first, so the fuller record can overwrite it.
  for (const g of grantRows) {
    const day = utcDay(g.created_at);
    if (!claimed.has(day)) continue;
    const power = powerUpFromReference(g.reference);
    receipts[day] = {
      coins: g.coins ?? 0,
      gems: g.gems ?? 0,
      powerUp: power?.powerUp ?? null,
      powerUpCount: power?.powerUpCount ?? 0,
    };
  }

  for (const r of dailyRows) {
    if (!r.daily_claimed) continue;
    // NULL means this claim predates the receipt columns; whatever the
    // ledger managed to supply stands.
    if (r.coins_awarded == null) continue;
    receipts[String(r.reward_date)] = {
      coins: r.coins_awarded,
      gems: r.gems_awarded ?? 0,
      powerUp: r.power_up ?? null,
      powerUpCount: r.power_up_count ?? 0,
    };
  }

  return receipts;
}
