import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lobbyTabRadius, LOBBY_TAB, LOBBY_TAB_PILL, LOBBY_TAB_TRACK } from "@/components/notifications/NotificationTabs";

/**
 * The Activity screen's tabs are the lobby's tabs, and its answered pill is
 * its button.
 *
 * The strip was Radix's grey segmented control with a line icon per tab —
 * nothing like the "Game rules / Players" strip the player had just left in
 * the lobby. And a request already answered showed a pale green "Accepted"
 * chip where a mint pill had stood a moment before (owner: "show activity
 * tabs with styles what we have in our lobby game rules / players tab and
 * make sure buttons are matched too, 'accepted' button looks different,
 * make sure we have style consistency here").
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const strip = read("src/components/notifications/NotificationTabs.tsx");
const lobby = read("src/components/lobby/UniversalLobby.tsx");
const card = read("src/components/notifications/CompactNotificationCard.tsx");

describe("the strip", () => {
  it("is the lobby's track, tab and pill, class for class", () => {
    // The lobby draws its own inline (with a sticky offset in front); the
    // strip's constants must read the same classes so the two cannot drift.
    expect(lobby).toContain(LOBBY_TAB_TRACK);
    expect(lobby).toContain(LOBBY_TAB);
    expect(lobby).toContain(LOBBY_TAB_PILL);
    expect(strip).toMatch(/layoutId="activity-tab-pill"/);
    expect(strip).toMatch(/active \? "font-bold" : "font-normal"/);
  });

  it("scoops the outer corner of the first and last tab, like the lobby's", () => {
    expect(lobbyTabRadius(0, 2)).toBe("rounded-tl-[24px] rounded-tr-[24px] rounded-br-[24px] rounded-bl-[54px]");
    expect(lobbyTabRadius(1, 2)).toBe("rounded-tl-[24px] rounded-tr-[24px] rounded-bl-[24px] rounded-br-[54px]");
    // A third tab (public sharing on) sits plain between them.
    expect(lobbyTabRadius(1, 3)).toBe("rounded-[24px]");
    expect(lobbyTabRadius(2, 3)).toBe("rounded-tl-[24px] rounded-tr-[24px] rounded-bl-[24px] rounded-br-[54px]");
    expect(lobby).toContain(lobbyTabRadius(0, 2));
    expect(lobby).toContain(lobbyTabRadius(1, 2));
  });

  it("carries no line icons and no Radix", () => {
    expect(strip).not.toMatch(/lucide-react|@\/components\/ui\/tabs|TabsTrigger/);
  });

  it("keeps the unread badge, sized to the lobby's type", () => {
    expect(strip).toMatch(/\{count > 0 && <span className=\{BADGE\}>\{count\}<\/span>\}/);
    expect(strip).toMatch(/min-w-\[20px\] h-\[20px\]/);
  });

  it("leaves room under its 8px foot in both callers", () => {
    expect(read("src/pages/Notifications.tsx")).toMatch(/px-4 pt-3 pb-5 max-w-\[700px\]/);
    expect(read("src/components/home/NotificationsPanel.tsx")).toMatch(/<div className="px-4 pt-3 pb-5">\s*<NotificationTabs/);
  });
});

describe("the answered pill", () => {
  it("is the question's own button, settled", () => {
    expect(card).toMatch(/<RoomCardPlayButton\s+tone=\{actionTaken === 'accepted' \? "mint" : "outline"\}\s+aria-disabled\s+tabIndex=\{-1\}\s+className="pointer-events-none mt-3 min-h-\[40px\] px-5"/);
    expect(card).not.toMatch(/bg-emerald-500\/20 text-emerald-600/);
    expect(card).not.toMatch(/<span className="text-base">✓<\/span>/);
  });
});
