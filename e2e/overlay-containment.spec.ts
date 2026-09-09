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

	test("a guest's sign-in prompt covers the screen on mobile", async ({ page }) => {
		await page.setViewportSize({ width: 430, height: 900 });
		await gotoApp(page, "/power-ups");
		await page.waitForTimeout(1500);

		// This used to open the header's search panel. Signed out there is no
		// search to open any more — the header carries the language picker, and
		// SpotlightSearch is mounted only for a signed-in user — while this
		// suite never signs in. The property under test was never about search:
		// it is that a full-screen overlay escapes any transformed ancestor
		// rather than being trapped inside one. The sign-in prompt a guest gets
		// from a buy control is the full-screen overlay this page now offers,
		// so it is the vehicle.
		await page.locator('[data-testid="power-buy"]').first().click();
		await page.waitForTimeout(800);

		const overlay = page.locator("div.fixed.inset-0").filter({ hasNot: page.locator("#root") }).last();
		await expect(overlay).toBeVisible();

		const box = await overlay.boundingBox();
		expect(box, "overlay has no box").not.toBeNull();
		// An overlay trapped in a card or a header bar is a few hundred px tall
		expect(box!.height, "overlay does not cover the viewport height").toBeGreaterThan(880);
		expect(box!.width, "overlay does not cover the viewport width").toBeGreaterThan(420);

		expect(await trappedOverlays(page), "prompt is inside a containing block").toEqual([]);
	});
});
