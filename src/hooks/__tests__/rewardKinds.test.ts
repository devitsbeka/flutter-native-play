import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The RewardKind union and the currency_grant_limits table have to agree.
 *
 * credit_gameplay_reward rejects a kind that has no row, so a kind added to
 * the TypeScript union without a matching migration row does not fail at
 * build time — it fails in front of a player who has just finished a game and
 * gets no reward. This test is the build-time check that doesn't otherwise
 * exist.
 */

const REPO = resolve(__dirname, "../../..");

function kindsFromTypeScript(): string[] {
  const src = readFileSync(resolve(REPO, "src/hooks/useCurrency.ts"), "utf8");
  const union = src.match(/export type RewardKind =([\s\S]*?);/);
  if (!union) throw new Error("Could not find the RewardKind union in useCurrency.ts");
  return [...union[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort();
}

function kindsFromMigration(): string[] {
  const sql = readFileSync(
    resolve(REPO, "supabase/migrations/20260813150000_server_authoritative_currency.sql"),
    "utf8",
  );
  const insert = sql.match(/INSERT INTO public\.currency_grant_limits[\s\S]*?ON CONFLICT/);
  if (!insert) throw new Error("Could not find the currency_grant_limits seed");
  return [...insert[0].matchAll(/\('([a-z_]+)',/g)].map((m) => m[1]).sort();
}

describe("reward kinds", () => {
  it("gives every client reward kind a limits row", () => {
    const missing = kindsFromTypeScript().filter((k) => !kindsFromMigration().includes(k));
    expect(missing, "kinds with no currency_grant_limits row").toEqual([]);
  });

  it("does not define limits for kinds the client cannot request", () => {
    // Not a correctness failure, but a stale row is a limit nobody is reading,
    // and it hides the fact that a path was removed.
    const orphaned = kindsFromMigration().filter((k) => !kindsFromTypeScript().includes(k));
    expect(orphaned, "limits rows with no matching RewardKind").toEqual([]);
  });

  it("keeps the server-decided kinds out of the client union", () => {
    // daily_reward, leaderboard_reward and exchange are written by their own
    // functions, which pick the amount themselves. Exposing them as something
    // the client can request would hand back the control those functions exist
    // to take.
    const clientKinds = kindsFromTypeScript();
    for (const serverOnly of ["daily_reward", "leaderboard_reward", "exchange"]) {
      expect(clientKinds, serverOnly).not.toContain(serverOnly);
    }
  });
});
