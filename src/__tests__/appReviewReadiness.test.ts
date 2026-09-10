/**
 * What the App Store readiness audit found, kept found.
 *
 * Three sweeps before the first submission (owner: "be strict and find for
 * me anything what would be a blocker to pass that Apple review"). The
 * code-side findings, each pinned here so the next change cannot quietly
 * put one back:
 *
 *   - invented players on an unplayed trivia's leaderboard, and invented
 *     vote percentages under "Did you know" (guideline 2.3.1);
 *   - storage writes in the root providers with no try/catch — a full or
 *     blocked store took the whole tree to the error screen on launch;
 *   - a deployment target of iOS 15.0 under APIs WebKit grew in 15.4
 *     (structuredClone, crypto.randomUUID, dvh): round starts that did
 *     nothing, guests with no session, pages with no height;
 *   - gem-pack buttons live before StoreKit had priced them (2.1 / 3.1.1);
 *   - a bundle guard that read the HTML for the Meta pixel and never the
 *     chunks for the Stripe checkout;
 *   - a country lookup against ip-api.com over HTTPS, which its free tier
 *     refuses with 403.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cloneJson, newId } from "@/utils/compat";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}
const appSources = walk("src").filter((p) => !p.startsWith("src/__tests__/") && p !== "src/utils/compat.ts");

describe("nothing invented", () => {
  it("the trivia leaderboard is the real one, empty when nobody has played", () => {
    const lobby = read("src/hooks/useTriviaLobby.ts");
    expect(lobby).toMatch(/const leaderboard = realLeaderboard;/);
    expect(lobby).not.toMatch(/FAKE_NAMES|generateFakeTriviaLeaderboard|fake-trivia-/);
  });

  it("a vote is acknowledged, never dressed up as statistics", () => {
    const hook = read("src/hooks/useDidYouKnow.ts");
    expect(hook).not.toMatch(/generateFakeVotes|knewPercentage|totalVotes/);
    expect(hook).toMatch(/setVoteResult\(\{ userVote: voteType \}\);/);
    const widget = read("src/components/home/widgets/DidYouKnowWidget.tsx");
    expect(widget).not.toMatch(/knewPercentage|totalVotes|voteUnit/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/\n\s+voteThanksKnew: "[^"]+",/);
      expect(src, lang).toMatch(/\n\s+voteThanksDidntKnow: "[^"]+",/);
    }
  });
});

describe("nothing at the root can take the tree down", () => {
  it("storage writes in the root providers are wrapped", () => {
    expect(read("src/providers/theme-provider.tsx")).toMatch(/try \{ localStorage\.setItem\(storageKey, theme\); \} catch/);
    expect(read("src/providers/theme-provider.tsx")).toMatch(/try \{\s*\n\s*const savedTheme = localStorage\.getItem\(storageKey\)/);
    expect(read("src/contexts/SoundContext.tsx")).toMatch(/try \{\s*\n\s*localStorage\.setItem\(SOUND_STORAGE_KEY, JSON\.stringify\(settings\)\);\s*\n\s*\} catch/);
    expect(read("src/contexts/AuthContext.tsx")).toMatch(/try \{\s*\n\s*localStorage\.setItem\('mytrivia_last_user'/);
  });
});

describe("the floor is iOS 15.4, and the 15.4 APIs go through compat anyway", () => {
  it("Podfile, Xcode project and Capacitor agree", () => {
    expect(read("ios/App/Podfile")).toMatch(/platform :ios, '15\.4'/);
    const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(pbx.match(/IPHONEOS_DEPLOYMENT_TARGET = 15\.4;/g) ?? []).toHaveLength(6);
    expect(pbx).not.toMatch(/IPHONEOS_DEPLOYMENT_TARGET = 15\.0;/);
    expect(read("capacitor.config.ts")).toMatch(/minVersion: '15\.4'/);
  });

  it("no bare structuredClone or crypto.randomUUID in app code", () => {
    for (const p of appSources) {
      const src = read(p);
      expect(src, p).not.toMatch(/\bstructuredClone\(/);
      expect(src, p).not.toMatch(/(?<!globalThis\.)\bcrypto\.randomUUID\(\)/);
    }
  });

  it("compat does what the platform would", () => {
    const value = { a: [1, { b: "c" }], d: null };
    const copy = cloneJson(value);
    expect(copy).toEqual(value);
    expect(copy).not.toBe(value);
    expect(copy.a[1]).not.toBe(value.a[1]);
    expect(newId()).toMatch(/^[0-9a-f-]{36}$|^id-/);
    expect(newId("guest")).not.toBe(newId("guest"));
  });
});

describe("the store", () => {
  it("gem-pack buttons wait for StoreKit's price", () => {
    expect(read("src/components/home/NotEnoughGemsModal.tsx")).toMatch(
      /disabled=\{isProcessing \|\| !storePrice\(pkg\.productId, pkg\.priceUsd\)\.sellable\}/,
    );
  });

  it("the iOS bundle guard reads the chunks for a web checkout", () => {
    const guard = read("scripts/verify-ios-bundle.mjs");
    expect(guard).toMatch(/create-pro-checkout\|create-gem-checkout/);
    expect(guard).toMatch(/readdirSync\(assetsDir\)/);
  });
});

describe("the country lookup", () => {
  it("is our own edge over TLS, not ip-api", () => {
    const hook = read("src/hooks/useGeoLocation.ts");
    expect(hook).toMatch(/const GEO_ENDPOINT = "https:\/\/mytrivia\.io\/geo";/);
    expect(hook).not.toMatch(/ip-api\.com\/json/);
    const worker = read("worker/index.ts");
    expect(worker).toMatch(/if \(url\.pathname === "\/geo"\) \{/);
    expect(worker).toMatch(/JSON\.stringify\(\{ countryCode: country \}\)/);
    expect(worker).toMatch(/"access-control-allow-origin": "\*"/);
  });
});
