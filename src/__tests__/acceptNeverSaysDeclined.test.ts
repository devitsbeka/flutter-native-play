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
      expect(src, p).toMatch(/action_taken: joinAnswerTaken\(outcome\),/);
      expect(src, p).not.toMatch(/outcome === 'approved' \? 'accepted' : 'declined'/);
      expect(src, p).toMatch(/if \(outcome === 'gone'\) toast\.info\(t\("extra\.notifRequestGone"\)\);/);
    }
  });

  it("draws the withdrawn knock in its own words, in the settled pill", () => {
    expect(card).toMatch(/as 'accepted' \| 'declined' \| 'gone' \| undefined/);
    expect(card).toMatch(/\) : actionTaken === 'declined' \? \(/);
    expect(card).toMatch(/t\("extra\.notifRequestGone"\)/);
  });

  it("has the words in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/notifRequestGone: "[^"]+",/);
    }
  });
});
