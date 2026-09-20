import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every button in the notification centre says what became of it.
 *
 * Accept and Decline have always written `data.action_taken`, which is what
 * makes those cards settle into a line of text. The single-action cards —
 * Play, View, Open — wrote nothing at all, so a game invitation kept its
 * green Play for ever, looking exactly as it had before it was pressed
 * (owner: "if i played, notification should show relevant text not same
 * green play button ... overall when we click some buttons in notification
 * centre we should show it - like we have on: accepted, declined").
 *
 * So the press is recorded, the button becomes a word, and the card stays
 * tappable — a room you have played is still a room you may want back.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const card = read("src/components/notifications/CompactNotificationCard.tsx");
const context = read("src/contexts/NotificationsContext.tsx");
const SCREENS = ["src/pages/Notifications.tsx", "src/components/home/NotificationsPanel.tsx"];

describe("recording that a button was pressed", () => {
  it("is one function on the context, beside the one that marks a card read", () => {
    expect(context).toMatch(/markActionTaken: \(notificationId: string, taken: string\) => Promise<void>;/);
    expect(context).toMatch(/const markActionTaken = useCallback\(async \(notificationId: string, taken: string\) => \{/);
    // Merged into what the row already carries — room ids, sender names,
    // everything the card reads to draw itself.
    expect(context).toMatch(/const data = \{ \.\.\.current, action_taken: taken \};/);
  });

  it("is handed to the card by both screens", () => {
    for (const p of SCREENS) {
      expect(read(p), p).toMatch(/onActionTaken=\{\(id, taken\) => void markActionTaken\(id, taken\)\}/);
      expect(read(p), p).toMatch(/markAsRead, markActionTaken,/);
    }
  });

  it("says which button it was, in the past tense", () => {
    expect(card).toMatch(/onActionTaken\?\.\(notification\.id, isPlayButton \? 'played' : 'opened'\);/);
    // Only once — a card that has settled does not settle again.
    expect(card).toMatch(/if \(!hasActionTaken\) onActionTaken/);
  });

  it("from the button and from the row, which are the same press", () => {
    expect(card).toMatch(/const handleSingleAction = \(e: React\.MouseEvent\) => \{\s*\n\s*e\.stopPropagation\(\);\s*\n\s*recordSingleAction\(\);/);
    expect(card).toMatch(/if \(hasSingleAction\) recordSingleAction\(\);/);
  });
});

describe("what the card shows afterwards", () => {
  it("stops offering the button", () => {
    expect(card).toMatch(
      /const hasSingleAction =\s*\n\s*\(isRoomInvite \|\| isGameStarted \|\| isGameResult \|\| isTriviaLikedOrSaved\) &&\s*\n\s*!hasDualActions &&\s*\n\s*!hasActionTaken;/,
    );
  });

  it("and says the word instead, through the same settled line as Accepted", () => {
    // One block draws every settled card: the pair's answer and the single
    // button's own press.
    expect(card).toMatch(/\{hasActionTaken && \(\s*\n\s*<p/);
    expect(card).toMatch(/actionTaken === 'played' \? \(/);
    expect(card).toMatch(/t\("extra\.notifPlayed"\)/);
    expect(card).toMatch(/actionTaken === 'opened' \? \(/);
    expect(card).toMatch(/t\("extra\.notifOpened"\)/);
    // Played reads as done-and-good, like Accepted; Opened is quieter.
    expect(card).toMatch(/actionTaken === 'accepted' \|\| actionTaken === 'played'\s*\n\s*\? "text-emerald-600"/);
  });

  it("has both words in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).toMatch(/notifPlayed: "[^"]+",/);
      expect(locale, lang).toMatch(/notifOpened: "[^"]+",/);
    }
  });

  it("but stays tappable — a room played is a room you may want back", () => {
    expect(card).toMatch(/if \(!hasDualActions\) \{/);
    expect(card).toMatch(/onNavigate\(notification\);/);
  });
});
