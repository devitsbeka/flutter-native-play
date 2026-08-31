import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MOST_LIKELY_BALLOT_SIZE,
  MOST_LIKELY_CATEGORY_ID,
  MOST_LIKELY_POINTS,
  MOST_LIKELY_QUESTIONS_PER_ROUND,
  MOST_LIKELY_VOTE_SENTINEL,
  excludePartyCategories,
  isPartyCategory,
  mostLikelyAnswerOptions,
  mostLikelyBallot,
  pinPartyCategoriesFirst,
} from "@/config/partyCategories";
import { MAX_QUESTION_POINTS } from "@/utils/scoring";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260916100000_most_likely_to.sql"),
  "utf8",
);

const majorityMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260921230000_most_likely_majority_and_icons.sql"),
  "utf8",
);

describe("the per-question ballot", () => {
  const six = ["Ana", "Ben", "Cat", "Dan", "Eve", "Fin"];

  it("small rooms vote on everyone, in place", () => {
    expect(mostLikelyBallot(["Ana", "Ben", "Cat"])).toEqual(["Ana", "Ben", "Cat"]);
    expect(mostLikelyBallot(six.slice(0, 4))).toEqual(["Ana", "Ben", "Cat", "Dan"]);
  });

  it("big rooms ballot exactly four distinct real names", () => {
    for (let i = 0; i < 25; i++) {
      const ballot = mostLikelyBallot(six);
      expect(ballot).toHaveLength(MOST_LIKELY_BALLOT_SIZE);
      expect(new Set(ballot).size).toBe(MOST_LIKELY_BALLOT_SIZE);
      for (const name of ballot) expect(six).toContain(name);
    }
  });

  it("rotates: over many draws every name gets on a ballot", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) mostLikelyBallot(six).forEach((n) => seen.add(n));
    expect([...seen].sort()).toEqual([...six].sort());
  });

  it("never mutates the caller's list", () => {
    const names = [...six];
    mostLikelyBallot(names);
    expect(names).toEqual(six);
  });
});

describe("majority-only settlement (the follow-up migration)", () => {
  it("pays only a single top name — a split vote pays nobody", () => {
    expect(majorityMigration).toContain(
      "IF array_length(v_winners, 1) IS DISTINCT FROM 1 THEN",
    );
  });

  it("still pays the pinned flat amount", () => {
    expect(majorityMigration).toContain(`points_earned = ${MOST_LIKELY_POINTS}`);
    expect(majorityMigration).toContain(`+ ${MOST_LIKELY_POINTS}`);
  });

  it("gives every one of the 36 prompt families an icon", () => {
    const updates = majorityMigration.match(/SET icon_slug = '/g) || [];
    expect(updates).toHaveLength(36);
  });
});

describe("the vote answer options", () => {
  const p = (user_id: string, nickname: string) => ({ user_id, nickname });

  it("is one name per player, in join order", () => {
    expect(
      mostLikelyAnswerOptions([p("u1", "Ana"), p("u2", "Ben"), p("u3", "Cat")]),
    ).toEqual(["Ana", "Ben", "Cat"]);
  });

  it("keeps duplicate nicknames voteable as separate people", () => {
    // The vote IS the name string — two players both named "John" would
    // otherwise pool their votes into one bucket.
    expect(
      mostLikelyAnswerOptions([p("u1", "John"), p("u2", "John"), p("u3", "john")]),
    ).toEqual(["John", "John (2)", "john (3)"]);
  });

  it("never produces an empty or blank name", () => {
    expect(mostLikelyAnswerOptions([p("u1", ""), p("u2", "   ")])).toEqual([
      "Player",
      "Player (2)",
    ]);
  });

  it("leaves out the observer", () => {
    expect(
      mostLikelyAnswerOptions([p("u1", "Host"), p("u2", "Ben")], "u1"),
    ).toEqual(["Ben"]);
  });
});

describe("party categories stay out of solo lists", () => {
  it("filters by slug in either shape a category row arrives in", () => {
    const discoverShape = [{ id: "movies" }, { id: MOST_LIKELY_CATEGORY_ID }];
    const libraryShape = [
      { id: "some-uuid", category_id: "movies" },
      { id: "other-uuid", category_id: MOST_LIKELY_CATEGORY_ID },
    ];
    expect(excludePartyCategories(discoverShape)).toEqual([{ id: "movies" }]);
    expect(excludePartyCategories(libraryShape)).toEqual([
      { id: "some-uuid", category_id: "movies" },
    ]);
  });

  it("knows its own slug and nothing else", () => {
    expect(isPartyCategory(MOST_LIKELY_CATEGORY_ID)).toBe(true);
    expect(isPartyCategory("movies")).toBe(false);
    expect(isPartyCategory(null)).toBe(false);
  });
});

describe("party categories lead the room pickers", () => {
  it("moves them to the front, keeping everything else in arriving order", () => {
    const rows = [
      { id: "u1", category_id: "movies" },
      { id: "u2", category_id: MOST_LIKELY_CATEGORY_ID },
      { id: "u3", category_id: "science" },
    ];
    expect(pinPartyCategoriesFirst(rows).map((r) => r.category_id)).toEqual([
      MOST_LIKELY_CATEGORY_ID,
      "movies",
      "science",
    ]);
  });

  it("is a no-op when none are present", () => {
    const rows = [{ id: "movies" }, { id: "science" }];
    expect(pinPartyCategoriesFirst(rows)).toBe(rows);
  });
});

describe("the migration and the client agree", () => {
  it("on the category slug", () => {
    expect(migration).toContain(`'${MOST_LIKELY_CATEGORY_ID}'`);
  });

  it("on the vote sentinel", () => {
    // The sentinel is how every device recognises a vote round AND the only
    // shape the settlement function will settle. A drift here means votes
    // that never pay out.
    expect(migration).toContain(`'${MOST_LIKELY_VOTE_SENTINEL}'`);
    const seeded = migration.match(/'__vote__', '\[\]'::jsonb/g) || [];
    expect(seeded.length).toBeGreaterThan(0);
  });

  it("on the payout", () => {
    // settle_most_likely_votes pays a flat amount per majority vote; the
    // client shows/reasons about the same number via MOST_LIKELY_POINTS.
    expect(migration).toContain(`points_earned = ${MOST_LIKELY_POINTS}`);
    expect(migration).toContain(`+ ${MOST_LIKELY_POINTS}`);
  });

  it("keeps the payout under the per-question score ceiling", () => {
    // Settlement writes scores directly (SECURITY DEFINER), so the 275 clamp
    // on increment_participant_score is not in its path — the policies must
    // still agree, or a vote question would outpay a perfect trivia answer.
    expect(MOST_LIKELY_POINTS).toBeLessThanOrEqual(MAX_QUESTION_POINTS);
  });

  it("on the bank: 36 prompts in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const rows = migration.match(new RegExp(`, '${lang}', '`, "g")) || [];
      // 36 question rows (+1 category translation row matches the same shape)
      expect(rows.length, `language ${lang}`).toBeGreaterThanOrEqual(36);
    }
  });

  it("marks translated rows so the translation cron skips them", () => {
    // Non-English rows must carry translated_from; NULL roots are the 36
    // English prompts only.
    const nullRoots = migration.match(/true, true, NULL\)/g) || [];
    expect(nullRoots.length).toBe(36);
  });
});

describe("round shape", () => {
  it("serves ten prompts per party round, from a bank that can fill them", () => {
    expect(MOST_LIKELY_QUESTIONS_PER_ROUND).toBe(10);
    const nullRoots = migration.match(/true, true, NULL\)/g) || [];
    expect(nullRoots.length).toBeGreaterThanOrEqual(MOST_LIKELY_QUESTIONS_PER_ROUND);
  });
});
