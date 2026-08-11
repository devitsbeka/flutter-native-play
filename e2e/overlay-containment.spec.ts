import { test, expect, type Page } from "@playwright/test";
import { gotoApp } from "./smoke-helpers";

// `position: fixed` is viewport-relative only while no ancestor establishes a
// containing block for it. transform, filter, backdrop-filter, perspective,
// will-change and contain: paint (which `content-visibility: auto` implies)
// all do — and this app uses several of those on header bars and cards.
//
// An overlay rendered where its trigger lives can therefore end up sized to a
// header strip while the page shows through the rest of the screen. It is
// invisible to unit tests and easy to miss in review, so it is asserted here:
// anything that asks to cover the viewport (fixed + inset-0) must not be
// trapped, and must actually cover it once opened.

const TRAPPED_ANCESTORS = `
  (el) => {
    const trapped = [];
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      const s = getComputedStyle(node);
      const reasons = [];
      if (s.transform && s.transform !== 'none') reasons.push('transform');
      if (s.filter && s.filter !== 'none') reasons.push('filter');
      if (s.backdropFilter && s.backdropFilter !== 'none') reasons.push('backdrop-filter');
      if (s.perspective && s.perspective !== 'none') reasons.push('perspective');
      if (/transform|filter|perspective/.test(s.willChange || '')) reasons.push('will-change');
      if (/paint|layout|strict|content/.test(s.contain || '')) reasons.push('contain');
      if (s.contentVisibility === 'auto') reasons.push('content-visibility');
      if (reasons.length) {
        trapped.push(node.tagName.toLowerCase() + '.' + String(node.className).slice(0, 60) + ' [' + reasons.join(',') + ']');
      }
      node = node.parentElement;
    }
    return trapped;
  }
`;

/** Every rendered `fixed inset-0` overlay that sits inside a containing block. */
async function trappedOverlays(page: Page): Promise<string[]> {
	return page.evaluate(`(() => {
    const isTrapped = ${TRAPPED_ANCESTORS};
    const out = [];
    for (const el of document.querySelectorAll('[class*="inset-0"]')) {
      if (getComputedStyle(el).position !== 'fixed') continue;
      const reasons = isTrapped(el);
      if (reasons.length) {
        out.push(String(el.className).slice(0, 80) + ' <- ' + reasons.join(' | '));
      }
    }
    return out;
  })()`);
}

const ROUTES = ["/", "/power-ups", "/leaderboards", "/discover", "/team"];

test.describe("full-screen overlays are not trapped by a containing block", () => {
	for (const route of ROUTES) {
		test(`${route} has no trapped fixed overlays`, async ({ page }) => {
			await page.setViewportSize({ width: 430, height: 900 });
			await gotoApp(page, route);
			await page.waitForTimeout(1500);

			expect(await trappedOverlays(page), `trapped overlays on ${route}`).toEqual([]);
		});
	}

	test("header search covers the screen on mobile", async ({ page }) => {
		await page.setViewportSize({ width: 430, height: 900 });
		await gotoApp(page, "/power-ups");
		await page.waitForTimeout(1500);

		// The header's magnifier: first button holding an svg with the lucide
		// search class, so this survives header markup changes.
		const searchButton = page.locator("header button, [class*='header'] button").filter({ has: page.locator("svg.lucide-search") }).first();
		const fallback = page.locator("button").filter({ has: page.locator("svg.lucide-search") }).first();
		const trigger = (await searchButton.count()) ? searchButton : fallback;
		await trigger.click();
		await page.waitForTimeout(800);

		const panel = page.locator("div.fixed.inset-0").filter({ has: page.locator("input") }).first();
		await expect(panel).toBeVisible();

		const box = await panel.boundingBox();
		expect(box, "search panel has no box").not.toBeNull();
		// A panel trapped in the header bar is a couple of hundred pixels tall
		expect(box!.height, "search panel does not cover the viewport height").toBeGreaterThan(880);
		expect(box!.width, "search panel does not cover the viewport width").toBeGreaterThan(420);

		expect(await trappedOverlays(page), "search panel is inside a containing block").toEqual([]);
	});
});
