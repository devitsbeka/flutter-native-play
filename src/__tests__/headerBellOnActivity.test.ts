import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isOnActivityScreen, ACTIVITY_PATH } from "@/utils/activityRoute";

/**
 * The bell in the header opens the activity list as a sheet. On the activity
 * screen itself that is the same list a second time, over the page you are
 * already reading, with a close button on it — so tapping the bell read as a
 * no-op that had somehow produced another copy of the screen.
 *
 * It stays on show, because the unread count is the point and the header is
 * the only place it appears. It just stops being a control.
 *
 * Measured in a browser against the built app, with three unread rows:
 *
 *   /notifications   <div role="status">  badge 3   click: nothing opens
 *   /leaderboards    <button>             badge 3   click: the panel opens
 */
const source = readFileSync(
  join(process.cwd(), "src/components/shared/HeaderActions.tsx"),
  "utf8"
);

describe("where the bell leads", () => {
  it("recognises its own destination", () => {
    expect(isOnActivityScreen(ACTIVITY_PATH)).toBe(true);
  });

  it("is not fooled by a trailing slash", () => {
    // A redirect or a hand-typed URL can leave one, and the bell would go
    // back to opening a copy of the page.
    expect(isOnActivityScreen("/notifications/")).toBe(true);
  });

  it("leaves every other screen alone", () => {
    for (const path of ["/", "/leaderboards", "/discover", "/team", "/profile"]) {
      expect(isOnActivityScreen(path), `${path} should keep a working bell`).toBe(false);
    }
  });

  it("does not match a route that merely starts the same way", () => {
    // /notifications-settings is not the activity screen.
    expect(isOnActivityScreen("/notifications-settings")).toBe(false);
  });
});

describe("the bell itself", () => {
  it("becomes a readout on the activity screen", () => {
    expect(source).toMatch(/const isDestination = isOnActivityScreen\(pathname\)/);
    expect(source, "a div, not a button — there is nothing to press")
      .toMatch(/isDestination \? \(\s*\n[\s\S]{0,600}?role="status"/);
  });

  it("keeps the count in both states", () => {
    // The count is the whole reason it stays on screen.
    const badge = source.match(/const badge = unreadCount > 0 && \([\s\S]*?\n {2}\);/);
    expect(badge, "expected one badge shared by both states").not.toBeNull();
    const uses = source.match(/\{badge\}/g) ?? [];
    expect(uses.length, "the readout and the button each draw it").toBe(2);
  });

  it("drops the affordances along with the handler", () => {
    // A cursor and a hover lift on something that cannot be pressed is the
    // same lie in a quieter voice.
    const readout = source.match(/role="status"[\s\S]*?<\/div>/)![0];
    expect(readout).toMatch(/cursor-default/);
    expect(readout).not.toMatch(/whileHover|whileTap|onClick/);
  });

  it("still opens the panel everywhere else", () => {
    expect(source).toMatch(/onClick=\{\(\) => setShowNotificationsPanel\(true\)\}/);
  });
});

/**
 * The page reaches the bell through PageHeader's default, so the fix has to
 * live in HeaderActions — a page that forgot to pass something would get the
 * old behaviour back.
 */
describe("how the activity page gets its header", () => {
  it("uses PageHeader's default actions", () => {
    const page = readFileSync(join(process.cwd(), "src/pages/Notifications.tsx"), "utf8");
    expect(page).toMatch(/<PageHeader title=\{t\("extra\.notifActivity"\)\}/);
    expect(page, "nothing is passed, so the default is what must behave")
      .not.toMatch(/rightElements=/);
  });
});
