import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// Serves the prebuilt dist/ via vite preview — run `vite build` before `playwright test`.

// Some sandboxes ship a prebuilt Chromium at a fixed path and block the
// browser download. CI installs its own via `playwright install`, where this
// path does not exist — so only pin it when it is actually there, otherwise
// Playwright resolves its own browser as normal.
const PREINSTALLED_CHROMIUM = "/opt/pw-browsers/chromium";
const launchOptions = existsSync(PREINSTALLED_CHROMIUM)
	? { executablePath: PREINSTALLED_CHROMIUM }
	: {};

export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	expect: { timeout: 10_000 },
	reporter: "list",
	// A smoke failure must mean the build is broken, not that the runner was
	// briefly slow — but never let `.only` slip into a deploy gate.
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// 14 route smokes serially would dominate the deploy; they are read-only
	// and share no state, so they parallelise safely.
	workers: 4,
	use: {
		baseURL: "http://127.0.0.1:4173",
		viewport: { width: 1920, height: 1080 },
		// The app holds open Supabase/PostHog connections, so navigation is
		// resolved on domcontentloaded (see gotoApp) — this is the ceiling for
		// the bundle parsing and the tree mounting, not for the network.
		navigationTimeout: 45_000,
		launchOptions,
	},
	webServer: {
		command: "npx vite preview --port 4173 --strictPort --host 127.0.0.1",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
	},
});
