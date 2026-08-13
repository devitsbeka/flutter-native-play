import { test, expect } from "@playwright/test";
import { collectErrors, expectRendered, gotoApp } from "./smoke-helpers";

// Read-only smoke tests: no TV session is ever created (no /tv without a code),
// so nothing is written to the database.

test.describe("TV smoke", () => {
	test("/join shows the code entry UI", async ({ page }) => {
		const { consoleErrors, pageErrors } = collectErrors(page);

		await gotoApp(page, "/join");
		// ControllerCodeEntry renders a 4-char code input and a join button
		await expect(page.locator('input[maxlength="4"]')).toBeVisible();
		await expect(page.locator("button").first()).toBeVisible();

		expect(pageErrors).toEqual([]);
		expect(consoleErrors).toEqual([]);
	});

	test("/tv/0000 handles an invalid code gracefully", async ({ page }) => {
		const { consoleErrors, pageErrors } = collectErrors(page);

		// The page must not be blank: TVDisplay shows a loader, then an error
		// screen ("Session not found" / "Failed to join session") for bad codes.
		await gotoApp(page, "/tv/0000");
		await expectRendered(page, "/tv/0000");

		// No uncaught exceptions while handling the invalid code
		expect(pageErrors).toEqual([]);
		expect(consoleErrors).toEqual([]);
	});
});
