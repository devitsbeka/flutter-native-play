import { defineConfig } from "@playwright/test";

// Serves the prebuilt dist/ via vite preview — run `vite build` before `playwright test`.
export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	expect: { timeout: 10_000 },
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4173",
		viewport: { width: 1920, height: 1080 },
		launchOptions: {
			executablePath: "/opt/pw-browsers/chromium",
		},
	},
	webServer: {
		command: "npx vite preview --port 4173 --strictPort --host 127.0.0.1",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: true,
		timeout: 180_000,
	},
});
