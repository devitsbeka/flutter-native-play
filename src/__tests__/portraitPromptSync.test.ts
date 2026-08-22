import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { PORTRAIT_AVATAR_PROMPT } from "@/config/portraitAvatarPrompt";

/**
 * The generate-avatar edge function only honors a prompt override from a
 * regular user when it is byte-identical to a prompt it already knows —
 * anything else is an arbitrary instruction and is ignored (UGC guardrail).
 * The app's own portrait request therefore only works while the function's
 * PORTRAIT_PROMPT equals the frontend's PORTRAIT_AVATAR_PROMPT exactly.
 *
 * When they drifted apart, every non-admin "new avatar" fell through to the
 * scene settings prompt and the circle avatar came back as a full square
 * scene — beanbag, carpet, trophies, a face a few pixels tall.
 */
describe("portrait prompt is identical in frontend and edge function", () => {
  it("PORTRAIT_PROMPT in generate-avatar matches PORTRAIT_AVATAR_PROMPT", () => {
    const fn = readFileSync(
      join(__dirname, "../../supabase/functions/generate-avatar/index.ts"),
      "utf8",
    );
    const match = fn.match(/const PORTRAIT_PROMPT = `([\s\S]*?)`;/);
    expect(match, "generate-avatar must define PORTRAIT_PROMPT").toBeTruthy();
    expect(match![1]).toBe(PORTRAIT_AVATAR_PROMPT);
  });
});
