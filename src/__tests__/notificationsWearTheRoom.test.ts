import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A notification about a room shows the room.
 *
 * The card drew a line-art house before the room's name and a line-art tag
 * before its category, at 14px, in a chip under the text — the room's own
 * face, which every card on the rooms list wears, was nowhere on it. And
 * its buttons were its own: thin outlined pills in emerald and red that
 * matched nothing else in the app (owner: "show per notification more
 * largely to fit room icons in notifications, now it shows some mini
 * lined icons we don't need them, show category - as just text - category
 * title - no icon needed, use same play button what we use on cards, make
 * each notification more big and inviting").
 *
 * The chip is the room now: its face at 48px — its own icon, else the one
 * dealt from the shared pool by room id, exactly as the rooms list does —
 * its name, and its category as words alone. The buttons are the room
 * cards' own pills: mint for yes and Play, the unfilled one for no. The
 * card is a size larger throughout.
 */
const card = readFileSync(join(process.cwd(), "src/components/notifications/CompactNotificationCard.tsx"), "utf8");

describe("the room chip", () => {
  it("wears the room's face, at a size that reads", () => {
    expect(card).toMatch(/<img\s+src=\{roomIcon\}\s+alt=""\s+draggable=\{false\}\s+className="h-12 w-12 shrink-0 rounded-xl object-cover"/);
  });

  it("deals a face to a room without one, from the pool every card uses", () => {
    expect(card).toMatch(/import \{ useRoomIconPool \} from "@\/hooks\/useRoomIconPool";/);
    expect(card).toMatch(/import \{ dealtRoomIcon \} from "@\/utils\/roomCrests";/);
    expect(card).toMatch(/\|\| \(roomId \? dealtRoomIcon\(roomId, roomIconPool\) : null\)/);
  });

  it("names the category in words alone — no line-art house, no tag", () => {
    expect(card).not.toMatch(/\bHome\b|\bTag\b/);
    expect(card).toMatch(/\{lounge \? t\(lounge\.labelKey\) : categoryName\}/);
    expect(card).toMatch(/<p className="truncate text-\[15px\] font-semibold leading-5 text-foreground">\{roomName\}<\/p>/);
  });

  it("leads with the person, and lets the room take the slot only when nobody sent it", () => {
    expect(card).toMatch(/if \(roomIcon && !senderName && !avatarUrl\) \{/);
  });
});

describe("the buttons are the room cards' own", () => {
  it("yes is mint, no is the unfilled pill", () => {
    expect(card).toMatch(/import \{ RoomCardPlayButton \} from "@\/components\/team\/RoomCardPlayButton";/);
    expect(card).toMatch(/<RoomCardPlayButton\s+tone="mint"\s+onClick=\{handleAcceptClick\}/);
    expect(card).toMatch(/<RoomCardPlayButton\s+tone="outline"\s+onClick=\{handleDeclineClick\}/);
    expect(card).toMatch(/<Check className="w-3\.5 h-3\.5" strokeWidth=\{3\} \/>/);
    expect(card).toMatch(/<X className="w-3\.5 h-3\.5" strokeWidth=\{3\} \/>/);
  });

  it("Play is the cards' Play, with the triangle", () => {
    expect(card).toMatch(/tone=\{isPlayButton \? "mint" : "outline"\}/);
    expect(card).toMatch(/\{isPlayButton && <Play className="w-3\.5 h-3\.5 fill-current" \/>\}/);
  });

  it("the thin emerald and red pills are gone", () => {
    expect(card).not.toMatch(/border-emerald-500\/50|border-destructive\/50|bg-emerald-500 text-white/);
  });
});

describe("the card is a size larger", () => {
  it("in its padding, its corners, its face and its type", () => {
    expect(card).toMatch(/"relative flex items-start gap-3\.5 px-4 py-4 transition-colors backdrop-blur-sm border border-border\/40 rounded-\[24px\]"/);
    expect(card).toMatch(/<Avatar className="w-12 h-12">/);
    expect(card).toMatch(/<p className="text-\[15px\] leading-5">/);
    expect(card).not.toMatch(/w-11 h-11/);
  });
});
