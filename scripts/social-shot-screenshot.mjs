import { chromium } from "/home/user/flutter-native-play/node_modules/@playwright/test/index.mjs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";

const here = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "shot-"));

// Chromium can't tunnel through the agent proxy, but curl can. External
// requests are intercepted and served via curl; localhost goes direct.
async function curlFulfill(route) {
  const url = route.request().url();
  try {
    const body = join(tmp, "body");
    const meta = execFileSync("curl", [
      "-sS", "--compressed", "--max-time", "20",
      "-o", body, "-w", "%{http_code}\t%{content_type}", url,
    ], { encoding: "utf8" });
    const [status, contentType] = meta.split("\t");
    await route.fulfill({
      status: Number(status) || 200,
      contentType: contentType || "application/octet-stream",
      body: readFileSync(body),
    });
  } catch {
    await route.abort();
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
// 432×540 CSS px at 2.5× = 1080×1350 device px — a phone-width layout on the
// IG 4:5 canvas, so the game UI renders at its real proportions.
const page = await browser.newPage({ viewport: { width: 432, height: 540 }, deviceScaleFactor: 2.5 });
await page.route("**/*", (route) => {
  const url = route.request().url();
  if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) return route.continue();
  if (route.request().method() !== "GET") return route.abort();
  return curlFulfill(route);
});
page.on("requestfailed", (r) => console.error("FAIL", r.url().slice(0, 100)));
const search = process.argv[2] ?? "";
await page.goto("http://127.0.0.1:5199/social-shot.html" + search, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
// Let the icon library resolve and the category icon image arrive.
await page.waitForTimeout(6000);
await page.screenshot({ path: join(here, "game-ig-1080x1350.png") });
await browser.close();
rmSync(tmp, { recursive: true, force: true });
