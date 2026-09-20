import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { joinAnswerTaken } from "@/hooks/useRoomJoinRequests";

/**
 * Accept never says Declined.
 *
 * A knock on a room is answered from more than one place — the lobby's
 * doorstep, the gate on any screen, the notification's own buttons — and
 * the notification keeps its buttons up whichever answered first. Its
 * answer helper looked for a PENDING row only and said "gone" when there
 * was none, and both screens then stamped the card with whatever "gone"
 * was not: "Declined". A host who let someone in from the lobby and then
 * tapped Accept on the notification read "Declined" (owner: "when i click
 * accept it says denied, check ... how the hell accept means deny?").
 *
 * The helper reads the latest row whatever its status now and answers
 * with what HAPPENED; the screens record exactly that; and a knock that
 * was withdrawn — the one case with no answer at all — is said in its own
 * words on the card, not as either of them.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hook = read("src/hooks/useRoomJoinRequests.ts");
const card = read("src/components/notifications/CompactNotificationCard.tsx");

describe("the answer helper", () => {
  it("reads the latest row whatever became of it, not only a pending one", () => {
    expect(hook).toMatch(/\.select\("id, status"\)\s*\.eq\("room_id", roomId\)\s*\.eq\("user_id", requesterId\)\s*\.order\("created_at", \{ ascending: false \}\)\s*\.limit\(1\)\s*\.maybeSingle\(\);/);
    expect(hook).not.toMatch(/\.eq\("status", "pending"\)\s*\.maybeSingle\(\);\s*if \(!req\) return "gone";/);
  });

  it("answers with what happened when the knock was answered elsewhere", () => {
    expect(hook).toMatch(/if \(req\.status === "approved"\) return "approved";/);
    expect(hook).toMatch(/if \(req\.status === "declined" \|\| req\.status === "blocked"\) return "declined";/);
    // Only then the RPC, and only for a row still pending.
    expect(hook).toMatch(/if \(req\.status !== "pending"\) \{[\s\S]*?return "gone";\s*\}\s*const \{ error \} = await supabase\.rpc\("respond_room_join"/);
  });
});

describe("what the card records", () => {
  it("is the answer, and a third word for a knock withdrawn — never Declined for Accept", () => {
    expect(joinAnswerTaken("approved")).toBe("accepted");
    expect(joinAnswerTaken("declined")).toBe("declined");
    expect(joinAnswerTaken("gone")).toBe("gone");
  });

  it("is written through that mapping on both screens, with the withdrawn case said out loud", () => {
    for (const p of ["src/components/home/NotificationsPanel.tsx", "src/pages/Notifications.tsx"]) {
      const src = read(p);
      // The write moved into settleJoinNotifications, which stamps every
      // card about this knock rather than only the one that was tapped. The
      // mapping is still what is written, and still visible at the call site.
      expect(src, p).toMatch(/taken: joinAnswerTaken\(outcome\),/);
      expect(src, p).not.toMatch(/outcome === 'approved' \? 'accepted' : 'declined'/);
      expect(src, p).toMatch(/if \(outcome === 'gone'\) toast\.info\(t\("extra\.notifRequestGone"\)\);/);
    }
  });

  /**
   * The mirror of the bug above, reported the other way round: "if i click
   * decline it still shows accepted".
   *
   * One knock can leave two cards. Answering settled only the tapped one, so
   * the other kept live buttons pointed at a row that was no longer pending —
   * and the helper, correctly, answers those with what already happened. A
   * Decline then stamped "Accepted".
   */
  describe("a second card about the same knock", () => {
    it("is settled by the first answer, so it cannot disagree with it", () => {
      expect(hook).toMatch(/export async function settleJoinNotifications\(opts: \{/);
      expect(hook).toMatch(/\.eq\("type", "room_join_request"\)/);
      expect(hook).toMatch(/\.eq\("data->>room_id", roomId\)/);
      expect(hook).toMatch(/\.eq\("data->>requester_id", requesterId\)/);
      // The tapped card is settled even if that match misses it.
      expect(hook).toMatch(/if \(!byId\.has\(notificationId\)\) \{/);
    });

    it("and a tap that lands on an answered knock says so, not the opposite word", () => {
      for (const p of ["src/components/home/NotificationsPanel.tsx", "src/pages/Notifications.tsx"]) {
        const src = read(p);
        expect(src, p).toMatch(
          /const contradicted =\s*\n\s*\(approve && outcome === 'declined'\) \|\| \(!approve && outcome === 'approved'\);/,
        );
        expect(src, p).toMatch(/else if \(contradicted\) toast\.info\(t\("extra\.notifRequestAlreadyAnswered"\)\);/);
      }
    });
  });

  it("draws the withdrawn knock in its own words, in the settled line", () => {
    // The union grew: a single-action card records its own press too
    // (Played, Opened), and every one of them settles through this block.
    expect(card).toMatch(/\| 'gone'/);
    expect(card).toMatch(/\) : actionTaken === 'declined' \? \(/);
    expect(card).toMatch(/t\("extra\.notifRequestGone"\)/);
  });

  it("has the words in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/notifRequestGone: "[^"]+",/);
    }
  });
});
