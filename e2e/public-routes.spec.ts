import { test, expect } from "@playwright/test";
import { collectErrors, expectRendered, gotoApp } from "./smoke-helpers";

// Read-only smoke tests over every route a signed-out visitor can reach.
// Nothing signs in and nothing is written to the database.
//
// What these catch that unit tests cannot: a route that renders a blank
// screen. Chunk-init order, a bad lazy import, or a context that throws on
// mount all produce a white page with a console error and no failing unit
// test anywhere — the exact failure that takes a site down on deploy day.

const PUBLIC_ROUTES = [
	{ path: "/", name: "home" },
	{ path: "/auth", name: "sign in" },
	{ path: "/leaderboards", name: "leaderboards" },
	{ path: "/power-ups", name: "shop" },
	{ path: "/discover", name: "discover" },
	{ path: "/vip", name: "PRO" },
	{ path: "/team", name: "rooms" },
	{ path: "/join", name: "TV join" },
	{ path: "/privacy-policy", name: "privacy policy" },
	{ path: "/terms", name: "terms" },
	{ path: "/support", name: "support" },
];

test.describe("public routes render", () => {
	for (const route of PUBLIC_ROUTES) {
		test(`${route.name} (${route.path}) renders without errors`, async ({ page }) => {
			const { consoleErrors, pageErrors } = collectErrors(page);

			await gotoApp(page, route.path);
			await expectRendered(page, route.path);

			expect(pageErrors, `uncaught errors on ${route.path}`).toEqual([]);
			expect(consoleErrors, `console errors on ${route.path}`).toEqual([]);
		});
	}
});

test.describe("app shell", () => {
	test("an unknown route shows the not-found page, not a blank screen", async ({ page }) => {
		const { pageErrors } = collectErrors(page);

		await gotoApp(page, "/this-route-does-not-exist");
		await expectRendered(page, "/this-route-does-not-exist");

		expect(pageErrors).toEqual([]);
	});

	test("the home page survives a reload", async ({ page }) => {
		// Guards the load-flash / remount path: a second mount hits warm
		// caches and different timing than the first.
		const { consoleErrors, pageErrors } = collectErrors(page);

		await gotoApp(page, "/");
		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.locator("#root")).not.toBeEmpty();
		await expectRendered(page, "/ (after reload)");

		expect(pageErrors).toEqual([]);
		expect(consoleErrors).toEqual([]);
	});

	test("client-side navigation keeps the app mounted", async ({ page }) => {
		// A hard goto only proves the route renders from scratch. Navigating
		// within the SPA is how users actually get there, and it exercises the
		// lazy chunk for the destination route.
		const { pageErrors } = collectErrors(page);

		await gotoApp(page, "/");
		await page.evaluate(() => {
			window.history.pushState({}, "", "/leaderboards");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});
		await expectRendered(page, "/leaderboards (client-side)");

		expect(pageErrors).toEqual([]);
	});
});
