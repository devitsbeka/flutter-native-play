import { test, expect, type Page } from "@playwright/test";

// Read-only smoke tests: no TV session is ever created (no /tv without a code),
// so nothing is written to the database.

// Noise that should not fail the smoke tests
const CONSOLE_ERROR_ALLOWLIST = [
	/favicon/i,
	/posthog/i,
	/analytics/i,
	/failed to load resource/i,
	/net::err/i,
	// Headless/open-source Chromium lacks H.264 - mp4 <video> elements throw
	// this in CI while working fine in real browsers/webviews
	/NotSupportedError.*no supported source/i,
];

function collectErrors(page: Page) {
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

test.describe("TV smoke", () => {
	test("home page renders", async ({ page }) => {
		const { consoleErrors, pageErrors } = collectErrors(page);

		await page.goto("/");
		await expect(page.locator("#root")).not.toBeEmpty();

		expect(pageErrors).toEqual([]);
		expect(consoleErrors).toEqual([]);
	});

	test("/join shows the code entry UI", async ({ page }) => {
		const { consoleErrors, pageErrors } = collectErrors(page);

		await page.goto("/join");
		// ControllerCodeEntry renders a 4-char code input and a join button
		await expect(page.locator('input[maxlength="4"]')).toBeVisible();
		await expect(page.locator("button").first()).toBeVisible();

		expect(pageErrors).toEqual([]);
		expect(consoleErrors).toEqual([]);
	});

	test("/tv/0000 handles an invalid code gracefully", async ({ page }) => {
		const { consoleErrors, pageErrors } = collectErrors(page);

		await page.goto("/tv/0000");

		// The page must not be blank: TVDisplay shows a loader, then an error
		// screen ("Session not found" / "Failed to join session") for bad codes.
		await expect(page.locator("#root")).not.toBeEmpty();
		await expect
			.poll(async () => (await page.locator("#root").innerText()).trim().length, {
				timeout: 30_000,
			})
			.toBeGreaterThan(0);

		// No uncaught exceptions while handling the invalid code
		expect(pageErrors).toEqual([]);
		expect(consoleErrors).toEqual([]);
	});
});
