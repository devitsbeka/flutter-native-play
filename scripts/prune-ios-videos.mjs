#!/usr/bin/env node
/**
 * Strip the video library out of the iOS bundle.
 *
 * Capacitor copies `webDir` wholesale into the app, and `public/videos` is
 * 276 MB of it — a ~400 MB download, well over the cellular threshold where
 * iOS warns the user and a good share of them stop. App Store size limits
 * were never the problem; install conversion is.
 *
 * What stays is the handful of clips a player sees before anything has had a
 * chance to stream: the ambient blob behind the home screen, the loader, and
 * the first few category cards. Everything else is fetched from
 * VITE_VIDEO_BASE_URL at the moment it is needed.
 *
 * Runs between `vite build` and `cap sync ios`, so it prunes `dist/` before
 * Capacitor copies it. It never touches `public/`.
 */

import { readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const DIST_VIDEOS = resolve(process.cwd(), "dist", "videos");

/**
 * Bare filenames kept on device, in every format and variant that exists.
 *
 * Keep this list short. Each entry is paid for by every single install,
 * whether the player ever reaches that screen or not.
 */
const KEEP = new Set([
  "floating-blob", // ambient background, visible on the home screen immediately
  "loading", // the loader itself — streaming this would defeat its purpose
  "trivia-king-scene", // avatar studio intro
]);

function shouldKeep(file) {
  const base = file.replace(/\.(mp4|webm)$/, "");
  return KEEP.has(base);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// ── Web-only weight the native bundle has no use for ────────────────────────
//
// These ride into dist/ because Capacitor copies webDir wholesale, and into
// the .ipa from there. None is reachable on native:
//
//  - app-icon-1024*.png — favicon/touch-icon assets (~1.5 MB); the app's
//    real icon comes from the Xcode asset catalog.
//  - assets/heic-to-*.js / assets/heic2any-*.js — HEIC decoders (~4 MB),
//    dynamic-imported only by the web file-input path. The native photo flow
//    goes through @capacitor/camera, which hands back JPEG; nothing on a
//    phone ever imports these chunks.
//  - english-generation-prompt.md, question-quality-guide.md,
//    question-import-schema.json — internal authoring documents. Their only
//    references are three <a download> links in
//    src/pages/admin/import/BulkImport.tsx, and build:ios sets
//    VITE_INCLUDE_ADMIN=false, so the page they live on is not in the native
//    bundle at all. Shipping our own content playbook inside a public .ipa is
//    not a size problem, it is a disclosure one.
//  - social-frames/ — 8.5 MB of PNG/SVG furniture for the marketing-image
//    generator. Referenced only by src/components/social/StarQuestionFrame.tsx
//    and PromoSlide.tsx, reached only from the admin page
//    src/pages/admin/SocialFrames.tsx and the headless dev route
//    src/dev/star-shot.tsx. Neither is in a native build.
//  - placeholder.svg — a Lovable scaffold leftover. Nothing in the repo
//    references it (grep finds zero hits outside public/ itself).
//  - sw.js — the video-caching service worker. src/main.tsx registers it
//    behind `!Capacitor.isNativePlatform()`, because Capacitor serves from
//    capacitor://localhost where service workers do not run. Dead weight on
//    device by the app's own admission.
//  - .DS_Store — Finder droppings. Never intentional, occasionally present.
//
// Runs before the videos check on purpose: even a build with no videos left
// to prune should still shed these. Web builds are untouched — this script
// only runs in build:ios.
const DIST = resolve(process.cwd(), "dist");
const WEB_ONLY = [
  /^app-icon-1024[^/]*\.png$/,
  /^assets\/heic-to-[\w-]+\.js$/,
  /^assets\/heic2any-[\w-]+\.js$/,
  /^english-generation-prompt\.md$/,
  /^question-quality-guide\.md$/,
  /^question-import-schema\.json$/,
  /^placeholder\.svg$/,
  /^sw\.js$/,
  /^social-frames\//,
  /(^|\/)\.DS_Store$/,
];
if (existsSync(DIST)) {
  let webOnlyBytes = 0;
  let webOnlyCount = 0;
  for (const file of walk(DIST)) {
    const rel = relative(DIST, file);
    if (WEB_ONLY.some((re) => re.test(rel))) {
      webOnlyBytes += statSync(file).size;
      rmSync(file);
      webOnlyCount++;
    }
  }
  if (webOnlyCount > 0) {
    console.log(
      `prune-ios-videos: also removed ${webOnlyCount} web-only asset(s) ` +
      `(${(webOnlyBytes / 1024 / 1024).toFixed(1)} MB): favicon PNGs, HEIC decoder ` +
      `chunks, admin-only docs and marketing frames.`,
    );
  }
}

if (!existsSync(DIST_VIDEOS)) {
  console.log("prune-ios-videos: no dist/videos to prune.");
  process.exit(0);
}

const files = walk(DIST_VIDEOS);
let removedBytes = 0;
let removedCount = 0;
let keptBytes = 0;
let keptCount = 0;

for (const file of files) {
  const size = statSync(file).size;
  if (shouldKeep(file.split("/").pop())) {
    keptBytes += size;
    keptCount++;
    continue;
  }
  rmSync(file);
  removedBytes += size;
  removedCount++;
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

console.log(
  `prune-ios-videos: kept ${keptCount} file(s) (${mb(keptBytes)} MB), ` +
    `removed ${removedCount} (${mb(removedBytes)} MB).`,
);

console.log(
  `  Remaining clips stream from VITE_VIDEO_BASE_URL. Verify that host serves ` +
    `${relative(process.cwd(), DIST_VIDEOS)}/ before shipping a build.`,
);
