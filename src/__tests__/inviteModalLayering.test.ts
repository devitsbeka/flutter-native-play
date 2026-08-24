import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Two things about the friend row in the invite sheet.
 *
 * 1. The profile it opens has to be visible. InviteFriendsModal portals its
 *    whole tree to document.body, and PlayerProfileModal is a *sibling* in
 *    that same portal — the sheet's root is `fixed inset-0 z-[9999]`, the
 *    profile's is `fixed inset-0 z-[100]`. Both sit in the root stacking
 *    context, so 9999 beats 100 and the profile opened underneath the sheet
 *    that opened it. Tapping did work; it just drew behind. Wrapping the
 *    profile in a positioned element above the sheet puts it back on top, and
 *    its own z-indexes then apply inside that context.
 *
 * 2. The row's button has to do what it says. In browse mode — the sheet
 *    opened with no room and no picker callback — the row read "view profile"
 *    and opened the profile, which is what the tiles below it are already
 *    for. It now says "მოიწვიე" and starts a room with that friend, the same
 *    route the profile's own Challenge button takes.
 */
const source = readFileSync(
  join(process.cwd(), "src/components/team/InviteFriendsModal.tsx"),
  "utf8"
);

describe("the profile opened from the invite sheet", () => {
  it("is raised above the sheet that opened it", () => {
    const wrapped = source.match(
      /<div className="relative z-\[(\d+)\]">\s*<PlayerProfileModal/
    );
    expect(
      wrapped,
      "PlayerProfileModal is a portal sibling of this sheet — unwrapped, it draws underneath"
    ).not.toBeNull();

    // Above whatever this sheet's own root is, whatever that becomes.
    const sheetZ = source.match(/className="fixed inset-0 safe-screen z-\[(\d+)\]/);
    expect(sheetZ, "expected the sheet's root z-index").not.toBeNull();
    expect(Number(wrapped![1])).toBeGreaterThan(Number(sheetZ![1]));
  });
});

describe("the friend row in browse mode", () => {
  /** The row's onClick, up to the closing of its browse-mode branch. */
  const branch = source.match(/\} else \{\n(?:.*\n)*?\s*navigate\(`\/team\?challenge=/);

  it("invites into a new room rather than opening a profile", () => {
    expect(branch, "expected the browse-mode branch to start a room").not.toBeNull();
    expect(source).toMatch(/navigate\(`\/team\?challenge=\$\{result\.user_id\}&type=create-room`\)/);
  });

  it("closes the sheet on the way", () => {
    // Navigating out from under a fixed, full-screen sheet leaves it covering
    // the room it just opened.
    expect(branch![0]).toMatch(/onClose\(\);/);
  });

  it("is labelled as an invite, not as a profile", () => {
    expect(source).toMatch(/isFriend && isBrowseMode \? \([\s\S]{0,200}inviteToPlayBtn/);
    expect(
      source,
      "the old label promised a profile the row no longer opens"
    ).not.toMatch(/isFriend && isBrowseMode \? \([\s\S]{0,200}extra\.viewProfile/);
  });
});

describe("the label itself", () => {
  it.each(["ka", "en"])("exists in %s", (locale) => {
    const file = readFileSync(join(process.cwd(), `src/locales/${locale}.ts`), "utf8");
    expect(file, `extra.inviteToPlayBtn is missing from ${locale}`)
      .toMatch(/inviteToPlayBtn: "[^"]+"/);
  });
});
