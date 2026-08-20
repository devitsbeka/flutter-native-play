import { describe, it, expect } from "vitest";
import {
  PUSH_COPY,
  PUSH_META,
  PUSH_LANGUAGES,
  fill,
  pushMessage,
  type PushKind,
} from "../../supabase/functions/_shared/pushCopy";

// The push copy ships inside edge functions, where nothing compiles against
// the locale files — this test is what keeps the seven languages complete
// and the "no emojis, icons come from the library" rule enforced.

const KINDS = Object.keys(PUSH_COPY) as PushKind[];

// Emoji and pictograph blocks. Deliberately NOT the flag range — copy has no
// flags today, and the rule being pinned is "icons come from the library".
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2728}\u{2764}]/u;

const params = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

describe("push copy", () => {
  it("covers every kind in every app language", () => {
    for (const kind of KINDS) {
      for (const lang of PUSH_LANGUAGES) {
        const msg = PUSH_COPY[kind][lang];
        expect(msg, `${kind}.${lang}`).toBeDefined();
        expect(msg.title.trim().length, `${kind}.${lang} title`).toBeGreaterThan(0);
        expect(msg.body.trim().length, `${kind}.${lang} body`).toBeGreaterThan(0);
      }
    }
  });

  it("has no emojis anywhere — the notification image is the icon", () => {
    for (const kind of KINDS) {
      for (const lang of PUSH_LANGUAGES) {
        const { title, body } = PUSH_COPY[kind][lang];
        expect(EMOJI.test(title), `${kind}.${lang} title: "${title}"`).toBe(false);
        expect(EMOJI.test(body), `${kind}.${lang} body: "${body}"`).toBe(false);
      }
    }
  });

  it("uses the same placeholders in every language of a kind", () => {
    for (const kind of KINDS) {
      const reference = params(PUSH_COPY[kind].en.title + PUSH_COPY[kind].en.body);
      for (const lang of PUSH_LANGUAGES) {
        const found = params(PUSH_COPY[kind][lang].title + PUSH_COPY[kind][lang].body);
        expect([...found].sort(), `${kind}.${lang}`).toEqual([...reference].sort());
      }
    }
  });

  it("gives every kind an icon under /push/ and an in-app route", () => {
    for (const kind of KINDS) {
      expect(PUSH_META[kind].icon, kind).toMatch(/^https:\/\/mytrivia\.io\/push\/[a-z-]+\.png$/);
      expect(PUSH_META[kind].route, kind).toMatch(/^\//);
    }
  });

  it("fills placeholders and falls back to English for unknown languages", () => {
    expect(fill({ title: "You're #{rank}", body: "{count} plays" }, { rank: 3, count: 7 })).toEqual({
      title: "You're #3",
      body: "7 plays",
    });
    expect(pushMessage("streak_saver", "zz", { days: 4 }).title).toBe("Don't lose your 4-day streak");
    expect(pushMessage("streak_saver", null, { days: 4 }).title).toBe("Don't lose your 4-day streak");
    expect(pushMessage("streak_saver", "ka", { days: 4 }).title).toContain("4");
  });
});
