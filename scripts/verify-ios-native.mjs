#!/usr/bin/env node
/**
 * The native prerequisites `cap sync ios` cannot check for you.
 *
 * `verify-ios-bundle.mjs` guards what goes *into* `dist/`. This guards the
 * Xcode project it is copied into — the files that are not in git, and whose
 * absence is discovered on a Mac, in Xcode, by whoever is trying to archive.
 *
 * Run from `npm run build:ios`, before `cap sync ios`, so the message arrives
 * on the machine that can act on it rather than an hour later.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_DIR = resolve(process.cwd(), "ios/App/App");
const BUNDLE_ID = "io.mytrivia.app";

const failures = [];

// ── Firebase configuration ────────────────────────────────────────────────
//
// It is gitignored on purpose (it is per-project, and a stale one silently
// points push at a Firebase project that no longer exists), but
// project.pbxproj references it as a resource in the App target. So its
// absence is not a missing feature, it is a build that stops at "Build input
// file cannot be found" — and if somebody removes the reference to get past
// that, @capacitor-firebase/messaging calls FirebaseApp.configure() at launch
// with nothing to configure from and raises. A crash before the app paints is
// the fastest possible App Review rejection.
const googleService = resolve(APP_DIR, "GoogleService-Info.plist");

if (!existsSync(googleService)) {
  failures.push(
    "ios/App/App/GoogleService-Info.plist is missing.\n" +
      "      The Xcode project lists it as a bundled resource, so the build stops\n" +
      "      at 'Build input file cannot be found' — and removing the reference\n" +
      "      instead turns it into a crash on launch when Firebase Messaging\n" +
      "      configures itself.\n\n" +
      "      Get it from the Firebase console:\n" +
      "        Project settings -> General -> Your apps -> GoogleService-Info.plist",
  );
} else {
  // A plist from the wrong Firebase app is worse than none: it builds, it
  // launches, it registers, and the tokens are filed against another app.
  const contents = readFileSync(googleService, "utf8");
  const bundleId = contents.match(
    /<key>BUNDLE_ID<\/key>\s*<string>([^<]*)<\/string>/,
  )?.[1];

  if (bundleId && bundleId !== BUNDLE_ID) {
    failures.push(
      `GoogleService-Info.plist is for '${bundleId}', not '${BUNDLE_ID}'.\n` +
        "      Push would register against a different Firebase app and nothing\n" +
        "      would arrive. Download the one for this app.",
    );
  }
}

// ── The AdMob application id is per platform ──────────────────────────────
//
// An app id uses `~`, an ad unit uses `/`, and the two are easy to swap.
// Recent Google Mobile Ads SDKs raise on launch when GADApplicationIdentifier
// does not resolve to an iOS app — which is a crash before the first paint,
// and it has been wrong in this file before (it held the Android id).
const infoPlist = resolve(APP_DIR, "Info.plist");

if (!existsSync(infoPlist)) {
  failures.push("ios/App/App/Info.plist is missing.");
} else {
  const contents = readFileSync(infoPlist, "utf8");
  const gadId = contents.match(
    /<key>GADApplicationIdentifier<\/key>\s*<string>([^<]*)<\/string>/,
  )?.[1];

  if (!gadId) {
    failures.push(
      "GADApplicationIdentifier is not in Info.plist. The Google Mobile Ads\n" +
        "      SDK raises on launch without it.",
    );
  } else if (!gadId.includes("~")) {
    failures.push(
      `GADApplicationIdentifier is '${gadId}', which is not an app id.\n` +
        "      An app id contains '~'; an ad unit contains '/'. The SDK raises on\n" +
        "      launch for a value it cannot resolve to an iOS app.",
    );
  }
}

// ── Real ad units, not Google's demo placements ───────────────────────────
//
// src/services/adService.ts falls back to ca-app-pub-3940256099942544/… when
// VITE_ADMOB_IOS_REWARDED or _INTERSTITIAL is unset. Those are Google's public
// TEST units, and the SDK is initialised with isTesting: false — so a build
// made without these variables serves Google's demo creatives to real users as
// production advertising. It violates AdMob's policy, it earns nothing, and to
// a reviewer it looks like test content shipped by mistake.
//
// The only signal today is a console.warn nobody reads on a device. The
// tracked .env sets both, so this passes locally; it exists for the build that
// happens somewhere else — a CI runner, a fresh clone, a worktree — where .env
// was never loaded. Same reasoning as the Supabase guard in vite.config.ts:
// the failure is invisible at build time and expensive afterwards, so it has
// to be loud here.
for (const key of ["VITE_ADMOB_IOS_REWARDED", "VITE_ADMOB_IOS_INTERSTITIAL"]) {
  const value = (process.env[key] ?? "").trim();
  if (!value) {
    failures.push(
      `${key} is not set. The build would fall back to Google's demo ad\n` +
        "      unit and serve test creatives as production advertising.\n" +
        "      Supply the value; do not remove this check.",
    );
  } else if (value.includes("3940256099942544")) {
    failures.push(
      `${key} is set to Google's demo ad unit. That is the test\n` +
        "      placement — it serves ads and earns nothing. Use the real unit.",
    );
  }
}

if (failures.length > 0) {
  console.error("\nverify-ios-native failed:\n");
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log("verify-ios-native: ok — Firebase config present, AdMob app id is an iOS app id.");
