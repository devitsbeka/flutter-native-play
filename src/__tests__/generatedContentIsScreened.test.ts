import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const path = (p: string) => join(process.cwd(), p);
const src = (p: string) => readFileSync(path(p), "utf8");

/**
 * App Review guideline 1.2, the four holes that were actually open.
 *
 * Each of these is a place where content a stranger supplies became content
 * other players see, with nothing in between. They are asserted against the
 * source rather than mocked because what matters is the ORDER of the calls —
 * that the check happens before the publish, not after it — and an order is
 * exactly what a mocked unit test lets you get right in the test and wrong in
 * the file.
 */
describe("user-supplied content is screened before it is published", () => {
  it("screens a photo before it becomes the public avatar", () => {
    const modal = src("src/components/home/AvatarModal.tsx");

    const screen = modal.indexOf("screenPhotoForPublicUse(urlData.publicUrl");
    const publish = modal.indexOf("updateProfile({ avatar_url: urlData.publicUrl })");
    expect(screen).toBeGreaterThan(-1);
    expect(publish).toBeGreaterThan(-1);
    // The old code published first and fired detect-face into a background
    // .catch(), so nothing that came back could take the avatar down again.
    expect(screen).toBeLessThan(publish);

    // A refused photo does not stay in the public bucket at a guessable URL.
    expect(modal).toMatch(/storage\s*\n?\s*\.from\("avatars"\)\s*\n?\s*\.remove\(\[storagePath\]\)/);
    // And the generated-portrait path is screened too — the portrait keeps
    // whatever went in.
    expect(modal).toContain("screenPhotoForPublicUse(imageUrl, fileName)");
  });

  it("makes the avatar check fail CLOSED, unlike the cover-image one", () => {
    const detectFace = src("supabase/functions/detect-face/index.ts");

    // Every non-verdict exit is a refusal.
    expect(detectFace).toMatch(
      /const refuse[\s\S]*isAppropriate: false, checkFailed: true/,
    );
    expect(detectFace).not.toMatch(/isAppropriate:\s*true[^\n]*(error|fail|skip)/i);
    // It asks a safety question at all — it used to ask only "is there a
    // face in this?", which pornography with a face in it answers YES to.
    expect(detectFace).toMatch(/nudity/i);
    expect(detectFace).toMatch(/appropriate/);

    // The contrast is deliberate and documented: covers fail open so a
    // provider hiccup does not block uploads, avatars do not.
    const cover = src("supabase/functions/validate-cover-image/index.ts");
    expect(cover).toMatch(/Default to valid/);
    expect(detectFace).toMatch(/fail(s)? closed/i);
  });

  it("gives both AI question generators a content-safety instruction", () => {
    const shared = src("supabase/functions/_shared/contentFilter.ts");
    expect(shared).toContain("export const CONTENT_SAFETY_PROMPT");
    // The rules a 1.2 rejection is about, named explicitly.
    for (const rule of [/sexual/i, /violence/i, /drug/i, /self-harm/i, /slur/i, /12/]) {
      expect(shared).toMatch(rule);
    }

    for (const fn of ["generate-custom-quiz", "generate-single-question"]) {
      const body = src(`supabase/functions/${fn}/index.ts`);
      expect(body).toContain("CONTENT_SAFETY_PROMPT");
      expect(body).toMatch(/\$\{CONTENT_SAFETY_PROMPT\}/);
    }
  });

  it("screens the generated text server-side, not only the prompt", () => {
    for (const fn of ["generate-custom-quiz", "generate-single-question"]) {
      const body = src(`supabase/functions/${fn}/index.ts`);
      // Same list as the client, imported — not a second copy.
      expect(body).toContain('from "../_shared/contentFilter.ts"');
      expect(body).toContain("firstBlockedText");
      // The topic is refused before an AI call is spent on it.
      expect(body).toContain("containsBlockedText(String(subject))");
    }
  });

  it("screens the TV room name the way every other rename is screened", () => {
    const tv = src("src/components/tv/TVLobbyScreenV2.tsx");
    const check = tv.indexOf("containsBlockedText(name)");
    const write = tv.indexOf("update({ room_name: name })");
    expect(check).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(check);
  });
});

describe("endpoints that publish content are not open", () => {
  it("requires an internal secret to seed AI content under the mascot accounts", () => {
    const seed = src("supabase/functions/seed-sample-content/index.ts");
    // Same guard translate-questions and generate-national-questions use.
    expect(seed).toMatch(/x-cron-secret/);
    expect(seed).toMatch(/status:\s*401/);
    // And the guard runs before anything is generated or inserted.
    expect(seed.indexOf("x-cron-secret")).toBeLessThan(seed.indexOf("MASCOT_ACCOUNTS) {"));
  });

  it("screens the nickname the signed-out registration endpoint writes", () => {
    const register = src("supabase/functions/register-username/index.ts");
    expect(register).toContain('from "../_shared/contentFilter.ts"');
    expect(register.indexOf("containsBlockedText(trimmed)")).toBeLessThan(
      register.indexOf("auth.admin.createUser"),
    );
  });

  it("no longer hot-links a placeholder image service", () => {
    // search-question-image tried Unsplash, then Pexels — neither key has
    // ever been configured — then fell through to picsum.photos, a developer
    // placeholder service serving photography under no licence this project
    // holds. Nothing called it, so it is gone rather than fixed.
    expect(existsSync(path("supabase/functions/search-question-image"))).toBe(false);
    expect(src("supabase/config.toml")).not.toMatch(
      /\[functions\.search-question-image\]/,
    );
  });
});
