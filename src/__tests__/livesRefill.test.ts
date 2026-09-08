/**
 * Five games back after three hours, and a word to say so.
 *
 * Three numbers have to agree or the countdown on the play-limit card is a
 * lie: the client's window, the `consume_free_play` window in the database,
 * and the window the refill push measures from. They are all three hours.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_FREE_PLAYS, WINDOW_MS } from "@/utils/playLimit";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const pushes = read("supabase/functions/scheduled-pushes/index.ts");

describe("three hours, five plays, everywhere", () => {
  it("the client counts five per three-hour window", () => {
    expect(MAX_FREE_PLAYS).toBe(5);
    expect(WINDOW_MS).toBe(3 * 60 * 60 * 1000);
  });

  it("and the database charges against the same window", () => {
    // The client's countdown is drawn from free_plays_window_start; if the
    // function that writes it used a different interval the card would count
    // down to a moment nothing happens at.
    const sql = read("supabase/migrations/20260813220000_buy_extra_plays.sql");
    expect(sql.match(/v_window\s+constant interval := interval '3 hours';/g) ?? []).toHaveLength(2);
  });

  it("and so does the push that announces the refill", () => {
    expect(pushes).toMatch(/const PLAY_WINDOW_MS = 3 \* 60 \* 60 \* 1000;/);
    expect(pushes).toMatch(/const MAX_FREE_PLAYS = 5;/);
    expect(pushes).toMatch(/const refillAt = c\.freeWindowStart \+ PLAY_WINDOW_MS;/);
  });
});

describe("the refill is actually announced", () => {
  it("only to a non-PRO player who spent all five and has not come back", () => {
    const rule = pushes.slice(pushes.indexOf("---- Lives refilled"), pushes.indexOf("---- Send and log"));
    expect(rule).toMatch(/if \(c\.isVip\) continue;/);
    expect(rule).toMatch(/if \(c\.freePlaysUsed < MAX_FREE_PLAYS \|\| c\.freeWindowStart === null\) continue;/);
    expect(rule).toMatch(/c\.lastSeen > refillAt\) continue;/);
    // Not in the middle of the night, and not twice.
    expect(rule).toMatch(/c\.local\.hour < 10 \|\| c\.local\.hour >= 22/);
    expect(rule).toMatch(/countToday\(c\.userId, "lives_full"\) >= 2/);
    expect(rule).toMatch(/sentWithinHours\(c\.userId, 2\)/);
  });

  it("and a refill is not missed because the cron runs on the hour", () => {
    // The lookback was RUN_INTERVAL_MS + 5 minutes = 35, which assumes a
    // half-hourly schedule this repo does not set — the schedule lives in
    // cron.job. On an hourly one, every refill 36-60 minutes old was dropped.
    expect(pushes).toMatch(/const REFILL_CATCH_UP_MS = 75 \* 60 \* 1000;/);
    expect(pushes).toMatch(/refillAt < nowMs - REFILL_CATCH_UP_MS\) continue;/);
    expect(pushes).not.toMatch(/RUN_INTERVAL_MS \+ 5 \* 60 \* 1000/);
  });

  it("in every language the app speaks", () => {
    const copy = read("supabase/functions/_shared/pushCopy.ts");
    // Two `lives_full:` keys in this file — the icon/route map and the copy.
    // The copy is the one whose first line is a language.
    const start = copy.search(/ {2}lives_full: \{\s*\n\s+ka: \{/);
    const block = copy.slice(start, copy.indexOf("  tv_weekend: {", start));
    for (const lang of ["ka", "en", "de", "es", "fr", "it", "pt"]) {
      expect(block, lang).toMatch(new RegExp(`\\n\\s+${lang}: \\{ title: "`));
    }
  });
});

describe("the play-limit card", () => {
  it("has no wheel on it", () => {
    // The offer is unlimited play; the wheel is a different reward and read
    // as one more thing to decode on a card that is already asking for money.
    const modal = read("src/components/home/PlayLimitModal.tsx");
    expect(modal).not.toMatch(/wheel/i);
  });
});
