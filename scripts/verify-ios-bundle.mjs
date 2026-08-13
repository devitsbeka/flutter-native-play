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

let files;
try {
  files = listFiles(DIST);
} catch {
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
