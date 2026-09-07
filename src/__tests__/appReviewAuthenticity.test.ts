import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * The App Review authenticity findings, as assertions.
 *
 * Three of them (guidelines 5.2 and 2.3.1) were about the app presenting
 * fabricated things as real: studio photographs of real people worn by
 * accounts that befriended players, thirty invented "verified" profiles with
 * hot-linked stock covers, and 734 Creative Commons images used without the
 * attribution their licence requires. Each fix is one deletion or one new
 * screen, and each is easy to undo by accident — a re-added import, a
 * restored file, a regenerated fixture. These are the tripwires.
 */

const REPO = resolve(__dirname, "../..");
const SRC = join(REPO, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const SOURCES = walk(SRC);
const read = (p: string) => readFileSync(p, "utf8");

describe("no photographs of real people are shipped as accounts", () => {
  it("the eight stock headshots are gone from the bundle", () => {
    // public/avatars/ held elene_e, grigoli_a, kosta, lash10, levan_88,
    // natato, nona_12 and sofia — eight studio headshots of real people on
    // flat backgrounds, EXIF stripped, in one stock-model-pack house style.
    // Every file in public/ ships inside the app.
    const dir = join(REPO, "public/avatars");
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith(".")) : [];
    expect(files, "public/avatars/ must not carry photographs of people").toEqual([]);
  });

  it("does not accept friend requests on a fabricated account's behalf", () => {
    // FakeFriendRequestAutoAccept was mounted app-wide and, 4-48 hours after
    // a player friend-requested one of the seeded accounts, wrote
    // status: "accepted" from that player's own client so the account would
    // "behave like a real person".
    expect(existsSync(join(SRC, "components/system/FakeFriendRequestAutoAccept.tsx"))).toBe(false);

    // Mentions in a comment are fine — a note saying why it is gone is the
    // point. What must not exist is an import or a mount.
    const offenders = SOURCES.filter((f) => {
      if (f.includes("__tests__")) return false;
      const body = read(f);
      return (
        body.includes("<FakeFriendRequestAutoAccept") ||
        /import\s*\{[^}]*FakeFriendRequestAutoAccept/.test(body)
      );
    });
    expect(offenders.map((f) => relative(REPO, f))).toEqual([]);
  });

  it("keeps the seeded content accounts out of the people a player can find", () => {
    const excluded = read(join(SRC, "lib/excludedUsers.ts"));
    expect(excluded).toContain("isHiddenFromSearch");

    // The union, not either list alone: MASCOT_USER_IDS carries the test
    // accounts, FAKE_ACCOUNT_USER_IDS carries three the product owner
    // identified by hand, and neither contains the other.
    expect(excluded).toContain("NON_PLAYER_USER_IDS");

    const friends = read(join(SRC, "contexts/FriendsContext.tsx"));
    expect(
      friends.includes("isHiddenFromSearch"),
      "searchUsers must filter seeded accounts out of its results",
    ).toBe(true);
  });
});

describe("no fabricated profiles reach the feed", () => {
  it("keeps the invented-profile fixture out of the app", () => {
    const fixture = join(SRC, "dev/sampleFeedFixture.ts");
    if (!existsSync(fixture)) return; // deleted outright is also a fix

    const importers = SOURCES.filter(
      (f) =>
        !f.startsWith(join(SRC, "dev")) &&
        !f.includes("__tests__") &&
        // an import, not a comment pointing at where the fixture went
        /from\s+["'][^"']*sampleFeedFixture["']/.test(read(f)),
    );
    expect(
      importers.map((f) => relative(REPO, f)),
      "the fixture is fabricated content: nothing in the app may import it",
    ).toEqual([]);
  });

  it("does not hot-link stock photography", () => {
    // Pexels' licence forbids hot-linking. Thirty of its photographs were
    // referenced straight from the CDN as fabricated post covers.
    const offenders = SOURCES.filter((f) => {
      if (f.includes("__tests__")) return false;
      return read(f).includes("images.pexels" + ".com");
    });
    expect(offenders.map((f) => relative(REPO, f))).toEqual([]);
  });

  it("does not fetch third-party cartoon avatars on the social surfaces", () => {
    // A DiceBear URL is a third-party request, per render, for a face that is
    // not ours; `fallbackAvatarFor` deals one of MyTrivia's own instead.
    // Scoped to the feed and profile code — the TV mock, the styleguide and
    // QuizGameScreen's placeholder players still carry them and are reported
    // separately.
    const scope = ["data", "hooks", "components/social", "components/profile"].map((d) =>
      join(SRC, d),
    );
    const offenders = SOURCES.filter(
      (f) =>
        scope.some((dir) => f.startsWith(dir)) &&
        !f.includes("__tests__") &&
        read(f).includes("api.dicebear" + ".com"),
    );
    expect(offenders.map((f) => relative(REPO, f))).toEqual([]);
  });

  it("flags nobody as verified who is not a real, verified account", () => {
    const fixture = join(SRC, "dev/sampleFeedFixture.ts");
    if (!existsSync(fixture)) return;
    expect(read(fixture)).not.toContain("verified: true");
  });
});

describe("Creative Commons images are attributed", () => {
  it("carries a generated attribution list", () => {
    const path = join(SRC, "data/attributions.ts");
    expect(
      existsSync(path),
      "run `node scripts/build-attributions.mjs` to regenerate the credits data",
    ).toBe(true);
    expect(existsSync(join(REPO, "scripts/build-attributions.mjs"))).toBe(true);
  });

  it("names an author and a source for every work whose licence requires one", async () => {
    const { ATTRIBUTIONS, ATTRIBUTION_COUNTS } = await import("@/data/attributions");

    const required = ATTRIBUTIONS.filter((a) => /^CC BY(-SA)? /.test(a.license));
    expect(required.length).toBe(ATTRIBUTION_COUNTS.attributionRequired);
    expect(required.length).toBeGreaterThan(700);

    for (const item of required) {
      expect(item.source, item.file).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\//);
      expect(item.title, item.file).not.toBe("");
    }

    // Commons states no author for exactly one file. Anything more than a
    // handful means the fetch failed and the page would credit nobody.
    const anonymous = required.filter((a) => !a.author);
    expect(anonymous.length, anonymous.map((a) => a.file).join(", ")).toBeLessThanOrEqual(5);
  });

  it("has a credits screen that reads the generated list", () => {
    const page = join(SRC, "pages/Credits.tsx");
    expect(existsSync(page)).toBe(true);
    const body = read(page);
    expect(body).toContain("@/data/attributions");

    const app = read(join(SRC, "App.tsx"));
    expect(app.includes("/credits"), "the credits page must be routable").toBe(true);
  });
});

describe("randomised rewards disclose their odds", () => {
  it("the luck wheel states each wedge's chance", () => {
    // The wedges are not equally weighted — the file's own comment says
    // "Cheap prizes come up more than rich ones" — so the odds cannot be
    // inferred from the picture.
    const body = read(join(SRC, "features/words/LuckWheel.tsx"));
    expect(body).toContain("WEIGHTS");
    expect(body).toMatch(/chanceOf|percent|%/);
    expect(body.toLowerCase()).toContain("chance");
  });

  it("the chest states its range", () => {
    const body = read(join(SRC, "components/home/ChestRewardModal.tsx"));
    expect(body.toLowerCase()).toContain("chance");
    expect(body).toContain("CHEST_COINS_MIN");
    expect(body).toContain("CHEST_COINS_MAX");
  });
});
