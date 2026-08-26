import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The resolver, run against the rows the live database actually holds.
 *
 * The wiring is pinned by source assertions elsewhere; this drives the real
 * code with real data, because the interesting part is not that a function
 * was called — it is that `celebrities` comes out as "Celebrities" for an
 * English reader, "ცნობილი ადამიანები" for a Georgian one, and wears the
 * same icon either way.
 *
 * Rows copied from the live catalogue:
 *   categories            celebrities -> ცნობილი ადამიანები / pop-star
 *   category_translations en Celebrities, de Prominente, fr Célébrités, ...
 */
const CATEGORY_ROWS = [
  {
    id: "c38e0f1f-3325-4027-be2f-dcb253985096",
    category_id: "celebrities",
    name: "ცნობილი ადამიანები",
    icon_slug: "pop-star",
  },
  {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    category_id: "archaeology",
    name: "არქეოლოგია",
    icon_slug: "archeo",
  },
];

const TRANSLATIONS: Record<string, { category_id: string; name: string }[]> = {
  en: [{ category_id: "c38e0f1f-3325-4027-be2f-dcb253985096", name: "Celebrities" }],
  de: [{ category_id: "c38e0f1f-3325-4027-be2f-dcb253985096", name: "Prominente" }],
  fr: [{ category_id: "c38e0f1f-3325-4027-be2f-dcb253985096", name: "Célébrités" }],
};

vi.mock("@/integrations/supabase/client", () => {
  const from = (table: string) => {
    if (table === "categories") {
      return { select: () => ({ eq: () => Promise.resolve({ data: CATEGORY_ROWS, error: null }) }) };
    }
    return {
      select: () => ({
        eq: (_col: string, lang: string) =>
          Promise.resolve({ data: TRANSLATIONS[lang] ?? [], error: null }),
      }),
    };
  };
  return { supabase: { from } };
});

let mod: typeof import("@/hooks/useCategoryDisplay");

beforeEach(async () => {
  vi.resetModules();
  mod = await import("@/hooks/useCategoryDisplay");
});

describe("a category resolved against the real catalogue", () => {
  it("is English for an English reader", async () => {
    await mod.primeCategoryDisplay("en");
    expect(mod.categoryNameSync("celebrities", "whatever the queue stored", "en")).toBe("Celebrities");
  });

  it("is Georgian for a Georgian reader, with no translations query at all", async () => {
    await mod.primeCategoryDisplay("ka");
    expect(mod.categoryNameSync("celebrities", "Celebrities", "ka")).toBe("ცნობილი ადამიანები");
  });

  it("follows the reader into a third language", async () => {
    await mod.primeCategoryDisplay("de");
    expect(mod.categoryNameSync("celebrities", "Celebrities", "de")).toBe("Prominente");
  });

  it("overrules the name the queue stored, whatever language it was in", async () => {
    // This is the reported bug: a queue built in one language kept showing
    // that language's names to everyone.
    await mod.primeCategoryDisplay("ka");
    expect(mod.categoryNameSync("celebrities", "Celebrities", "ka")).not.toBe("Celebrities");
  });

  it("falls back to the Georgian name when a language has no translation row", async () => {
    // Better a real name in the wrong language than a raw slug or a blank.
    await mod.primeCategoryDisplay("en");
    expect(mod.categoryNameSync("archaeology", null, "en")).toBe("არქეოლოგია");
  });

  it("keeps a user trivia's own title untouched", async () => {
    await mod.primeCategoryDisplay("en");
    expect(mod.categoryNameSync(null, "My own quiz", "en")).toBe("My own quiz");
  });
});

describe("the icon does not move with the language", () => {
  it("is the same slug in every language", async () => {
    await mod.primeCategoryDisplay("en");
    const en = mod.categoryIconCandidates("celebrities");
    await mod.primeCategoryDisplay("ka");
    const ka = mod.categoryIconCandidates("celebrities");
    expect(en).toBe(ka);
    expect(en!.split(",")[0]).toBe("pop-star");
  });

  it("still offers the map's slug behind an unindexed one", async () => {
    await mod.primeCategoryDisplay("en");
    const parts = mod.categoryIconCandidates("archaeology")!.split(",");
    expect(parts[0]).toBe("archeo");
    expect(parts).toContain("fossil");
  });
});
