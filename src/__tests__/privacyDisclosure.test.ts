import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { translations } from "@/locales";
import { LEGAL_LANGUAGES } from "@/utils/legalLanguage";

/**
 * The privacy policy has to say what actually happens to a photograph.
 *
 * The app photographs the user's face and uploads it to a third-party AI
 * provider (fal.ai, via `supabase/functions/generate-avatar`) to generate an
 * avatar. For a long time the policy's "Data We Collect" listed account,
 * profile, game and technical data — and no photograph, and no AI processor
 * anywhere in the document.
 *
 * That is not a theoretical gap. `PrivacyInfo.xcprivacy` declares
 * `NSPrivacyCollectedDataTypePhotosorVideos`, so the App Store listing's
 * privacy label says **Photos**; a reviewer taps through to the policy the
 * listing links and finds no mention of them. The two documents Apple puts
 * side by side disagreeing is guideline 5.1.1(i), and it is the kind of thing
 * review actually opens.
 *
 * These assertions are deliberately about *presence of subject matter*, not
 * wording — the copy should stay free to improve, but it must not go back to
 * being silent about the face it uploads.
 */

const REPO = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");

/** Every locale carries the same key set; these are the ones that matter here. */
const DISCLOSURE_KEYS = [
  "photosData",
  "photosDataDesc",
  "userContentData",
  "userContentDataDesc",
  "locationData",
  "locationDataDesc",
  "thirdPartyFalAi",
] as const;

describe("the privacy policy discloses what leaves the device", () => {
  it("names photographs and the AI processor in the English page", () => {
    const source = read("src/pages/PrivacyPolicyEN.tsx");

    expect(
      source,
      "the hardcoded English policy no longer lists photographs as collected data"
    ).toMatch(/Photographs:/);

    expect(
      source,
      "the third-party list no longer names the AI image provider the photo is sent to"
    ).toMatch(/fal\.ai/);
  });

  it("renders those rows on the localized page too", () => {
    const source = read("src/pages/PrivacyPolicy.tsx");
    for (const key of ["photosData", "userContentData", "locationData", "thirdPartyFalAi"]) {
      expect(
        source,
        `the localized policy stopped rendering legal.${key}`
      ).toContain(`legal.${key}`);
    }
  });

  it("has the copy in every locale, not just English", () => {
    for (const [code, bundle] of Object.entries(translations)) {
      const legal = (bundle as unknown as Record<string, Record<string, unknown>>).legal;
      expect(legal, `${code} has no legal section`).toBeTruthy();

      for (const key of DISCLOSURE_KEYS) {
        const value = legal[key];
        expect(
          typeof value === "string" && value.trim().length > 0,
          `${code} is missing legal.${key} — a player reading the policy in ` +
            "that language would not be told their photo is uploaded"
        ).toBe(true);
      }
    }
  });

  it("answers 'who receives your data' only once", () => {
    // `withProviders` used to name Supabase and Cloudflare while the
    // third-party section of the same document named seven services. One
    // policy, two different answers to the same question.
    const en = (translations.en as unknown as Record<string, Record<string, string>>).legal;
    expect(
      en.withProviders,
      "withProviders is back to naming its own short list of providers, which " +
        "will contradict the third-party section again"
    ).not.toMatch(/Supabase|Cloudflare/);
  });
});

describe("the privacy manifest matches what the app collects", () => {
  const manifest = read("ios/App/App/PrivacyInfo.xcprivacy");

  // The App Privacy answers in App Store Connect are filled in from this file,
  // so anything the app collects and this omits becomes a wrong label.
  it.each([
    ["NSPrivacyCollectedDataTypePhotosorVideos", "the avatar selfie"],
    ["NSPrivacyCollectedDataTypeGameplayContent", "player-authored quizzes and rooms"],
    ["NSPrivacyCollectedDataTypeCoarseLocation", "country_code, derived from the IP address"],
    ["NSPrivacyCollectedDataTypeDeviceID", "the advertising identifier"],
    ["NSPrivacyCollectedDataTypeAdvertisingData", "ad impressions and interactions, via AdMob"],
  ])("declares %s (%s)", (type) => {
    expect(manifest, `${type} is missing from PrivacyInfo.xcprivacy`).toContain(type);
  });

  it("still declares tracking, because AdMob personalises ads", () => {
    expect(manifest).toMatch(/<key>NSPrivacyTracking<\/key>\s*<true\/>/);
  });
});

/**
 * App Store Connect takes a privacy policy URL per App Store localization, so
 * every language the app ships has to have a URL that renders in it for a
 * visitor who has never opened the app.
 */
describe("the per-language legal URLs the listing links", () => {
  const app = read("src/App.tsx");

  it("routes /privacy-policy/:lang and /terms/:lang", () => {
    expect(app).toMatch(/path="\/privacy-policy\/:lang"/);
    expect(app).toMatch(/path="\/terms\/:lang"/);
  });

  it("covers every language the app ships", () => {
    // If a locale is added, it needs a listing URL too — this is the reminder.
    expect(LEGAL_LANGUAGES.slice().sort()).toEqual(
      Object.keys(translations).sort()
    );
  });

  it("pins the page rather than following stored preference", () => {
    for (const page of ["src/pages/PrivacyPolicy.tsx", "src/pages/TermsOfService.tsx"]) {
      const source = read(page);
      expect(
        source,
        `${page} no longer accepts a pinned language, so its per-locale URL ` +
          "would render in whatever language the visitor happens to have stored"
      ).toMatch(/translatorFor/);
    }
  });
});

/**
 * The manifest and the App Store Connect answers are two renderings of one
 * fact set, and a reviewer can see both. These pin the handful that are easy
 * to get wrong — and that were wrong when the listing was first filled in.
 */
describe("the manifest's linkage and tracking flags", () => {
  const manifest = read("ios/App/App/PrivacyInfo.xcprivacy");

  const entry = (type: string) => {
    const start = manifest.indexOf(`<string>NSPrivacyCollectedDataType${type}</string>`);
    expect(start, `${type} is not declared`).toBeGreaterThan(-1);
    return manifest.slice(start, manifest.indexOf("</dict>", start));
  };

  it("keeps the advertising identifier unlinked but tracking", () => {
    // The IDFA goes to AdMob and is never joined to the account, so it is not
    // "linked to the user's identity" — but it is unambiguously tracking, and
    // that single flag is what puts "Data Used to Track You" on the listing.
    const deviceId = entry("DeviceID");
    expect(deviceId).toMatch(/NSPrivacyCollectedDataTypeLinked<\/key>\s*<false\/>/);
    expect(deviceId).toMatch(/NSPrivacyCollectedDataTypeTracking<\/key>\s*<true\/>/);
  });

  it("keeps crash reports linked, because PostHog identifies the person", () => {
    // Exceptions are captured against an identified user (PostHogProvider
    // calls identify with the account id), so they are linked.
    expect(entry("CrashData")).toMatch(/NSPrivacyCollectedDataTypeLinked<\/key>\s*<true\/>/);
  });

  it("declares Analytics on the identity fields PostHog receives", () => {
    // identify() is called with the user id, $email and $name.
    for (const type of ["UserID", "EmailAddress", "Name"]) {
      expect(
        entry(type),
        `${type} reaches PostHog, so Analytics belongs in its purposes`
      ).toContain("NSPrivacyCollectedDataTypePurposeAnalytics");
    }
  });
});
