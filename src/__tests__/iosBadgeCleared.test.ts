import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Opening the app must take the badge off the icon.
 *
 * Every push this app sends carries `aps.badge = 1`. APNs reads that as the
 * badge's new *value*, not as an increment, so one notification pins the icon
 * at 1 and each later one re-pins it to the same 1.
 *
 * iOS never clears a badge on its own — not when the app is opened, not when
 * the notification is read, not when it is swiped away. The app has to set it
 * to zero. Nothing did, so the first push a player ever received left a
 * permanent red 1 on their home screen. Reported exactly that way: always one
 * notification, nothing unread when you open it.
 *
 * This is asserted against the source because the fix lives in Swift, which
 * no test in this project runs. The reason to pin it anyway is that
 * `AppDelegate.swift` is a Capacitor **template** file: `npx cap add ios`
 * writes it from scratch, with these methods as empty stubs. A regenerated
 * iOS project would silently restore the permanent badge, and the symptom
 * only shows up on a device, days later, after a push.
 */
const APP_DELEGATE = join(process.cwd(), "ios/App/App/AppDelegate.swift");

describe("the iOS app clears its notification badge", () => {
  const source = readFileSync(APP_DELEGATE, "utf8");

  it("clears the badge when the app becomes active", () => {
    // Becoming active, not launching: the common case is an app already
    // running in the background, which never launches again.
    const method = source.match(
      /func applicationDidBecomeActive\([\s\S]*?\n {4}\}/
    );
    expect(method, "expected applicationDidBecomeActive in AppDelegate").not.toBeNull();
    expect(
      method![0],
      "applicationDidBecomeActive must clear the badge, or every push leaves a permanent 1 on the icon"
    ).toMatch(/clearNotificationBadge\(\)/);
  });

  it("sets the badge to zero through an API that exists on iOS 15", () => {
    const helper = source.match(/private func clearNotificationBadge\(\)[\s\S]*?\n {4}\}/);
    expect(helper, "expected the clearNotificationBadge helper").not.toBeNull();

    // setBadgeCount is iOS 16+; the project deploys to 15.0, so the older
    // property has to remain as the fallback behind an availability check.
    expect(helper![0]).toMatch(/#available\(iOS 16\.0, \*\)/);
    expect(helper![0]).toMatch(/setBadgeCount\(0, withCompletionHandler: nil\)/);
    expect(helper![0]).toMatch(/applicationIconBadgeNumber = 0/);
  });

  it("imports the framework the modern call needs", () => {
    // UNUserNotificationCenter is in UserNotifications, which the Capacitor
    // template does not import.
    expect(source).toMatch(/^import UserNotifications$/m);
  });
});

/**
 * The other half of the same story: the badge number the server sends.
 *
 * Left at 1 deliberately. With the clear above it now means "something arrived
 * since you last opened the app", which is true and useful. Making it a real
 * count would need per-player unread state on the server, which does not
 * exist. What must not happen is a payload that badges without the app being
 * able to unbadge — so if this number is ever made dynamic, the clear above is
 * what keeps it honest.
 */
describe("the push payload's badge", () => {
  it("still sends a badge, so the clear above has something to clear", () => {
    const payload = readFileSync(
      join(process.cwd(), "supabase/functions/_shared/pushPayload.ts"),
      "utf8"
    );
    expect(payload).toMatch(/badge:\s*\d+/);
  });
});
