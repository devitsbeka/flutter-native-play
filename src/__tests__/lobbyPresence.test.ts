import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The lobby says who is actually there.
 *
 * A host sends an invite and then waits — and the scoreboard gave them
 * nothing to wait for. Every avatar looked the same whether its owner was
 * asleep or had just opened the app in answer to the invite, so the only way
 * to find out was to keep asking. The rooms list had shown presence for
 * months; the room itself never did.
 *
 * Two facts, drawn together: a ring that is a state (on while they are in the
 * app) and a flare that is an event (once, at the moment they arrive).
 */
const scoreboard = readFileSync(
  join(process.cwd(), "src/components/team/RoomScoreboard.tsx"),
  "utf8"
);
const hook = readFileSync(
  join(process.cwd(), "src/hooks/useParticipantPresence.ts"),
  "utf8"
);

describe("the green ring", () => {
  it("follows presence, not membership", () => {
    expect(scoreboard).toMatch(/isOnline=\{!isInvited && online\.has\(p\.user_id\)\}/);
  });

  it("is drawn on both layouts", () => {
    // The two-player VS layout and the ranked list are separate markup; a
    // player must not be green on one and grey on the other. One ring each:
    // PresenceAvatar for the list, VsPlayer for the face-off, and VsPlayer
    // is now drawn twice rather than written out twice.
    const rings = scoreboard.match(/ring-2 ring-emerald-400/g) ?? [];
    expect(rings.length, "expected PresenceAvatar and VsPlayer").toBe(2);
    expect(scoreboard, "VsPlayer must carry it, not one of its two call sites")
      .toMatch(/function VsPlayer\([\s\S]*?ring-2 ring-emerald-400/);
  });

  it("stays off for a placeholder who never arrived", () => {
    // They have no presence to speak of, and a ring would say they are here.
    expect(scoreboard).toMatch(/isOnline=\{!isInvited &&/);
  });
});

describe("the arrival flare", () => {
  it("lasts long enough to be seen", () => {
    // 1.6s, rising and falling in one motion, is over before a phone in a
    // pocket is looked at. Three and a half, shaped to hold: fast ramp,
    // a plateau that is actually visible, slow fade into the steady ring.
    const m = scoreboard.match(/const ARRIVAL_GLOW = \{ duration: ([\d.]+), times: \[([^\]]+)\] \}/);
    expect(m, "expected a shared ARRIVAL_GLOW timing").not.toBeNull();
    const seconds = Number(m![1]);
    expect(seconds).toBeGreaterThanOrEqual(3);
    expect(seconds).toBeLessThanOrEqual(4);

    // Four stops, not three: the middle pair is the plateau. Three stops is
    // a blink however long you make it.
    const times = m![2].split(",").map((n) => Number(n.trim()));
    expect(times.length, "a plateau needs two stops at full brightness").toBe(4);
    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBe(1);
  });

  it("is one timing shared by both layouts", () => {
    // Two copies of a duration is two durations waiting to disagree.
    const uses = scoreboard.match(/ARRIVAL_GLOW/g) ?? [];
    expect(uses.length, "the constant and one use per layout").toBe(3);
  });

  it("fires on arrival and not on every render", () => {
    expect(scoreboard).toMatch(/justArrived=\{!isInvited && arrived\.has\(p\.user_id\)\}/);
    const avatar = scoreboard.match(/function PresenceAvatar\([\s\S]*?\n\}\n\nexport function RoomScoreboard/)![0];
    expect(avatar, "the flare is a keyframed box-shadow, not a permanent glow")
      .toMatch(/boxShadow: \[/);
    expect(avatar, "it must settle back to nothing")
      .toMatch(/: \{ boxShadow: "0 0 0px 0px rgba\(52,211,153,0\)" \}/);
  });
});

/**
 * The tick under an invited player means "asked, and waiting". Once they are
 * in the app the waiting is over, and their avatar says so far better than a
 * tick does — so the tick retires itself rather than sitting under somebody
 * who has plainly arrived.
 */
describe("the sent tick", () => {
  it("retires when the player arrives", () => {
    const button = scoreboard.match(/function InvitePlayerButton\([\s\S]*?\n\}\n\n\/\*\*/)![0];
    expect(button).toMatch(/const showSent = sent && !isOnline;/);
    expect(button, "the tick, its colour and its disabled state all follow the same fact")
      .toMatch(/disabled=\{sending \|\| showSent\}/);
  });

  it("is derived, not cleared by an effect", () => {
    // An effect clearing `sent` would fire for a host who invites somebody
    // already online, so the tick would appear and vanish; deriving it means
    // it simply never appears in that case, which is the truth.
    const button = scoreboard.match(/function InvitePlayerButton\([\s\S]*?\n\}\n\n\/\*\*/)![0];
    expect(button, "no useEffect belongs in this button").not.toMatch(/useEffect/);
  });

  it("leaves the button pressable again afterwards", () => {
    // They came, they went, the host wants to call them back.
    const button = scoreboard.match(/function InvitePlayerButton\([\s\S]*?\n\}\n\n\/\*\*/)![0];
    expect(button).not.toMatch(/disabled=\{sending \|\| sent\}/);
  });

  it("knows whether the player is online on both layouts", () => {
    const uses = scoreboard.match(/<InvitePlayerButton[\s\S]{0,400}?\/>/g) ?? [];
    expect(uses.length).toBe(2);
    for (const use of uses) expect(use).toMatch(/isOnline=\{/);
  });
});

describe("how presence is fetched", () => {
  it("asks only about the people on this board", () => {
    // useOnlineUsers pulls every online account in the app and joins profiles
    // onto all of them. That is a lot of rows so a lobby can ring four faces.
    expect(hook).toMatch(/\.in\("user_id", ids\)/);
    expect(scoreboard).toMatch(/useParticipantPresence\(participantIds\)/);
  });

  it("uses the same online rule as the rooms list", () => {
    // Two minutes and status online — otherwise a player is green on one
    // screen and grey on the other.
    expect(hook).toMatch(/ONLINE_WINDOW_MS = 2 \* 60 \* 1000/);
    expect(hook).toMatch(/\.eq\("status", "online"\)/);
  });

  it("re-checks on a timer as well as on realtime", () => {
    // A heartbeat going stale is the absence of an event: nothing would ever
    // arrive to say they had left, so the ring would stay lit all night.
    expect(hook).toMatch(/setInterval\(run, RECHECK_MS\)/);
  });

  it("does not resubscribe on every parent render", () => {
    // participants is a fresh array each render. Keying the effect on it
    // would tear down and rebuild the channel continuously.
    expect(hook).toMatch(/const key = useMemo\(\(\) => \[\.\.\.userIds\]\.sort\(\)\.join\(","\), \[userIds\]\)/);
  });

  it("computes arrivals against a ref, not against state", () => {
    // Comparing against `online` would put it in the callback's deps, and the
    // effect would resubscribe every time somebody's presence changed.
    expect(hook).toMatch(/previous\.current/);
    expect(hook).toMatch(/const fetchPresence = useCallback\([\s\S]*?\n {2}\}, \[key\]\);/);
  });
});

/**
 * The room's name and the host's controls used to be the first thing in the
 * scrolling area, so scrolling to the scoreboard meant the lobby stopped
 * saying which room it was, and the host's only route back to the pencil and
 * the palette was to scroll up and hunt for them.
 */
describe("the room name in the lobby", () => {
  const lobby = readFileSync(
    join(process.cwd(), "src/components/team/RoomLobbyV2.tsx"),
    "utf8"
  );

  /** Everything above the scrolling content area. */
  const header = lobby.slice(0, lobby.indexOf("{/* Scrollable content area"));
  const scroller = lobby.slice(lobby.indexOf("{/* Scrollable content area"));

  it("stays put while the players scroll", () => {
    // The rendered heading specifically — `roomName` is also handed to the
    // icon picker as a prop, further down the file and outside the scroller.
    const heading = /<h2[^>]*>\s*\{roomName\}/;
    expect(header, "the name row belongs to the header, which is shrink-0")
      .toMatch(heading);
    expect(scroller, "a heading left in the scroller would scroll away again")
      .not.toMatch(heading);
  });

  it("keeps the host's rename and background controls with it", () => {
    expect(header).toMatch(/onClick=\{\(\) => setShowIconPicker\(true\)\}/);
    expect(header).toMatch(/onClick=\{\(\) => setShowGradientPicker\(true\)\}/);
  });

  it("is not position:sticky", () => {
    // The root cancels #root's safe-top with a negative margin, and iOS
    // WebKit clamps sticky boxes that have one — which is what shoved this
    // header down a full safe-top the last time. Being outside the scroller
    // holds it in place for free.
    expect(header).not.toMatch(/className="[^"]*\bsticky\b/);
  });
});

/**
 * The two halves of the face-off used to drift apart.
 *
 * Each column was written out by hand, twice, and the row centred them
 * against each other — so a single extra control on one side (an add-friend
 * button the other player did not qualify for) slid that player's whole
 * column relative to their opponent. Measured in a browser against the app's
 * compiled CSS, with one side carrying the button and the other not:
 *
 *   old   avatar 14px apart   name 14px apart   score 14px apart
 *   new   avatar 0            name 0            score 0
 */
describe("the two-player face-off", () => {
  it("is one component drawn twice, not two copies", () => {
    // The copies were the cause, not the symptom: two blocks of markup that
    // nothing kept in step.
    expect(scoreboard).toMatch(/function VsPlayer\(/);
    const uses = scoreboard.match(/<VsPlayer\b/g) ?? [];
    expect(uses.length, "one per side").toBe(2);
    expect(scoreboard, "a second copy of the column would drift from the first")
      .not.toMatch(/const player = sortedParticipants\[/);
  });

  it("aligns the columns to their tops, not their centres", () => {
    // items-center is what let a taller column push its own contents up
    // relative to the other.
    expect(scoreboard).toMatch(/grid-cols-\[1fr_auto_1fr\] items-start/);
  });

  it("gives every row a height that does not depend on its contents", () => {
    const vs = scoreboard.match(/function VsPlayer\([\s\S]*?\n\}\n\nexport function RoomScoreboard/)![0];
    // The avatar's crown and ring both paint outside its box; a fixed
    // wrapper stops them moving where the name starts.
    expect(vs, "the avatar needs a fixed slot").toMatch(/relative h-16 w-16/);
    expect(vs, "a two-line name must not push one score below the other")
      .toMatch(/mt-2 h-5 w-full truncate/);
    expect(vs, "the score needs a fixed slot").toMatch(/mt-2 h-8 text-2xl/);
    expect(vs, "the action row shifted the columns whenever only one side had a button")
      .toMatch(/flex min-h-\[28px\] items-center/);
  });

  it("centres the swords against the avatars", () => {
    // Against the columns they drifted with whichever side was taller.
    // mt-2 is half the 64px avatar less half the 48px badge.
    expect(scoreboard).toMatch(/mt-2 flex flex-shrink-0 flex-col items-center/);
  });
});
