#!/usr/bin/env node
/**
 * Guard the iOS bundle against things that should never reach the App Store.
 *
 * Run by `npm run build:ios` between the Vite build and `cap sync`, so a
 * violation stops the build rather than shipping.
 *
 * Each check exists because the audit found it already true of the repo, not
 * because it seemed like a good idea:
 *
 *  - VITE_INCLUDE_ADMIN defaults to ON, so the default build emits the whole
 *    content-management console — Dashboard, Import, QuestionStudio and the
 *    rest, several hundred KB of surface a reviewer can find inside a trivia
 *    app.
 *  - The Meta Pixel loads unconditionally from index.html, which inside the
 *    native binary is third-party tracking running before ATT is ever shown.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const DIST = resolve(process.cwd(), "dist");

/** Chunk name fragments that only exist because an admin page was included. */
const ADMIN_CHUNKS = [
  "AdventureMapAdmin",
  "ContentManager",
  "DuplicateScanner",
  "IconAssignment",
  "QuestionStudio",
  "UserAnalytics",
];

/**
 * Chunk name fragments belonging to surfaces that are built but not released.
 *
 * This list is the reason the previous one was not enough. It checked six
 * hardcoded admin names, so it kept catching the leak it was written for while
 * every unreleased surface added afterwards walked straight past it: two whole
 * game modes (King, Team Battle), a second home screen with its own PRO
 * paywall (HomeV3, PathDetailV3), and the 527 KB three.js world map. All of
 * them shipped in the reviewed binary and all of them were reachable by deep
 * link.
 *
 * Anything a reviewer must not find belongs here, not only the console.
 */
const UNRELEASED_CHUNKS = [
  "KingPage",
  "TeamBattlePage",
  "HomeV3",
  "PathDetailV3",
  "WorldMapCanvas",
];

const failures = [];

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

// When run as a Capacitor hook (capacitor:sync:before / copy:before) the CLI
// exports CAPACITOR_PLATFORM_NAME. This policy is about what ships in the
// iOS binary — enforcing it on `cap sync android` (or a docs-only sync)
// would fail builds the policy doesn't apply to.
const hookPlatform = process.env.CAPACITOR_PLATFORM_NAME;
if (hookPlatform && hookPlatform !== "ios") {
  console.log(`verify-ios-bundle: ${hookPlatform} sync, iOS bundle policy not applicable — skipping`);
  process.exit(0);
}

let files;
try {
  files = listFiles(DIST);
} catch {
  if (hookPlatform) {
    // As a hook, a missing dist/ isn't this guard's failure to report —
    // Capacitor's own copy step fails immediately after with the real error.
    console.warn(`verify-ios-bundle: no build at ${DIST}; letting cap report it`);
    process.exit(0);
  }
  console.error(`verify-ios-bundle: no build found at ${DIST}`);
  process.exit(1);
}

// ── The admin console must not be in the binary ────────────────────────────
const adminChunks = files.filter((f) =>
  ADMIN_CHUNKS.some((name) => f.includes(name)),
);

if (adminChunks.length > 0) {
  failures.push(
    "The admin console is in the bundle. Build with VITE_INCLUDE_ADMIN=false.\n" +
      adminChunks.map((f) => `      ${f.replace(DIST + "/", "")}`).join("\n"),
  );
}

// ── Unreleased surfaces must not be in the binary ──────────────────────────
const unreleasedChunks = files.filter((f) =>
  UNRELEASED_CHUNKS.some((name) => f.includes(name)),
);

if (unreleasedChunks.length > 0) {
  failures.push(
    "An unreleased surface is in the bundle. These are App Store guideline\n" +
      "      2.3.1 (hidden features) and 2.2 (beta software) findings — a route\n" +
      "      guard is not enough, the chunk itself must not ship. Leave\n" +
      "      VITE_INCLUDE_UNRELEASED_MODES and VITE_INCLUDE_UI_PREVIEWS unset.\n" +
      unreleasedChunks.map((f) => `      ${f.replace(DIST + "/", "")}`).join("\n"),
  );
}

// ── The EEA consent debug override must never ship ────────────────────────
//
// VITE_UMP_DEBUG_EEA forces Google's consent SDK to treat the device as being
// in the EEA, so the consent form can be tested from outside Europe. In a
// production binary that would show the European consent form to every user
// in the world, and make the app's own EEA behaviour untestable because it
// would always be on.
if ((process.env.VITE_UMP_DEBUG_EEA ?? "").trim()) {
  failures.push(
    "VITE_UMP_DEBUG_EEA is set. That forces the EEA consent form for every\n" +
      "      user. It is a local testing switch — unset it before building.",
  );
}

// ── Test ads must never ship ──────────────────────────────────────────────
//
// VITE_ADMOB_TEST_DEVICE turns on Google's test ads for one device. In a store
// build that means serving test creatives as production advertising: it earns
// nothing and it is against AdMob policy.
if ((process.env.VITE_ADMOB_TEST_DEVICE ?? "").trim()) {
  failures.push(
    "VITE_ADMOB_TEST_DEVICE is set. That serves Google's test ads instead of\n" +
      "      real ones. It is a local verification switch — unset it before\n" +
      "      building for the store.",
  );
}

// ── No third-party tracking that runs before ATT ───────────────────────────
const indexHtml = join(DIST, "index.html");
try {
  const html = readFileSync(indexHtml, "utf8");
  if (html.includes("connect.facebook.net") || html.includes("fbq(")) {
    failures.push(
      "The Meta Pixel is in index.html. It must not ship in the native build —\n" +
        "      it tracks before the ATT prompt is shown.",
    );
  }
} catch {
  failures.push("dist/index.html is missing.");
}

// ── Size ceiling ───────────────────────────────────────────────────────────
//
// Capacitor copies dist/ into the app, so this is a close proxy for the
// installed size. The number that matters is not the App Store's 4 GB limit
// but the cellular download threshold: above it iOS warns before downloading,
// and a meaningful share of installs stop there.
//
// dist/ was 394 MB — 276 MB of it video — before the pruning step existed.
// The ceiling is set well above the pruned size so ordinary asset growth does
// not trip it, and well below the point where the warning appears.
const MAX_DIST_MB = 150;

const totalBytes = files.reduce((sum, f) => sum + statSync(f).size, 0);
const totalMb = totalBytes / 1024 / 1024;

if (totalMb > MAX_DIST_MB) {
  failures.push(
    `The bundle is ${totalMb.toFixed(1)} MB, over the ${MAX_DIST_MB} MB ceiling.\n` +
      "      Largest directories:\n" +
      Object.entries(
        files.reduce((acc, f) => {
          const dir = relative(DIST, f).split("/")[0];
          acc[dir] = (acc[dir] ?? 0) + statSync(f).size;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([dir, size]) => `        ${dir}: ${(size / 1024 / 1024).toFixed(1)} MB`)
        .join("\n"),
  );
}

if (failures.length > 0) {
  console.error("\nverify-ios-bundle failed:\n");
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(
  `verify-ios-bundle: ok — ${totalMb.toFixed(1)} MB, no admin console, ` +
    "no pre-ATT tracking.",
);
