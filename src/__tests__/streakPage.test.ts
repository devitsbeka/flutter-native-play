/**
 * The streak page (Figma 1069:18), and the payout behind its buttons.
 *
 * Two things here are easy to undo by accident:
 *
 *  - the coin table lives in two places, the client's STREAK_BONUSES and the
 *    migration's CASE. The page shows one and the server pays the other, so
 *    they are read together here and compared;
 *  - the claim is server-side and once-only because the client cannot read
 *    its own grant ledger. A "claimed" flag kept in the browser is exactly
 *    how earlier streak rewards came to be banked twice.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { STREAK_MILESTONES } from "@/hooks/useStreakMilestones";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const page = read("src/pages/Streak.tsx");
const hook = read("src/hooks/useStreakMilestones.ts");
const migration = read("supabase/migrations/20261001100000_streak_milestones.sql");

const LOCALES = ["en", "ka", "de", "es", "fr", "it", "pt"] as const;

describe("the flame lands on a page, not a sheet", () => {
  it("is routed, and the home screen navigates to it", () => {
    expect(read("src/App.tsx")).toMatch(/<Route path="\/streak" element=\{<Streak \/>\} \/>/);
    expect(read("src/pages/Index.tsx")).toMatch(/onStreakClick=\{\(\) => navigate\("\/streak"\)\}/);
    expect(existsSync(join(process.cwd(), "src/components/home/StreakModal.tsx"))).toBe(false);
    expect(read("src/pages/Index.tsx")).not.toMatch(/StreakModal/);
  });

  it("draws the design's own components, not a redrawing of them", () => {
    for (const asset of ["coin", "flame", "chest", "money-bag", "lock"]) {
      expect(existsSync(join(process.cwd(), `src/assets/streak/${asset}.png`)), asset).toBe(true);
      expect(page).toContain(`@/assets/streak/${asset}.png`);
    }
    // The frame's measures: Slackey 56/62 for the counts, the 34px black
    // upper-case title, the 66px milestone rows, the stat cards' rail.
    expect(page).toMatch(/font-hero text-\[56px\] leading-\[62px\]/);
    expect(page).toMatch(/text-\[34px\] font-black uppercase leading-\[36px\] tracking-\[-1\.3px\]/);
    expect(page).toMatch(/h-\[66px\] min-h-\[64px\]/);
    expect(page).toMatch(/bg-\[#faf0fa\] shadow-\[inset_0px_2px_4px_0px_rgba\(0,0,0,0\.05\)\]/);
    // Today wears the flame on the gold tile; the last slot is the chest.
    expect(page).toMatch(/border-\[#ffba26\] bg-\[rgba\(255,186,38,0\.1\)\]/);
    expect(page).toMatch(/isChest \? chestImg : slot\.state === "today" \? flameImg : coinImg/);
  });

  it("scrolls itself, because the document does not on the device", () => {
    expect(page).toMatch(/min-h-0 flex-1 overflow-y-auto overflow-x-hidden/);
  });

  it("says every word in every language", () => {
    for (const lang of LOCALES) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["streakTitle", "streakDayOne", "streakDayMany", "streakCoinsReward", "streakWeekChest", "streakNotYet"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s*${key}: ".`));
      }
    }
    // And nothing on the page is a literal the old modal used to hard-code.
    expect(page).not.toMatch(/XP ბონუსი/);
    expect(read("src/utils/localDate.ts")).toMatch(/export function formatDayMonthShort/);
  });
});

describe("a milestone pays once, and the server decides", () => {
  it("the client and the migration carry the same coin table", () => {
    for (const { days, coins } of STREAK_MILESTONES) {
      expect(migration, `day ${days}`).toMatch(new RegExp(`WHEN ${days}\\s+THEN ${coins}\\b`));
    }
    // Exactly those, no more: a tier added on one side only is a button
    // that either pays nothing or cannot be pressed.
    const inSql = [...migration.matchAll(/WHEN (\d+)\s+THEN \d+/g)].map((m) => Number(m[1]));
    expect(inSql).toEqual(STREAK_MILESTONES.map((m) => m.days));
  });

  it("is a SECURITY DEFINER claim, revoked from anon, deduped on the ledger", () => {
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_streak_milestone_reference_unique/);
    expect(migration).toMatch(/WHERE kind = 'streak_milestone' AND reference IS NOT NULL/);
    for (const fn of ["claim_streak_milestone(integer)", "streak_milestones_claimed()", "streak_milestone_coins(integer)"]) {
      expect(migration, fn).toContain(`REVOKE ALL ON FUNCTION public.${fn} FROM PUBLIC, anon;`);
    }
    expect(migration).toMatch(/FROM public\.user_mission_streaks[\s\S]*?FOR UPDATE;/);
    expect(migration).toContain("last_completion_date >= CURRENT_DATE - 1");
    expect(migration).toMatch(/IF COALESCE\(v_streak, 0\) < p_days THEN/);
    // The client never keeps "claimed" itself: it asks.
    expect(hook).toMatch(/supabase\.rpc\("streak_milestones_claimed"\)/);
    expect(hook).toMatch(/supabase\.rpc\("claim_streak_milestone", \{ p_days: days \}\)/);
    expect(hook).not.toMatch(/localStorage/);
    // And it copes with the window before Lovable has applied the migration.
    expect(hook).toMatch(/const FUNCTION_MISSING = "PGRST202";/);
  });

  it("is executed in CI, and typed for the client", () => {
    expect(read(".github/workflows/pr-checks.yml")).toContain("supabase/tests/14-streak-milestones.sql");
    expect(existsSync(join(process.cwd(), "supabase/tests/14-streak-milestones.sql"))).toBe(true);
    const types = read("src/integrations/supabase/types.ts");
    expect(types).toMatch(/claim_streak_milestone: \{\s*\n\s*Args: \{ p_days: number \}/);
    expect(types).toMatch(/streak_milestones_claimed: \{\s*\n\s*Args: never\s*\n\s*Returns: number\[\]/);
  });

  it("the page lists the selected day's four missions, easiest first, and the streak they keep", () => {
    const page = read("src/pages/Streak.tsx");
    const missions = read("src/hooks/useMissions.ts");
    const streak = read("src/hooks/useMissionStreak.ts");

    // The rail is the selector: every tile is a button that picks its day,
    // and the day hook the home sheet already uses answers for it.
    expect(page).toContain("useDailyMissionsFor(selected)");
    expect(page).toContain("onClick={() => setSelected(slot.key)}");
    // The streak is kept days, not the win streak the results screens mean.
    expect(page).toContain("useMissionStreak()");
    expect(page).not.toMatch(/profile\??\.current_streak/);

    // A day is one mission per tier, and the first tier is "play one game"
    // alone — the ask that keeps the streak by itself.
    expect(missions).toContain("return rotationByTier(DAILY_POOL, dateISO);");
    expect(missions.match(/difficulty: 1,/g)).toHaveLength(1);
    expect(missions).toMatch(/mission_id: "play_one",[\s\S]*?difficulty: 1,/);
    expect(missions).toContain('game_played: ["play_one", "play_games"]');
    // The day is kept by the first completion, before the all-done bonus.
    expect(missions).toContain("void keepDay().then(() => closeOutDayIfFinished(mission.id));");
    // The daily ladder payout is gone: milestones pay once, server-side.
    for (const file of ["src/hooks/useMissions.ts", "src/hooks/useMissionStreak.ts", "src/components/home/MissionInfoModal.tsx"]) {
      expect(read(file), file).not.toContain("claimStreakBonus");
    }
    expect(streak).toContain("recorded: true");
  });

  it("the new page strings and the play_one mission exist in every language", () => {
    for (const lang of LOCALES) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["streakKeepRule", "streakDayMissions", "streakMilestonesTitle", "play_oneTitle", "play_oneDesc"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`${key}: "[^"]+"`));
      }
      // The achievements no longer ask for every mission of the day.
      expect(src, lang).not.toMatch(/achStreak3Desc: "[^"]*(all daily|ყველა დღიური|alle täglichen|todas las misiones|toutes les missions|tutte le missioni|todas as missões)/);
    }
  });
});
