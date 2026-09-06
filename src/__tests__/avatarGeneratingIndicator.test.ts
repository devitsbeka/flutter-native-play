/**
 * Where the app says "your new avatar is being made".
 *
 * It was a chip floating over the bottom-right of every screen. That chip
 * could say a job was running but never what it was running FOR — it sat next
 * to the bottom nav, nowhere near anything of the player's, and the owner
 * read it as a stray loader rather than as news about their own avatar.
 *
 * It is drawn on the player's own circle in the friends reel now: the spinner
 * rings the avatar being replaced, and the photo the generation started from
 * sits inside it. The chip is kept as the fallback for screens that show no
 * avatar of yours — a surface that draws the indicator registers itself, and
 * while any is mounted the shell keeps the chip down. Two indicators for one
 * job is one too many; none at all would lose the way back into the studio.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ctx = read("src/contexts/AvatarModalContext.tsx");
const reel = read("src/components/team/FriendsStoriesBar.tsx");

describe("the progress rings your own avatar", () => {
  it("the reel's self circle reads the running generation", () => {
    expect(reel).toMatch(
      /import \{ useAvatarGenerationIndicator \} from "@\/contexts\/AvatarModalContext";/,
    );
    expect(reel).toMatch(/const \{ active, thumb, open \} = useAvatarGenerationIndicator\(\);/);
    expect(reel).toMatch(/generating=\{active\}/);
  });

  it("with a spinner around the circle, not over it", () => {
    // Painting the spinner on top would take away the online ring — the
    // strip's one reading of who is here — for the length of the job.
    expect(reel).toMatch(/absolute -inset-\[3px\] rounded-full border-\[3px\] border-purple-500 border-t-transparent animate-spin/);
  });

  it("showing the photo it was started from, still rather than animated", () => {
    expect(reel).toMatch(/avatarUrl=\{active && thumb \? thumb : avatarUrl\}/);
    expect(reel).toMatch(/animatedAvatarUrl=\{active \? null : animatedAvatarUrl\}/);
    expect(reel).toMatch(/generating \? "opacity-60" : ""/);
  });

  it("and one badge on the circle, never the dot and the hourglass together", () => {
    expect(reel).toMatch(/\{generating \? \(/);
    expect(reel).toMatch(/\) : \(\s*\n\s*<div\s*\n\s*className=\{`absolute bottom-0 right-0 w-4 h-4/);
  });

  it("tapping it mid-generation reopens the studio, not the profile", () => {
    // The profile modal has nothing to say about a job that is running.
    expect(reel).toMatch(/const press = active \? open : onOpen;/);
    expect(reel).toMatch(/onClick=\{press\}/);
    expect(reel.match(/onClick=\{press\}/g) ?? []).toHaveLength(2);
  });

  it("and it is named for a screen reader while it spins", () => {
    expect(reel).toMatch(/label=\{active \? t\("avatar\.generating"\) : undefined\}/);
    expect(reel).toMatch(/aria-label=\{label\}/);
  });
});

describe("the floating chip is the fallback now", () => {
  it("it stays down while any self indicator is mounted", () => {
    expect(ctx).toMatch(/\{generating\.active && !isOpen && selfIndicators === 0 && \(/);
  });

  it("mounting the hook is what claims the job", () => {
    expect(ctx).toMatch(/registerSelfIndicator: \(\) => \(\) => void;/);
    expect(ctx).toMatch(/useEffect\(\(\) => register\?\.\(\), \[register\]\);/);
    // Registering must release on unmount, or leaving the home screen would
    // suppress the chip everywhere for the rest of the session.
    expect(ctx).toMatch(/return \(\) => setSelfIndicators\(\(n\) => Math\.max\(0, n - 1\)\);/);
  });

  it("but it still exists, for screens with no avatar of yours on them", () => {
    // Deleting it outright would leave a generation started from a page
    // without the reel with nothing on screen and no way back to the studio.
    expect(ctx).toMatch(/aria-label=\{t\("avatar\.generating"\)\}/);
    expect(ctx).toMatch(/bottom: "calc\(var\(--bottom-nav-height\) \+ 1rem\)"/);
  });

  it("and outside the provider the hook is inert rather than throwing", () => {
    // It renders inside modals and reels that mount during first paint.
    expect(ctx).toMatch(/const context = useContext\(AvatarModalContext\);\s*\n\s*const register = context\?\.registerSelfIndicator;/);
    expect(ctx).toMatch(/active: context\?\.generating\.active \?\? false,/);
  });
});

describe("the name it announces exists everywhere", () => {
  it("in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+generating: "/);
    }
  });
});
