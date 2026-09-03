import UIKit
import Capacitor

/**
 * The app's bridge view controller, which exists for exactly one reason:
 * to register `AppTrackingPlugin`.
 *
 * ## Why this file has to exist
 *
 * Capacitor does not discover native plugins by scanning the Objective-C
 * runtime. `CapacitorBridge.registerPlugins()` reads `packageClassList` out of
 * the generated `capacitor.config.json` and registers only the classes named
 * there — and `cap sync` builds that list from the **npm packages** in
 * `package.json`. A plugin that lives in this Xcode target, as
 * `AppTrackingPlugin` does, is not an npm package and can never appear in it.
 *
 * Compiling the plugin is therefore not enough to make it callable, and
 * nothing warns that it isn't. `AppTrackingPlugin.swift` was in the Sources
 * build phase from the day it was written, and was never once reachable.
 *
 * ## Why it failed silently
 *
 * Worse than an error: `registerPlugin()` on the JS side falls back to the
 * `web` implementation when a plugin is missing from the native bridge — see
 * `createPluginMethod` in `@capacitor/core`, which returns `impl[prop]` rather
 * than throwing. `src/native/appTracking.ts` declares a web implementation
 * that answers `"unavailable"`, so `AppTracking.getStatus()` **resolved**,
 * with a plausible value, on a real device.
 *
 * `trackingService.checkStatus()` then stored `"unavailable"`, its `catch` —
 * holding the AdMob backstop — never ran, and `ensureTrackingConsent()`
 * returned early at `status !== "notDetermined"`. No explanation screen, no
 * system dialog, no log line. The ATT prompt could not appear on any build,
 * on any device, including a fresh install with tracking allowed system-wide.
 *
 * Registering the instance here is what makes the native path real. The
 * fall-through in `trackingService` is the second half of the fix: with both,
 * a future plugin that goes missing degrades to AdMob instead of going quiet.
 *
 * `capacitorDidLoad()` runs immediately after the bridge is constructed and
 * before the webview loads, so the plugin is in place before any JS can call
 * it.
 */
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppTrackingPlugin())
    }
}
