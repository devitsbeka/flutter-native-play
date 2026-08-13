import { test, expect } from "@playwright/test";
import { gotoApp } from "./smoke-helpers";

// The app calls toast() in ~580 places to explain itself — a failed upload, a
// spent limit, a saved change. None of it had ever reached a screen, because
// no <Toaster /> was mounted to render it: sonner's toast() queues into a host
// that does not exist, and returns without complaint.
//
// The symptom was every silent failure in the app looking identical to a dead
// button — "it loads for a second and does nothing". Nothing in a typecheck, a
// unit test or a build notices that a toast never appeared, so it is asserted
// here on the route a cold visitor lands on.
//
// This checks the host, not a rendered toast: sonner creates the list element
// only once a toast is live, and a production bundle has no module specifier
// to raise one through. The region below is rendered by <Toaster /> on mount
// and by nothing else, so its absence means the messages have nowhere to land.

test("the toast host is mounted, so raised messages have somewhere to land", async ({ page }) => {
	await gotoApp(page, "/");

	await expect(page.locator('section[aria-label*="Notifications"]')).toHaveCount(1);
});
