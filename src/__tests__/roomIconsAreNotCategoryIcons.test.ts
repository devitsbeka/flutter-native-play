import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { iconSlugFromUrl, isCategoryIcon, RESERVED_CATEGORY_ICON_SLUGS } from "@/utils/categoryIcons";

/**
 * A room never wears a category's icon.
 *
 * A room's face and a category's face are read the same way on the same
 * card — the room's icon beside its name, the round's icon beside the
 * round — so a room wearing a category's icon says it IS that category.
 * "დეტექტივები" wore the mystery box, which every undecided round wears;
 * "კოსმიური კლანი" wore the astronaut, which is Astronomy's (owner: "we
 * shouldn't use icons on rooms if we use that icon in our category
 * library, check").
 *
 * The dealt pool struck category icons already. The other three ways a
 * room gets an icon did not: the name generator's pick, the host's own
 * pick in the icon sheet, and the mystery box, which no category row
 * names. One list now, read by all four — and the same rule as a trigger
 * on game_rooms, for whatever writes the column next.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the slug inside a library icon's URL", () => {
  it("reads it off the file name, cache-buster or not", () => {
    expect(iconSlugFromUrl("https://x.supabase.co/storage/v1/object/public/icon-library/astronaut.png")).toBe("astronaut");
    expect(iconSlugFromUrl("https://x.supabase.co/storage/v1/object/public/icon-library/mystery-box.png?t=1767636214107")).toBe("mystery-box");
    expect(iconSlugFromUrl("https://x.supabase.co/storage/v1/object/public/icon-library/search-magnifier.png#x")).toBe("search-magnifier");
  });

  it("is null for anything that is not a library icon", () => {
    expect(iconSlugFromUrl(null)).toBeNull();
    expect(iconSlugFromUrl("")).toBeNull();
    expect(iconSlugFromUrl("https://x.supabase.co/storage/v1/object/public/avatars/me.png")).toBeNull();
  });
});

describe("what counts as a category's icon", () => {
  const slugs = new Set(["astronaut", ...RESERVED_CATEGORY_ICON_SLUGS]);

  it("matches by URL and by library row alike", () => {
    expect(isCategoryIcon("https://x/icon-library/astronaut.png", slugs)).toBe(true);
    expect(isCategoryIcon({ slug: "astronaut", icon_url: "https://x/icon-library/astronaut.png" }, slugs)).toBe(true);
    expect(isCategoryIcon({ icon_url: "https://x/icon-library/astronaut.png" }, slugs)).toBe(true);
  });

  it("always counts the mystery box, which no category row names", () => {
    // Every undecided round wears it (utils/undecidedRound), so a room in
    // it reads as a random round.
    expect(RESERVED_CATEGORY_ICON_SLUGS).toContain("mystery-box");
    expect(isCategoryIcon("https://x/icon-library/mystery-box.png?t=1", slugs)).toBe(true);
  });

  it("leaves every other icon alone", () => {
    expect(isCategoryIcon("https://x/icon-library/panda.png", slugs)).toBe(false);
    expect(isCategoryIcon(null, slugs)).toBe(false);
    expect(isCategoryIcon({ slug: "panda" }, slugs)).toBe(false);
  });
});

describe("the four ways a room gets an icon all read the one list", () => {
  it("the dealt pool", () => {
    const crests = read("src/utils/roomCrests.ts");
    expect(crests).toMatch(/import \{ fetchCategoryIconSlugs, isCategoryIcon \} from "@\/utils\/categoryIcons"/);
    expect(crests).toMatch(/!isCategoryIcon\(r, categoryIcons\)/);
    // Not a second copy of the categories query.
    expect(crests).not.toMatch(/from\("categories"\)/);
  });

  it("the name generator's pick, on both paths that write it", () => {
    const ctx = read("src/contexts/MultiplayerContextV2.tsx");
    expect(ctx).toMatch(/const roomIcon = await roomIconOrNull\(data\.icon_url\);/);
    expect(ctx).toMatch(/\.update\(\{ room_name: data\.name, room_icon: roomIcon \}\)/);
    expect(ctx).not.toMatch(/room_icon: data\.icon_url \|\| null/);
    const hook = read("src/hooks/useGameRoom.ts");
    expect(hook).toMatch(/roomIcon = await roomIconOrNull\(nameData\.icon_url\);/);
  });

  it("the host's own pick: the sheet never offers one", () => {
    const sheet = read("src/components/team/RoomIconPickerModal.tsx");
    expect(sheet).toMatch(/icons\.filter\(\(icon\) => !isCategoryIcon\(icon, categoryIconSlugs\)\)/);
    // Every grid goes through it: search, the category tabs, the
    // suggestions and the recents.
    expect(sheet).toMatch(/if \(searchQuery\.trim\(\)\) return visible\(searchResults\);/);
    expect(sheet).toMatch(/if \(selectedCategory !== "all"\) return visible\(categoryIcons\);/);
    expect(sheet).toMatch(/return visible\(suggestedIcons\);/);
    expect(sheet).toMatch(/const visibleRecentIcons = visible\(recentIcons\);/);
    expect(sheet).toMatch(/visibleRecentIcons\.slice\(0, 4\)\.map/);
    expect(sheet).not.toMatch(/\{recentIcons\.slice\(0, 4\)\.map/);
  });

  it("the server's namer strikes them too, on every query and the random fallback", () => {
    const fn = read("supabase/functions/generate-room-name/index.ts");
    expect(fn).toMatch(/const RESERVED_CATEGORY_ICON_SLUGS = \['mystery-box'\];/);
    expect(fn).toMatch(/async function fetchCategoryIconSlugs\(supabase: SupabaseClient\)/);
    expect(fn).toMatch(/function pickWearable\(/);
    // Every pick goes through pickWearable; no bare random index remains.
    expect(fn).not.toMatch(/matches\[Math\.floor\(Math\.random\(\) \* matches\.length\)\]/);
    expect(fn).toMatch(/searchIconByKeyword\(supabase, iconKeyword, categoryIcons\)/);
    expect(fn).toMatch(/getRandomIcon\(supabase, categoryIcons\)/);
    // A requested slug a category wears comes back with the name alone.
    expect(fn).toMatch(/if \(iconSlug && !categoryIcons\.has\(iconSlug\)\)/);
  });
});

describe("and the database holds the same rule for whatever writes next", () => {
  const sql = read("supabase/migrations/20261104150000_room_icons_are_not_category_icons.sql");

  it("undresses a room on insert and on update of its icon", () => {
    expect(sql).toMatch(/CREATE TRIGGER room_icon_is_not_a_category_icon\s+BEFORE INSERT OR UPDATE OF room_icon ON public\.game_rooms/);
    expect(sql).toMatch(/NEW\.room_icon := NULL;/);
  });

  it("reads the slug the way the client does", () => {
    expect(sql).toMatch(/\/icon-library\/\(\[\^\/\?#\]\+\?\)\\\.\[A-Za-z0-9\]\+\(\?:\[\?#\]\|\$\)/);
    expect(sql).toMatch(/= 'mystery-box'/);
  });

  it("keeps its helpers off the client and undresses the rooms already wearing one", () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.is_category_icon\(text\) FROM PUBLIC, anon;/);
    expect(sql).toMatch(/UPDATE public\.game_rooms\s+SET room_icon = NULL\s+WHERE room_icon IS NOT NULL\s+AND public\.is_category_icon\(room_icon\);/);
  });

  it("is executed in CI", () => {
    const ci = read(".github/workflows/pr-checks.yml");
    expect(ci).toMatch(/supabase\/tests\/20-room-icons\.sql/);
  });
});
