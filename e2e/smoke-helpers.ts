import { expect, type Page } from "@playwright/test";

// Noise that should not fail a smoke test: third-party beacons, missing
// favicons, and codec gaps in headless Chromium. Anything else that reaches
// console.error is treated as a real failure.
export const CONSOLE_ERROR_ALLOWLIST = [
	/favicon/i,
	/posthog/i,
	/analytics/i,
	/failed to load resource/i,
	/net::err/i,
	// Headless/open-source Chromium lacks H.264 - mp4 <video> elements throw
	// this in CI while working fine in real browsers/webviews
	/NotSupportedError.*no supported source/i,
	/The play\(\) request was interrupted/i,
	// Signed-out visitors legitimately get 401/403 from row-level security
	/JWT|row-level security|permission denied/i,
];

export interface CollectedErrors {
	consoleErrors: string[];
	pageErrors: string[];
}

/** Start recording console and uncaught errors for the life of the page. */
export function collectErrors(page: Page): CollectedErrors {
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];

	page.on("console", (msg) => {
		if (msg.type() !== "error") return;
		const text = msg.text();
		if (CONSOLE_ERROR_ALLOWLIST.some((re) => re.test(text))) return;
		consoleErrors.push(text);
	});

	page.on("pageerror", (err) => {
		pageErrors.push(err.message);
	});

	return { consoleErrors, pageErrors };
}

/**
 * Navigate to an app route and wait for React to paint.
 *
 * Deliberately `domcontentloaded` rather than Playwright's default `load`:
 * the app streams video and holds open Supabase/PostHog connections, so the
 * `load` event can be minutes away or never fire at all. What a smoke test
 * actually needs to know is that the bundle parsed and the tree mounted,
 * which is what the #root assertion below proves.
 */
export async function gotoApp(page: Page, path: string): Promise<void> {
	await page.goto(path, { waitUntil: "domcontentloaded" });
	await expect(page.locator("#root")).not.toBeEmpty();
}

/** Assert the route painted real content rather than an empty shell. */
export async function expectRendered(page: Page, path: string): Promise<void> {
	await expect
		.poll(async () => (await page.locator("#root").innerText()).trim().length, {
			timeout: 30_000,
			message: `${path} mounted but painted no text`,
		})
		.toBeGreaterThan(0);
}
