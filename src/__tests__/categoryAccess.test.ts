import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  categoryTier,
  freeLevelAllowance,
  isCategoryLocked,
  playableLevels,
  FREE_CATEGORY_IDS,
  PREMIUM_CATEGORY_IDS,
} from "@/utils/categoryAccess";

/**
 * Three tiers, and the rule that they are decided in exactly one place.
 *
 * Before this there were three places and they disagreed. The level grid had
 * a flat "3 free levels in each of 5 categories". Explore's უფასო/პრემიუმ
 * tabs filtered on an `is_premium` column whose only migration marked the
 * six picture-guess categories premium — the front door, the Popular row,
 * the categories with the bespoke 3D art. And the card drew neither, so
 * nothing on screen said which of the two a player was looking at.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** Source with its comments stripped: a rule about code must not be
 *  satisfied, or broken, by prose describing the code. */
const codeOf = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("which tier a category is in", () => {
  it("puts every guess category in free", () => {
    for (const id of FREE_CATEGORY_IDS) {
      expect(categoryTier({ category_id: id }), id).toBe("free");
    }
  });

  it("puts the nine in premium", () => {
    for (const id of PREMIUM_CATEGORY_IDS) {
      expect(categoryTier({ category_id: id }), id).toBe("premium");
    }
  });

  it("leaves everything else standard", () => {
    for (const id of ["geography", "math", "georgian_history", "anime_manga"]) {
      expect(categoryTier({ category_id: id }), id).toBe("standard");
    }
  });

  it("reads the slug from either shape a category arrives in", () => {
    // Discover maps category_id onto `id`; the room's library keeps the uuid
    // there and the slug in category_id. The same category must not land in
    // two different tiers depending on which screen is asking.
    expect(categoryTier({ id: "science" })).toBe("premium");
    expect(categoryTier({ id: "0c8f-uuid-ish", category_id: "science" })).toBe("premium");
  });

  it("lets the database overrule the built-in list", () => {
    // The column is the authority once it exists — otherwise a change made
    // in SQL would never reach the app.
    expect(categoryTier({ category_id: "geography", isPremium: true })).toBe("premium");
    expect(categoryTier({ category_id: "science", isPremium: false })).toBe("standard");
  });

  it("falls back to the list when the column is not there yet", () => {
    // Two migrations have sat on main unapplied for a fortnight. A client
    // that could only learn this from the column would ship the feature
    // switched off and nobody would find out.
    expect(categoryTier({ category_id: "science", isPremium: undefined })).toBe("premium");
    expect(categoryTier({ category_id: "science", isPremium: null })).toBe("premium");
  });

  it("keeps the front door open even if the database says otherwise", () => {
    // This is the exact mistake the previous migration made. If it is ever
    // made again, the guess categories stay playable and the error shows up
    // as an odd tab count rather than as a paywalled demo.
    expect(categoryTier({ category_id: "guess_city", isPremium: true })).toBe("free");
  });

  it("does not put a category in two tiers at once", () => {
    const free = new Set<string>(FREE_CATEGORY_IDS);
    for (const id of PREMIUM_CATEGORY_IDS) expect(free.has(id), id).toBe(false);
  });
});

describe("how many levels that buys", () => {
  it("gives a free category away entirely", () => {
    expect(freeLevelAllowance("free")).toBe(Number.POSITIVE_INFINITY);
    expect(playableLevels({ category_id: "guess_logo" }, false)).toBe(Number.POSITIVE_INFINITY);
  });

  it("gives an ordinary category exactly one level", () => {
    // "one level each" — not three, and not three in only five categories,
    // which is what it used to be.
    expect(freeLevelAllowance("standard")).toBe(1);
    expect(playableLevels({ category_id: "geography" }, false)).toBe(1);
  });

  it("gives a premium category none", () => {
    expect(freeLevelAllowance("premium")).toBe(0);
    expect(playableLevels({ category_id: "movies" }, false)).toBe(0);
  });

  it("gives a subscriber all of everything", () => {
    for (const id of ["movies", "geography", "guess_city"]) {
      expect(playableLevels({ category_id: id }, true), id).toBe(Number.POSITIVE_INFINITY);
    }
  });
});

describe("what draws a lock", () => {
  it("locks a premium category, and only a premium one", () => {
    expect(isCategoryLocked({ category_id: "space" }, false)).toBe(true);
    expect(isCategoryLocked({ category_id: "geography" }, false)).toBe(false);
    expect(isCategoryLocked({ category_id: "guess_flag" }, false)).toBe(false);
  });

  it("never locks anything for a subscriber", () => {
    expect(isCategoryLocked({ category_id: "space" }, true)).toBe(false);
  });

  it("does not lock a standard category, which still gives its first level", () => {
    // A lock on a category you can actually start would be a lie, and it is
    // the difference between the premium tier and the standard one.
    expect(isCategoryLocked({ category_id: "math" }, false)).toBe(false);
    expect(playableLevels({ category_id: "math" }, false)).toBeGreaterThan(0);
  });
});

/**
 * The client's list and the migration's list are two copies of one decision.
 * They are allowed to exist — the column arrives late here, so the client
 * cannot wait for it — but they are not allowed to drift.
 */
describe("the client list and the migration agree", () => {
  const migration = read("supabase/migrations/20260912100000_premium_categories.sql");

  it("names the same nine categories", () => {
    const block = migration.match(/SET is_premium = true\s*\nWHERE category_id IN \(([\s\S]*?)\);/);
    expect(block, "expected the premium UPDATE").not.toBeNull();
    const inSql = [...block![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(inSql).toEqual([...PREMIUM_CATEGORY_IDS].sort());
  });

  it("clears the flag before setting it, so the old six do not linger", () => {
    // The previous migration marked the guess categories premium. Without a
    // reset this file would ADD nine to those six and the premium tab would
    // show fifteen — including the ones that must never be locked.
    expect(migration).toMatch(/SET is_premium = false/);
    const clearAt = migration.indexOf("SET is_premium = false");
    const setAt = migration.indexOf("SET is_premium = true");
    expect(clearAt).toBeGreaterThan(-1);
    expect(clearAt).toBeLessThan(setAt);
  });

  it("marks no guess category premium", () => {
    for (const id of FREE_CATEGORY_IDS) {
      expect(migration.includes(`'${id}'`), `${id} must not be in the premium set`).toBe(false);
    }
  });

  it("can be applied even if the column migration has not been", () => {
    // Lovable applies these out of order often enough that assuming a
    // predecessor ran is how a deploy fails on a missing column.
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS is_premium/);
  });
});

describe("the tab strip", () => {
  const discover = read("src/pages/Discover.tsx");

  it("leads with all, then premium", () => {
    const strip = discover.match(/const tabs = useMemo\(\(\) => \[([\s\S]*?)\], \[/);
    expect(strip, "expected the tabs list").not.toBeNull();
    const ids = [...strip![1].matchAll(/id: "([a-z_]+)"/g)].map((m) => m[1]);
    expect(ids.slice(0, 3)).toEqual(["all", "premium", "free"]);
  });

  it("drops free for a subscriber and keeps premium", () => {
    // To someone with PRO every category is free, so the tab would either
    // repeat `all` or claim the nine they just paid for are the paid part.
    expect(discover).toMatch(/\.\.\.\(isVip \? \[\] : \[\{ id: "free"/);
    const strip = discover.match(/const tabs = useMemo\(\(\) => \[([\s\S]*?)\], \[/)![1];
    expect(strip).toMatch(/\{ id: "premium", label: t\("discover\.premium"\) \},/);
  });

  it("does not leave a subscriber standing on a tab that is gone", () => {
    expect(discover).toMatch(/if \(isVip && activeTab === "free"\) setActiveTab\("all"\);/);
  });

  it("filters free on the tier, not on not-premium", () => {
    // Those two readings differ by the fifty-odd standard categories, which
    // give one level away and then ask for a subscription.
    expect(codeOf(discover)).toMatch(/activeTab === "free"[\s\S]{0,120}?cat\.tier === "free"/);
    expect(codeOf(discover), "not-premium would list the standard fifty as free")
      .not.toMatch(/activeTab === "free"[\s\S]{0,120}?!cat\.isPremium/);
  });
});

describe("a locked card", () => {
  const card = read("src/components/discover/AirbnbCategoryCard.tsx");
  const discover = read("src/pages/Discover.tsx");

  it("wears a lock", () => {
    expect(card).toMatch(/\{isLocked && \(/);
    expect(card).toMatch(/<Lock className="w-4 h-4 text-white"/);
  });

  it("does not claim progress it cannot let you make", () => {
    // 0/16 under a lock reads as a bug, and a half-full bar invites the
    // question of why the rest is unreachable.
    expect(card).toMatch(/const progressPercent = isLocked \? 0 :/);
    expect(card).toMatch(/const isCompleted = !isLocked && progress >= totalLevels;/);
  });

  it("opens the paywall instead of the category", () => {
    // Not a dead tile: the card said PRO, so the tap says what PRO costs.
    expect(discover).toMatch(/if \(!isVip && PREMIUM_LOOKUP\.has\(categoryId\)\) \{\s*\n\s*setPaywallOpen\(true\);/);
  });

  it("takes the premium set from the catalogue, not from a flat import", () => {
    // Otherwise a change made in SQL would never reach the click handler.
    expect(discover).toMatch(/categories\.filter\(\(c\) => c\.tier === "premium"\)/);
  });

  it("is decided once, by the hook that loads the categories", () => {
    const hook = read("src/hooks/useCategories.ts");
    expect(hook).toMatch(/const tier = categoryTier\(\{/);
    expect(hook).toMatch(/isPremium: tier === 'premium',/);
  });
});

describe("the level grid behind it", () => {
  const page = read("src/pages/CategoryPage.tsx");
  const limit = read("src/hooks/useCategoryPlayLimit.ts");

  it("locks levels past what the category gives away", () => {
    expect(page).toMatch(/const freeAllowance = levelsAllowedIn\(categoryId \|\| ""\);/);
    expect(page).toMatch(/level > freeAllowance/);
  });

  it("has no flat per-category constant left", () => {
    // Three levels in each of five categories was the old rule; leaving the
    // constant behind is how a screen keeps quietly using it.
    expect(codeOf(limit)).not.toMatch(/MAX_FREE_LEVELS_PER_CATEGORY|MAX_FREE_CATEGORIES/);
    expect(codeOf(page)).not.toMatch(/maxFreeLevelsPerCategory/);
  });

  it("still lets a finished level be replayed", () => {
    expect(page).toMatch(/&& !completed;/);
    expect(limit).toMatch(/data\.categoriesPlayed\.get\(categoryId\)\?\.has\(levelNumber\)/);
  });

  it("judges a named level by its number, not by how many were played", () => {
    // Counting plays let somebody finish level 1, come back, and open level
    // 5 — the allowance was "how many", never "which".
    expect(limit).toMatch(/if \(levelNumber !== undefined\) return levelNumber <= allowance;/);
  });

  it("blocks a whole category only when it is premium", () => {
    expect(limit).toMatch(/isCategoryBlocked[\s\S]{0,200}?levelsAllowedIn\(categoryId\) === 0/);
  });
});
