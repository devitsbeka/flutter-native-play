import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Tapping the wallpaper opens the avatar and mascot picker.
 *
 * The phone home had a catcher for this, but it sat in the column the
 * scroll-reveal home hides: it asked for `user && isMobileViewport`, which
 * is exactly the condition that hides that column. So it rendered for
 * nobody, and the scene — the one thing on the screen a player would think
 * to tap to change it — did nothing.
 *
 * It lives in the hero now, between the scene and the things drawn on it.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const scroll = read("src/components/home/MobileHomeScroll.tsx");
const index = read("src/pages/Index.tsx");

describe("the scene catcher", () => {
  it("is in the hero, and opens the picker", () => {
    expect(scroll).toMatch(/onSceneClick: \(\) => void;/);
    expect(scroll).toMatch(/onClick=\{onSceneClick\}/);
    expect(index).toMatch(/onSceneClick=\{\(\) => openAvatarModal\(\)\}/);
  });

  it("sits above the scene and below everything drawn on it", () => {
    // The scene is z-[4]; the reel, the reward tabs and the profile card are
    // z-20 and come later, so they keep their own taps.
    expect(scroll).toMatch(/className="absolute inset-0 z-\[5\] cursor-pointer"/);
    const hero = scroll.slice(scroll.indexOf("{scene}"));
    expect(hero.indexOf("onClick={onSceneClick}")).toBeLessThan(hero.indexOf("<FriendsStoriesBar"));
    expect(hero.indexOf("onClick={onSceneClick}")).toBeLessThan(hero.indexOf("<MobileHeroWidgets"));
    expect(hero.indexOf("onClick={onSceneClick}")).toBeLessThan(hero.indexOf("<MobileProfileCard"));
  });

  it("is announced, since it is a button with no words in it", () => {
    expect(scroll).toMatch(/aria-label=\{t\("extra\.changeScene"\)\}/);
  });

  it("is the only one — the unreachable copy is gone", () => {
    expect(index).not.toMatch(/className="md:hidden absolute inset-0 cursor-pointer"/);
  });
});
