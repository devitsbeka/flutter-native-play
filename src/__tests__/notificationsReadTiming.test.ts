import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A notification stays unread until the player is done with it.
 *
 * The notifications screen used to mark everything read 500ms after it
 * opened. The per-tab counts on the Games and Friends tabs therefore cleared
 * themselves while the player was still looking at them — a row was unread one
 * moment and plain the next, without being touched.
 *
 * Measured in a browser against the real screen with three unread rows, before
 * and after:
 *
 *   old   4s after opening   badges ["Games","Friends"]    1 mark-read call
 *   new   4s after opening   badges ["Games2","Friends1"]  0 mark-read calls
 *   new   switching tabs     badges ["Games","Friends1"]   1 call, that tab only
 *   new   leaving the screen                               1 call, the rest
 *
 * Everything still ends up read, because the bell counts every unread
 * notification and a tab that could never be cleared would keep it lit. What
 * changed is when.
 *
 * Asserted against the source: there is no component-render harness in this
 * project, and the browser probe above is not something the suite can run.
 */
const page = readFileSync(join(process.cwd(), "src/pages/Notifications.tsx"), "utf8");

describe("when the notifications screen marks things read", () => {
  it("does not mark anything read just for opening", () => {
    // The exact shape of the bug: a timer that fires markAllAsRead shortly
    // after mount, with no interaction in between.
    const timerMarkAll = /setTimeout\(\s*\(\)\s*=>\s*\{?\s*(void\s+)?markAllAsRead\(\)/;
    expect(
      page,
      "marking everything read on a timer clears the tab counts while the player is reading them"
    ).not.toMatch(timerMarkAll);
  });

  it("clears the tab being left, not the one being opened", () => {
    // markManyAsRead, not markAllAsRead: switching Games -> Friends must not
    // clear the Friends badge the player is switching towards.
    expect(page).toMatch(/const leaveTab\s*=/);
    expect(page).toMatch(/markManyAsRead/);
    expect(page, "the Tabs control must go through the handler that clears the old tab")
      .toMatch(/onValueChange=\{\(v\)\s*=>\s*handleTabChange\(/);
  });

  it("clears whatever is left when the screen closes", () => {
    // Including a tab that was never opened — otherwise the bell stays lit.
    const cleanup = page.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?pendingLeaveRead[\s\S]*?\}, \[\]\);/);
    expect(cleanup, "expected the unmount effect that reads the remainder").not.toBeNull();
    expect(cleanup![0]).toMatch(/markAllAsRead\(\)/);
  });

  it("survives StrictMode's double mount", () => {
    // React 18 runs every effect mount -> cleanup -> mount in development. An
    // unmount cleanup that marked everything read immediately would fire a
    // beat after this screen opened — reinstating the bug, and only in the
    // environment where it gets tested. Deferring it and cancelling on the
    // second mount is what makes the cleanup mean "really left".
    expect(page).toMatch(/let pendingLeaveRead/);
    const cleanup = page.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?pendingLeaveRead[\s\S]*?\}, \[\]\);/)![0];
    expect(cleanup, "the pending read must be cancelled when the screen mounts again")
      .toMatch(/clearTimeout\(pendingLeaveRead\)/);
    expect(cleanup, "the read must be deferred, or StrictMode's cleanup fires it for real")
      .toMatch(/setTimeout\(/);
  });
});

/**
 * The bulk mark exists so a tab switch is one request, not one per row, and so
 * it can target a set rather than everything unread.
 */
describe("markManyAsRead", () => {
  const context = readFileSync(join(process.cwd(), "src/contexts/NotificationsContext.tsx"), "utf8");

  it("updates the given ids in a single request", () => {
    const fn = context.match(/const markManyAsRead = useCallback\([\s\S]*?\n {2}\}, \[user\]\);/);
    expect(fn, "expected markManyAsRead in the notifications context").not.toBeNull();
    expect(fn![0], "must scope to the ids it was given").toMatch(/\.in\('id', ids\)/);
    expect(fn![0], "must stay scoped to this user's rows").toMatch(/\.eq\('user_id', user\.id\)/);
  });
});
