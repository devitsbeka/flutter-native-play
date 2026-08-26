#!/usr/bin/env node
/**
 * Capture App Store screenshots from the running dev server.
 *
 * Written for the in-app purchase review screenshots — App Store Connect wants
 * one per product, six of them, and refuses to save the metadata without them.
 * It is kept because the store listing needs its own set later, and because
 * screenshots taken by hand drift from the app the moment a price changes.
 *
 *   npx vite --host 127.0.0.1 --port 8080     # in another shell
 *   node scripts/capture-store-screenshots.mjs
 *
 * Output: screenshots/<name>.png
 *
 * ── Dimensions ────────────────────────────────────────────────────────────
 * App Store Connect validates against **real device resolutions**, not against
 * the 640x920 minimum its documentation quotes. A 780x986 crop of the gems
 * section was rejected with "the dimensions of one or more screenshots are
 * wrong"; the same content as a full 1242x2208 screen was accepted. So capture
 * whole screens at a device size and never crop to an element.
 *
 * 1242x2208 is the 5.5" iPhone — 414x736 CSS at deviceScaleFactor 3.
 *
 * ── Two things that cost an hour each ─────────────────────────────────────
 * The app scrolls an inner <main>, not the window, so `window.scrollBy` and
 * `scrollIntoViewIfNeeded` both appear to work and change nothing. `frame()`
 * walks up to the real scroll container and sets its scrollTop.
 *
 * The PRO tiers live in a carousel whose off-screen slides are still
 * `isVisible()`. Checking that a price is inside the viewport rect is what
 * distinguishes the slide on screen from the four that are not — without it
 * you capture whichever deal happens to be showing.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "screenshots");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8080";

// Playwright's bundled Chromium revision may not match this environment's.
const EXECUTABLE = process.env.CHROMIUM_PATH ?? undefined;

// iPhone 16 Pro Max logical size -> 1320x2868, the 6.9" slot App Store
// Connect keys screenshots on now. The old value here was 414x736@3x =
// 1242x2208, the retired 5.5" slot, which the media manager refuses.
// Confirm against ASC's media manager before a capture run regardless —
// the required size moves with the flagship.
const DEVICE = { width: 440, height: 956, scale: 3 }; // -> 1320x2868

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(
  EXECUTABLE ? { executablePath: EXECUTABLE } : {},
);
const ctx = await browser.newContext({
  viewport: { width: DEVICE.width, height: DEVICE.height },
  deviceScaleFactor: DEVICE.scale,
  isMobile: true,
  hasTouch: true,
});
// Reviewers read English; the app defaults to Georgian.
await ctx.addInitScript(() => localStorage.setItem("preferredLanguage", "en"));

const page = await ctx.newPage();

async function shoot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ${name}.png  ${DEVICE.width * DEVICE.scale}x${DEVICE.height * DEVICE.scale}`);
}

/** Scroll the real scroll container so `headingText` sits below the header. */
async function frame(headingText, offset = 78) {
  const result = await page.evaluate(
    ({ headingText, offset }) => {
      const h = [...document.querySelectorAll("h1,h2,h3")].find(
        (e) => e.textContent.trim() === headingText,
      );
      if (!h) return `heading ${headingText} not found`;
      let sc = h.parentElement;
      while (sc && sc !== document.body) {
        const s = getComputedStyle(sc);
        if (/(auto|scroll)/.test(s.overflowY) && sc.scrollHeight > sc.clientHeight + 4) break;
        sc = sc.parentElement;
      }
      sc = sc && sc !== document.body ? sc : document.scrollingElement || document.documentElement;
      const hr = h.getBoundingClientRect();
      const cr = sc === document.scrollingElement ? { top: 0 } : sc.getBoundingClientRect();
      sc.scrollTop += hr.top - cr.top - offset;
      return null;
    },
    { headingText, offset },
  );
  if (result) throw new Error(result);
  await page.waitForTimeout(1500);
}

/** The `$x.yy` actually inside the viewport, ignoring off-screen slides. */
const priceOnScreen = () =>
  page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    for (const el of document.querySelectorAll("*")) {
      if (el.children.length) continue;
      const m = (el.textContent || "").trim().match(/^\$\d+\.\d\d$/);
      if (!m) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.left >= -5 && r.right <= vw + 5 && r.top >= 0 && r.bottom <= vh) {
        return m[0];
      }
    }
    return null;
  });

console.log(`Capturing from ${BASE} at ${DEVICE.width * DEVICE.scale}x${DEVICE.height * DEVICE.scale}\n`);

await page.goto(`${BASE}/power-ups`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(9000);

// All four gem consumables share one screenshot — Apple wants to see where the
// purchase happens, not a bespoke image per SKU.
await frame("Gems");
await shoot("iap-gems");

// One per subscription, stepped out of the carousel.
await page.getByText("Deals").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);

const WANTED = { "$3.99": "iap-pro", "$7.99": "iap-proplus" };
const captured = new Set();
for (let i = 0; i < 10 && captured.size < Object.keys(WANTED).length; i++) {
  const price = await priceOnScreen();
  const name = price && WANTED[price];
  if (name && !captured.has(name)) {
    await shoot(name);
    captured.add(name);
  }
  await page.locator("button:has(svg)").nth(1).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1700);
}

await browser.close();

const missing = Object.values(WANTED).filter((n) => !captured.has(n));
if (missing.length) {
  console.error(`\nNot captured: ${missing.join(", ")}`);
  console.error("The carousel may have been restructured — check which slide holds each tier.");
  process.exit(1);
}
console.log(`\nWritten to ${OUT}`);
