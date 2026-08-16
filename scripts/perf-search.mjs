/**
 * Measure the Explore search, so "it feels slow" becomes a number.
 *
 * This exists because the search was reported slow twice and "fixed" once
 * from reading the code — the fix was a cache in front of the transliterator,
 * and the transliterator was never the problem. A CDP trace of a
 * four-character search put 60ms in JavaScript and ~340ms in style
 * recalculation, layerization and paint: the cost was mounting forty
 * category cards, not matching forty strings.
 *
 * Runs headless Chromium against a local preview build with every Supabase
 * call answered from a fixture, so the only variable is what the client does.
 *
 *   npm run build
 *   npx vite preview --port 4173 --host 127.0.0.1 &
 *   node scripts/perf-search.mjs [cpuThrottle] [query]
 *
 * `cpuThrottle` is a divisor — 4 to 6 puts this container in the range of a
 * mid-range phone. Report the FIRST keystroke: it is the one that swaps the
 * page from four carousels to the results list, and it is always the worst.
 *
 * Baseline before the windowing/memo/deferred-branch changes, at 6x:
 *   'k'    caret 385ms  settled 489ms  cards 39
 * After:
 *   'k'    caret 179ms  settled 348ms  cards 13
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ORIGIN = 'http://127.0.0.1:4173';
const rate = Number(process.argv[2] || 6);
const query = process.argv[3] || 'kino';

const categories = JSON.parse(
  readFileSync(new URL('./fixtures/discover-categories.json', import.meta.url), 'utf8'),
);

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });

await page.route('**/*', async (route) => {
  const url = route.request().url();
  if (url.startsWith(ORIGIN)) return route.continue();
  if (url.includes('/rest/v1/categories')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) });
  }
  if (url.includes('/rest/v1/') || url.includes('/auth/v1/') || url.includes('/functions/v1/')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  }
  return route.abort();
});

await page.goto(`${ORIGIN}/discover`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

await page.locator('button:has(svg.lucide-search)').first().click();
await page.waitForTimeout(600);
const input = page.locator('input[type="text"], input:not([type])').first();
await input.click();

const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await page.waitForTimeout(500);

for (const ch of query) {
  const t0 = Date.now();
  await input.press(ch);
  const typed = await input.inputValue();
  const caret = Date.now() - t0;

  let cards = -1;
  let settled = -1;
  while (Date.now() - t0 < 6000) {
    const n = await page.locator('[role="button"]').count();
    if (n !== cards) { cards = n; settled = Date.now() - t0; }
    await page.waitForTimeout(50);
    if (Date.now() - t0 > settled + 700) break;
  }
  console.log(`${rate}x  '${typed}'  caret ${caret}ms  settled ${settled}ms  cards ${cards}`);
}

await browser.close();
