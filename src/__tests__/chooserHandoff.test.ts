/**
 * Picking a category goes straight to the lobby, with no stop at the chooser.
 *
 * The play chooser is a screen you make one decision on and leave. Tapping
 * Classic opened the category picker over it; picking a category closed that
 * picker and handed the player back the chooser — for the whole length of the
 * room create, about half a second, with a spinner on the card they had
 * already tapped — before the lobby arrived. The app appeared to go backwards
 * before it went forwards.
 *
 * A card's tap now starts a handoff, and while one is running this screen
 * paints the lobby's own spinner instead of itself. So the sequence is
 * picker → one wait → lobby, rather than picker → chooser → lobby.
 *
 * State, not a ref: `autoStart` is cleared by the effect that presses Create,
 * one frame BEFORE `isCreating` turns on, and that frame is exactly where the
 * chooser was painting.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const page = read("src/components/team/CreateRoomPage.tsx");
const team = read("src/pages/TeamV2.tsx");

describe("the chooser stands down while a card is starting", () => {
  it("a card's tap arms the handoff along with the auto-start", () => {
    expect(page).toMatch(/autoStart\.current = true;\s*\n\s*setHandingOff\(true\);/);
  });

  it("and the body is not rendered while it runs", () => {
    expect(page).toMatch(/\{handingOff \? \(/);
    // The lobby's spinner, so the two reads as one wait rather than two screens.
    expect(page).toMatch(
      /<div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" \/>/,
    );
    expect(team).toMatch(
      /<div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" \/>/,
    );
  });

  it("it is state rather than a ref, or the flash survives", () => {
    // `autoStart` is a ref AND is cleared before isCreating turns on, so
    // neither of them can drive the render.
    expect(page).toMatch(/const \[handingOff, setHandingOff\] = useState\(false\);/);
    expect(page).not.toMatch(/\{autoStart\.current \? \(/);
    expect(page).not.toMatch(/\{isCreating \? \(\s*\n\s*<div className="relative flex h-full w-full items-center/);
  });
});

describe("every way the handoff can end without leaving gives the screen back", () => {
  it("a create that failed", () => {
    expect(page).toMatch(/description: t\("extra\.mpRoomCreateFailed"\),[\s\S]{0,200}?setHandingOff\(false\);/);
  });

  it("a picker dismissed without a pick — but not one that WAS picked from", () => {
    // The pickers call onSelect and then onOpenChange(false), so the close
    // handler cannot tell the two apart on its own, and reading
    // selectedCategory there is no help: the pick has not committed yet.
    // Without the flag the pick would cancel the handoff it just started.
    expect(page).toMatch(/const pickedFromPicker = useRef\(false\);/);
    expect(page).toMatch(/const handleLibraryCategorySelect = [^\n]*\n\s*pickedFromPicker\.current = true;/);
    expect(page).toMatch(/const handleMyTriviaSelect = [^\n]*\n\s*pickedFromPicker\.current = true;/);
    // Both pickers consume it and stand down only on a real dismissal.
    expect((page.match(/if \(pickedFromPicker\.current\) \{/g) ?? [])).toHaveLength(2);
    expect((page.match(/pickedFromPicker\.current = false;/g) ?? [])).toHaveLength(2);
    expect((page.match(/autoStart\.current = false;\s*\n\s*setHandingOff\(false\);/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("and going off to MAKE a trivia rather than pick one", () => {
    expect(page).toMatch(/setHandingOff\(false\);\s*\n\s*setShowMyTriviasModal\(false\);\s*\n\s*setShowCreateTriviaModal\(true\);/);
  });

  it("bounded, so a stall cannot strand the player on a spinner", () => {
    // The back arrow is inside the body this hides, so a handoff that never
    // lands would leave no way off the screen at all.
    expect(page).toMatch(/const HANDOFF_MAX_MS = 10000;/);
    expect(page).toMatch(/\}, HANDOFF_MAX_MS\);/);
    expect(page).toMatch(/return \(\) => clearTimeout\(t\);/);
  });
});

describe("the modes that ask a question back are not handed off", () => {
  it("Guess and Words return before the handoff is armed", () => {
    // Guess unfolds its picture games on this screen and Words opens the
    // pre-room lobby: both need the screen they would otherwise hide.
    const startMode = page.slice(page.indexOf("const startMode = (key: GameChoice)"));
    const body = startMode.slice(0, startMode.indexOf("autoStart.current = true;"));
    expect(body).toMatch(/if \(key === "words"\)/);
    expect(body).toMatch(/if \(key === "guess"\)/);
    expect(body.match(/return;/g) ?? []).toHaveLength(3);
  });
});
