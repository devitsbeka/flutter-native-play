import { useLayoutEffect, useRef, useState, type ReactNode, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Bell, BellRing, Check, Loader2, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import { FooterHaze, TopHaze } from "@/components/shared/FooterHaze";
import bgBlob1 from "@/assets/tb-lobby/bg-blob-1.jpg";
import bgBlob2 from "@/assets/tb-lobby/bg-blob-2.png";
import chipTv from "@/assets/lobby/chip-tv.webp";
import crownIcon from "@/assets/lobby/crown.png";
import { resolveAvatarUrl, fallbackAvatarFor } from "@/utils/avatarUtils";
import { useContentModeration } from "@/hooks/useContentModeration";

/**
 * The one lobby every game mode opens into — Figma 1018:5815 (Game Rules)
 * and 1018:4416 (Players), built from that frame's own measures.
 *
 * It knows nothing about rooms. The three room kinds (classic, the King's
 * couch, the arena) each map their own state onto these props and keep
 * their own start, invite and seat logic; this file is the picture and the
 * two tabs. The scene behind the title is the render of the card that was
 * tapped to get here, blurred — which is what lets the card feel like it
 * grew into this screen rather than being replaced by it.
 */

export type LobbyTab = "rules" | "players";

export interface LobbyPlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  isHost: boolean;
  isYou: boolean;
  /** Absent where the mode keeps no per-player tally (the King's couch). */
  score?: number;
  rounds?: number;
  /** Invited but not yet arrived: shown faded. */
  pending?: boolean;
  /**
   * A seat nobody is in yet.
   *
   * The arena used to draw only the seats that were filled, so "two more
   * and we can start" was something you worked out by counting names
   * against a number in a different tab. An empty seat is drawn now — a
   * dashed slot on both benches, tappable on the one you may invite into.
   */
  empty?: boolean;
  /**
   * Wears the armband, marked on their own row.
   *
   * The couch used to state it underneath instead — a whole cell reading
   * "Captain: Beka", repeating a face and a name already in the list two rows
   * above it. Who the captain is belongs to that person's row.
   */
  isCaptain?: boolean;
  /** Tapping the armband — the vote, on the modes that elect one. */
  onCaptainPress?: () => void;
  /**
   * Seated, but not in the app.
   *
   * A room waits on people who have wandered off, and from inside it that
   * is invisible: their row looks exactly like everyone else's, so the
   * host waits, and waits. Marked here, with a bell that pings them back.
   */
  offline?: boolean;
  /** Ping an absent player. Absent when there is nobody to call. */
  onCall?: () => void;
  /**
   * The host's bin, on everybody else's row: a seated player, or an
   * invitation nobody answered. The room used to have no way to be rid of
   * a seat once it was filled — a wrong invite sat there until its owner
   * chose to leave (owner: "host should be able remove players from lobby,
   * show delete icon next to the players username"). Absent for guests,
   * for the host's own row, and once a round is under way.
   */
  onRemove?: () => void;
  /** For the row's tap: a profile, a seat menu. */
  onPress?: () => void;
  /**
   * A moment's note beside the name — "joined" as somebody arrives, "left"
   * as somebody goes (a departed player's row stays a few seconds to say
   * so). Animated in, so the eye is drawn to the change.
   */
  /** Only "left": the arrival note was dropped — see RoomLobbyV2. */
  note?: "left";
  /**
   * Not a friend yet: the + on the row that asks to be. Absent for friends,
   * for yourself, and wherever the mode has nobody real to befriend. People
   * meet in a room; this is where they become friends without leaving it.
   */
  onAddFriend?: () => void;
  /** Asked already, this visit: the + is a tick and takes no tap. */
  friendRequested?: boolean;
}

export interface LobbyRuleRow {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  /** Absent for a guest: the row shows the host's choice and takes no tap. */
  onChange?: (value: string) => void;
  /**
   * How the choice is offered. "segmented" (default) lays every option out
   * side by side — right for two or three. "dropdown" is for a long list
   * (the player count, 2–10) that a segmented control could never hold.
   */
  variant?: "segmented" | "dropdown";
}

export interface LobbyPlayerGroup {
  key: string;
  title?: ReactNode;
  players: LobbyPlayer[];
  /** Under the group's rows: the invite line for that side, for instance. */
  footer?: ReactNode;
}

export interface UniversalLobbyProps {
  /** The tapped card's render — becomes the blurred scene behind the title. */
  sceneArt: string;
  roomName: string;
  /**
   * The face of the room, beside its name.
   *
   * A lobby used to open on a name and nothing else, so the three kinds of
   * room looked identical above the card — the same lilac haze, the same
   * Slackey heading — and what game you had walked into was something you
   * worked out from the rows underneath. Each kind brings its own: the
   * King's crowned mascot, the arena's crate, and for an ordinary room the
   * icon it actually wears, which is the host's to change.
   */
  icon?: string | null;
  /** The host renames by tapping the name; a guest gets the name alone. */
  onRename?: () => void;
  onBack: () => void;
  unreadCount?: number;
  /** The bell. Without it the header's badge is decoration. */
  onBell?: () => void;
  /**
   * The category chip — the FIRST round only.
   *  - `label` is the first round's name, with a "(+N)" when more are queued.
   *  - `iconSlug` is that category's own icon (not a generic question mark).
   *  - `onPress` opens the round list (or the picker when there is one round).
   *  - `onAdd` (the + beside it) queues another round.
   */
  category?: {
    label: string;
    iconSlug?: string | null;
    /** "+5" — the extra rounds, shown at the FAR RIGHT of the chip. */
    trailing?: string;
    onPress?: () => void;
    onAdd?: () => void;
    /**
     * The host's ring: a gradient stroke travelling around the chip and
     * the +, so the way to add a round is found without looking (owner's
     * ask). Lit only while there is still a category to pick; once the
     * host has one it stops. The "+N" pops on its own as rounds are added,
     * for everyone.
     */
    glow?: boolean;
  };
  /**
   * What opens under the chip when it is tapped — the round list — as a
   * dropdown over a blurred lobby rather than a page of its own, so it
   * closes with a tap anywhere and nobody leaves the lobby to read it.
   */
  categoryMenu?: { open: boolean; onClose: () => void; children: ReactNode };
  /** Play on TV — rendered as a row inside the Game Rules tab, host only. */
  tv?: { label: string; onPress?: () => void };
  /** Copy for the two tabs. */
  labels: {
    rules: string;
    players: string;
    invite: string;
    you: string;
    /** "(0r)" — the rounds played, short. */
    rounds: (count: number) => string;
    /** Read out for the armband; the mark itself carries no text. */
    captain?: string;
    /** Read out for the bell. */
    notifications?: string;
    /** Read out for the bell on an absent player's row. */
    call?: string;
    /** Read out for the + that asks to be friends, and for the tick once asked. */
    addFriend?: string;
    friendRequested?: string;
    /** Read out for the host's bin on a player's row. */
    remove?: string;
    /** The note beside a name for a moment: somebody arrived, somebody left. */
    left?: string;
    /** Beside the name of somebody asked but not yet here. */
    invited?: string;
  };
  /**
   * How the benches are laid out.
   *
   * "stack" is one list under another, which is right for a lounge with a
   * single group. "columns" puts them side by side — the only way to read
   * two teams against each other, which on the arena is the whole question:
   * how many are on mine, how many on theirs, how many seats are left.
   */
  playersLayout?: "stack" | "columns";
  rules: LobbyRuleRow[];
  /**
   * The game, in words (Figma 1059:532): a small uppercase heading over a
   * paragraph, one section per thing worth knowing before you press Start.
   *
   * Every mode fills this in, and the reason is the room the design was
   * drawn against: the Rules tab used to be a column of dropdowns — how
   * many players, how many questions, play on TV — which is a settings
   * sheet, not the rules. What the game IS was never written down
   * anywhere, so a lobby only made sense to somebody who had already
   * played it. These are those sentences, and they come before the
   * controls.
   */
  rulesText?: { key: string; heading: string; body: string }[];
  /**
   * The stake, on a strip at the foot of the card: "Winner takes: 200".
   *
   * It was a rule row on the arena and a hand-built box on the King's
   * couch, in two different shapes, and on the other two modes it was not
   * said at all. One strip, on every lobby that plays for something.
   */
  reward?: { label: string; icon?: string; amount: ReactNode };
  /** Under the rule rows — a mode's own extra control. */
  rulesExtra?: ReactNode;
  /** One flat list, or the arena's two benches. */
  players: LobbyPlayer[] | LobbyPlayerGroup[];
  /** "Invite a friend — a game needs two players" — shown while it is true. */
  playersHint?: string | null;
  /**
   * What stands where the hint does once every seat is taken.
   *
   * The hint answers "how many more?", which a full room is not asking. The
   * arena puts its captain vote here instead — the one thing left to decide
   * before Start — and anything that gives none falls back to the capacity's
   * own "room full".
   */
  playersFullSlot?: ReactNode;
  /** Faces for the invite row: the player's friends, online first. */
  /**
   * Faces to draw on the invite line.
   *
   * Left empty by every lobby in the app, deliberately. It used to be handed
   * the player's first three friends as decoration, and in a room they were
   * not in that is indistinguishable from three people who ARE: same 36px
   * circle, same gradient ring the players wear, and a grey ring when
   * offline — which is the exact treatment an INVITED player gets. A host
   * who had just made an empty room saw their friends sitting in it (owner:
   * "I created a room and I see there invited friends already, I should
   * invite friends myself from scratch").
   *
   * Anyone actually in the room, invited included, is drawn in the players
   * list where they belong. This line is a button.
   */
  inviteFaces?: { url: string | null; online?: boolean }[];
  onInvite?: () => void;
  /** Under the players list — results of a challenge, for instance. */
  playersExtra?: ReactNode;
  /**
   * The game's seat limits: how many it needs, how many it holds, how many
   * are taken (pending invites hold a seat). Stated on the rules tab,
   * counted under the players, and the invite line stands down when full.
   */
  capacity?: {
    min: number;
    max: number;
    /** Seats spoken for — everyone here plus everyone invited. Caps the room. */
    taken: number;
    /**
     * The people actually HERE, when that differs from `taken`.
     *
     * The headline count read `taken`, which counts an invitation nobody has
     * accepted as a player. So a host alone with two invitations out read
     * "3/10 players" while Start stayed disabled, because starting counts
     * people who can answer (owner: "I CAN'T start the game, why is that?").
     * The number on screen has to be the number the button is judging.
     */
    seated?: number;
    fullLabel: string;
  };
  start: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    /** The reason a disabled button is disabled. */
    caption?: string | null;
    icon?: ReactNode;
    /**
     * Draw the caption alone.
     *
     * A guest's footer used to be a dead Start button with "waiting for the
     * host" underneath it — the room's one big call to action, greyed, in
     * front of somebody it will never be for. The line is the whole message.
     */
    captionOnly?: boolean;
    /**
     * The face waited on, shown right after the caption ("…host" then their
     * avatar) — so "waiting for the host" points at who that is.
     */
    captionAvatarUrl?: string | null;
    /** The waited-on name, for the avatar's fallback initial and alt text. */
    captionAvatarName?: string | null;
    /**
     * Breathe the caption, for a line that is waiting on somebody.
     *
     * "Waiting for the host to start…" is a state, not a label, and a line
     * that never moves reads as one more piece of furniture — a guest could
     * not tell whether the room was live or stuck. A slow fade says it is
     * still running without asking for attention the way a spinner does.
     * Off by default: a caption that tells the host to invite a friend is an
     * instruction, and instructions should hold still.
     */
    captionPulse?: boolean;
    /**
     * Draw the caption ABOVE the button even when the button is live.
     *
     * A guest's "Waiting for the host…" is the state of the room; "Invite
     * the host" is what they can do about it. State first, then the act
     * (owner: "show waiting for host above invite host button").
     */
    captionAbove?: boolean;
  };
  /** An error the host must read, or a guest's way out, beside the button. */
  footerExtra?: ReactNode;
  /**
   * Where footerExtra sits: above the button (an error to read before
   * pressing it) or below (a way out, after the way on). Above by default.
   */
  footerExtraPlacement?: "above" | "below";
  initialTab?: LobbyTab;
  /** Modals and sheets, rendered above everything. */
  children?: ReactNode;
}

/**
 * How far the footer's blur ramp reaches ABOVE the footer's own box.
 *
 * Must stay equal to the `top-[-120px]` on the haze layers below — a
 * Tailwind arbitrary value has to be a literal at build time, so the two
 * cannot be written from one source. The scroller pads by this on top of
 * the measured footer height; anything less and the last row ends up
 * inside the ramp.
 */
const FOOTER_HAZE_PX = 120;

const CARD_SHADOW = "shadow-[0px_2px_8px_0px_rgba(102,51,153,0.06),0px_8px_24px_0px_rgba(102,51,153,0.12)]";
const RULE_BORDER = "border border-[rgba(156,100,181,0.5)]";

/** The spring the whole screen arrives on; the chrome follows it in steps. */
const ARRIVE = { type: "spring", stiffness: 260, damping: 30 } as const;

function isGrouped(players: LobbyPlayer[] | LobbyPlayerGroup[]): players is LobbyPlayerGroup[] {
  return players.length > 0 && "players" in players[0];
}

export function UniversalLobby({
  sceneArt,
  roomName,
  icon,
  onRename,
  onBack,
  unreadCount = 0,
  onBell,
  category,
  categoryMenu,
  tv,
  labels,
  playersLayout = "stack",
  rules,
  rulesText,
  reward,
  rulesExtra,
  players,
  playersHint,
  playersFullSlot,
  inviteFaces = [],
  onInvite,
  playersExtra,
  capacity,
  start,
  footerExtra,
  footerExtraPlacement = "above",
  initialTab = "rules",
  children,
}: UniversalLobbyProps) {
  const [tab, setTab] = useState<LobbyTab>(initialTab);
  const reduceMotion = useReducedMotion();

  /**
   * How tall the round list may be: everything between the chip row and the
   * bottom inset.
   *
   * It used to be `100dvh` less the insets less a flat 145px — a guess at
   * where the chip row ends, made once against one phone. A guess has to be
   * generous to be safe, and this one cost the list two rows it had the room
   * for: six rounds on screen with the panel stopping well clear of the
   * lobby's own footer (owner's screenshot). Measuring the row is exact on
   * every screen, and the arithmetic that is genuinely CSS's — the home
   * indicator's inset — stays in the calc where env() can do it.
   */
  const categoryRowRef = useRef<HTMLDivElement>(null);
  /**
   * How far the body has to start below the frame's top to clear the chip.
   *
   * The body runs UP under the category chip now, the way it runs under the
   * footer, so what scrolls past the chip frosts into the haze instead of
   * being cut off at a line (owner: "use same blur in top while scrolling
   * what we use in bottom"). The chip row is measured — it is a row of
   * text, and text wraps — and the body pulls itself up by that much and
   * pads by the same, so nothing it holds starts under the chip; the sticky
   * tabs add it to their own offset for the same reason. Zero when there is
   * no chip: the body then starts where it always did.
   */
  const [chipClearance, setChipClearance] = useState(0);
  const hasChip = !!category;
  useLayoutEffect(() => {
    const el = categoryRowRef.current;
    if (!el) {
      setChipClearance(0);
      return;
    }
    // + 13 for the row's own mt-[13px].
    const update = () => setChipClearance(el.offsetHeight + 13);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasChip]);
  const [menuMaxHeight, setMenuMaxHeight] = useState<string | null>(null);
  const menuOpen = !!categoryMenu?.open;
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const measure = () => {
      const el = categoryRowRef.current;
      if (!el) return;
      // + 8 for the panel's own mt-2, - 16 so it never sits ON the inset.
      const top = Math.round(el.getBoundingClientRect().bottom) + 8;
      setMenuMaxHeight(`calc(100dvh - ${top}px - var(--safe-bottom, 0px) - 16px)`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [menuOpen]);


  // Each piece of chrome steps in a beat after the one above it; the scene
  // itself is already moving. Under Reduce Motion everything is simply there.
  const arrive = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { ...ARRIVE, delay },
        };

  /**
   * A blocked player is not drawn in the roster.
   *
   * Only the picture changes. The seat is still theirs — the room's capacity,
   * who may start and every score still counts them, because they really are
   * in the game and a lobby that lied about how many people were in it would
   * break the thing it was trying to protect. What blocking buys is that the
   * viewer does not have to look at their name and face for the length of a
   * match.
   *
   * Fails OPEN: this is a rendered list, and emptying every lobby for the
   * first moments of a session would be a far worse bug than a blocked name
   * showing for one render.
   */
  const { hiddenIds } = useContentModeration();
  const visible = (list: LobbyPlayer[]) =>
    hiddenIds.size === 0 ? list : list.filter((p) => !hiddenIds.has(p.id));

  const groups: LobbyPlayerGroup[] = isGrouped(players)
    ? players.map((g) => ({ ...g, players: visible(g.players) }))
    : [{ key: "all", players: visible(players as LobbyPlayer[]) }];

  // How tall the footer actually is, so the list above can stop clear of
  // it. It changes with the caption (one line, two, or none) and with the
  // keyboard's safe area, so it is observed rather than measured once.
  /**
   * Enough scroll room for the card to reach the chip.
   *
   * The tabs are sticky, but sticky only holds once the card has scrolled
   * up to their line, and a short list - two players, a rules tab - did not
   * reach it: the scroll ran out with the card in the middle of the screen
   * (owner: "when i switch to players scroll stops in the middle, make
   * sure scroll goes all the way up and sticks below the select category
   * row"). So a spacer after the body's column adds exactly the room the
   * card is short by: the card's offset from the scroller's top, less the
   * tabs' sticky line, less whatever the column already overflows. It sits
   * OUTSIDE the min-h-full column, so the at-rest layout - the card at the
   * foot of the screen - is what it was; the room is only there to scroll
   * into. Measured, because the card's height changes with the tab.
   */
  const scrollerRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [reachSpacer, setReachSpacer] = useState(0);
  /**
   * Why the tabs bar used to move when a tab was switched.
   *
   * The title block above the card is flex-1, so the card sits at the foot
   * of the screen - and a tab with less in it made a shorter card, which
   * the title block grew to keep at the foot, carrying the tabs bar down
   * with it. So on the first switch the title block is held at the height
   * it had, and from then on the card changes height at its BOTTOM only.
   * Held as min-height, so a longer room name still fits. Let go again when
   * the scroller itself changes size (a rotation), which re-lays the whole
   * screen anyway.
   */
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleHeight, setTitleHeight] = useState<number | null>(null);
  /**
   * Where the reader was when they switched tabs.
   *
   * Reading scrollTop after the switch is too late: laying out the shorter
   * card clamps it to the new end before any effect can look. So the
   * handler notes it first; the spacer is sized to hold that position, and
   * once the spacer is in the DOM the position is put back.
   */
  const keepScrollRef = useRef<number | null>(null);
  const switchTab = (next: LobbyTab) => {
    if (next === tab) return;
    if (titleHeight === null && titleRef.current) setTitleHeight(titleRef.current.offsetHeight);
    if (scrollerRef.current) keepScrollRef.current = scrollerRef.current.scrollTop;
    setTab(next);
  };
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  useLayoutEffect(() => {
    const node = footerRef.current;
    if (!node) return;
    const read = () => setFooterHeight(node.getBoundingClientRect().height);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  /**
   * The spacer is measured synchronously on a tab switch, and it also keeps
   * the scroll from clamping.
   *
   * A ResizeObserver reports after paint - one frame after a shorter tab
   * has shrunk the card, the browser has already clamped scrollTop to the
   * new end and the rows under the bar have jumped. Measuring in a layout
   * effect keyed on the tab happens before that paint. And when the reader
   * is scrolled past where the new content ends, the spacer holds that
   * room (scrollTop less the natural end) so nothing moves under the bar;
   * it gives the room back as they scroll up.
   */
  const computeReach = useCallback((): number | null => {
    const scroller = scrollerRef.current;
    const column = columnRef.current;
    const card = cardRef.current;
    if (!scroller || !column || !card) return null;
    const stickyLine = chipClearance + 10;
    const natural = column.offsetHeight + footerHeight + FOOTER_HAZE_PX - scroller.clientHeight;
    const need = card.offsetTop - stickyLine;
    const keep = Math.max(scroller.scrollTop, keepScrollRef.current ?? 0);
    return Math.max(0, Math.ceil(need - natural), Math.ceil(keep - natural));
  }, [chipClearance, footerHeight]);
  const measureReach = useCallback(() => {
    const v = computeReach();
    if (v !== null) setReachSpacer(v);
  }, [computeReach]);
  // On a tab switch, before paint: size the spacer to hold the position the
  // reader had. If it already does, put the position back right here.
  useLayoutEffect(() => {
    const v = computeReach();
    if (v === null) return;
    if (v !== reachSpacer) {
      setReachSpacer(v);
      return;
    }
    if (keepScrollRef.current !== null && scrollerRef.current) {
      scrollerRef.current.scrollTop = keepScrollRef.current;
      keepScrollRef.current = null;
    }
    // reachSpacer is read, not depended on: the effect is about the switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeReach, tab]);
  // ...and once the spacer that holds it is in the DOM, put it back.
  useLayoutEffect(() => {
    if (keepScrollRef.current === null || !scrollerRef.current) return;
    scrollerRef.current.scrollTop = keepScrollRef.current;
    keepScrollRef.current = null;
  }, [reachSpacer]);
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const column = columnRef.current;
    const card = cardRef.current;
    if (!scroller || !column || !card) return;
    let width = scroller.clientWidth;
    let height = scroller.clientHeight;
    const onResize = () => {
      // The screen itself changed shape: let the title block breathe again.
      if (scroller.clientWidth !== width || scroller.clientHeight !== height) {
        width = scroller.clientWidth;
        height = scroller.clientHeight;
        setTitleHeight(null);
      }
      measureReach();
    };
    scroller.addEventListener("scroll", measureReach, { passive: true });
    if (typeof ResizeObserver === "undefined") return () => scroller.removeEventListener("scroll", measureReach);
    const observer = new ResizeObserver(onResize);
    observer.observe(scroller);
    observer.observe(column);
    observer.observe(card);
    return () => {
      scroller.removeEventListener("scroll", measureReach);
      observer.disconnect();
    };
  }, [measureReach]);

  // A disabled Start has to say WHY, and say it where the reason cannot be
  // pushed under the fold: above the button rather than below it. The owner
  // pressed a dead "Start Game" and had to ask what was wrong. A caption on
  // an ENABLED button is not a blocker — a guest's "waiting for the host" —
  // and stays under it, where it was drawn.
  const captionBlock = start.caption ? (
            <motion.div
              // A 2.4s round trip to 60% and back — slow enough to read as
              // breathing rather than blinking. Reduced motion gets the
              // words and the face, holding still.
              animate={
                start.captionPulse && !reduceMotion ? { opacity: [1, 0.6, 1] } : undefined
              }
              transition={
                start.captionPulse && !reduceMotion
                  ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
              className={cn(
                "flex items-center justify-center gap-2",
                // A caption-only footer (a guest's "waiting for the host") is
                // the first thing in the footer, so it used to sit hard under
                // the card. Give it room to breathe above (owner's ask); under
                // a Start button the 8px gap is right — and above a disabled
                // one, the same gap goes below it instead.
                start.captionOnly
                  ? "pt-4"
                  : start.disabled
                    ? "mb-2 px-2"
                    : start.captionAbove
                      // A guest's "waiting for the host" over a live button
                      // sat hard on its top edge; the line needs air under
                      // it before the slab (owner: "move up a little
                      // waiting for host row, needs breathing space below").
                      ? "mb-3 px-2"
                      : "[&:not(:first-child)]:mt-3 px-2",
              )}
            >
              <p className="text-center font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
                {start.caption}
              </p>
              {/* The host's face, right after the "…" — puts a person on the
                  line that says you are waiting for one (owner's ask). */}
              {start.captionAvatarUrl !== undefined && (
                <span className="size-6 shrink-0 overflow-hidden rounded-full ring-2 ring-white/70">
                  <LobbyFace
                    url={start.captionAvatarUrl ?? null}
                    seed={start.captionAvatarName ?? ""}
                  />
                </span>
              )}
            </motion.div>
  ) : null;

  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden safe-bleed"
      style={{ background: "#f5d9ff", "--chip-clearance": `${chipClearance}px` } as CSSProperties}
    >
      {/* Backdrop (1018:6748): the lilac blobs under a wash, then the scene
          blurred to a haze across the top two thirds. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <img alt="" src={bgBlob1} className="absolute inset-0 h-full w-full object-cover" />
        <img alt="" src={bgBlob2} className="absolute inset-0 h-full w-full object-cover" />
        {/* 1102:4081 — the play screens' shared wash: a flat white veil over
            the blobs and a violet fall from the top, so the lobby, the
            chooser it grew out of and the wall that can stop it are all
            standing on the same colour. It replaced a pink gradient that was
            as strong at the footer as at the header. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.51) 0%, rgba(255,255,255,0.51) 100%), linear-gradient(180deg, rgba(152,124,255,0.3) 0%, rgba(255,255,255,0) 100%)",
          }}
        />
        {/* The scene: the tapped card's render, blurred to a haze. It fades
            in already blurred — the sharp-to-blur crossfade it used to open
            with read as a screen of its own flashing before the lobby. */}
        <motion.div
          className="absolute inset-x-0 bottom-0 top-[-54px] overflow-hidden"
          style={{ transformOrigin: "50% 42%", filter: "blur(37px)" }}
          initial={reduceMotion ? false : { opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <img
            alt=""
            src={sceneArt}
            className="absolute left-[-3.17%] top-0 h-[106.3%] w-[106.35%] max-w-none object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.55) 100%), linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 24.438%), linear-gradient(180deg, rgba(216,178,232,0.7) 0%, rgba(216,199,237,0) 35.822%)",
            }}
          />
        </motion.div>
      </div>

      {/* Header (1018:6799): back, then search and the bell. */}
      <motion.header
        {...arrive(0.18)}
        className="relative z-20 shrink-0 border-b border-[rgba(229,231,235,0.3)] px-4 py-3"
      >
        <div className="mx-auto flex w-full max-w-[700px] items-center justify-between gap-3 md:max-w-[520px]">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="rounded-full p-2 transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-6 w-6 text-[#4b5563]" />
          </motion.button>
          {/* 1102:4155 — the wordmark, centred, as it is on every other
              screen in this flow. The lobby's header was the one that left
              the middle empty. */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <MyTriviaLiveLogo responsive />
          </div>
          <div className="flex items-center gap-1">
            <SpotlightSearch variant="button" />
            {/* It was a <span>. Every other header in the app opens the
                notifications from here; in a lobby the bell counted them,
                showed the badge, and did nothing at all when pressed —
                which is exactly where an invitation or a join request is
                most likely to be waiting. */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onBell}
              aria-label={labels.notifications ?? "Notifications"}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/30"
            >
              <Bell className="h-5 w-5 text-[#4b5563]" />
              {unreadCount > 0 && (
                <span
                  className="absolute left-[22px] top-[2px] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-[13.5px] text-white"
                  style={{
                    background: "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
                    boxShadow: "0 2px 2px rgba(239,68,68,0.5)",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* The round list's backdrop: the lobby blurred, and a tap anywhere
          on it closes the list. Under the chip row (z-40) and over the
          body (z-10). */}
      <AnimatePresence>
        {categoryMenu?.open && (
          <motion.button
            type="button"
            aria-label="close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={categoryMenu.onClose}
            className="absolute inset-0 z-30 bg-[rgba(60,30,90,0.22)] backdrop-blur-[6px]"
          />
        )}
      </AnimatePresence>

      {/* The category row, OUTSIDE the scroller so it stays put while the
          body scrolls (owner's ask): it scrolled under the header's edge
          and was clipped there. Just the FIRST round — its category's icon
          and name, with a "(+N)" when more rounds are queued (owner's ask;
          the list of them read as clutter under the chip). Tapping the chip
          opens the round list under it; the + queues another. */}
      {category && (
        <motion.div
          ref={categoryRowRef}
          {...arrive(0.24)}
          className="relative z-40 mx-auto mt-[13px] w-full max-w-[700px] shrink-0 px-[28px] md:max-w-[520px]"
        >
          {/* The haze under the chip: the footer's ramp, upside down (TopHaze),
              from the header's underside — the row's mt-[13px] above — to
              10px below the chip, which is where the sticky tabs park: the
              strip the body scrolls up through, and not the tabs themselves,
              which blur their own backdrop. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-[-100vw] bottom-[-10px] top-[-13px] -z-10">
            <TopHaze />
          </div>
          <div>
            <Ring on={!!category.glow} className="min-w-0">
              <Chip
                iconSlug={category.iconSlug}
                label={category.label}
                trailing={category.trailing}
                onPress={category.onPress}
                action={
                  category.onAdd && (
                    // While the round list is open under the chip this button
                    // is the way to close it, and says so: an X, not a +
                    // (owner's ask). The list is closed first, then the
                    // picker can be opened from the list's own Add row.
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={categoryMenu?.open ? categoryMenu.onClose : category.onAdd}
                      aria-label={categoryMenu?.open ? "close" : "add category"}
                      className="mr-[20px] flex size-[40px] shrink-0 items-center justify-center rounded-[14px]"
                    >
                      {categoryMenu?.open ? (
                        <X className="h-6 w-6 text-[#402666]" strokeWidth={2.6} />
                      ) : (
                        <Plus className="h-6 w-6 text-[#402666]" strokeWidth={2.6} />
                      )}
                    </motion.button>
                  )
                }
              />
            </Ring>
          </div>

          {/* The round list, dropped under the chip. */}
          <AnimatePresence>
            {categoryMenu?.open && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                // Every pixel between the chip row and the bottom inset —
                // see the note on menuMaxHeight. The class is the fallback
                // for the frame before the measurement lands (and for a
                // browser that refuses it); the inline value wins whenever
                // there is one, and is the reason the list can show nine
                // rounds on a tall phone rather than the six a guessed
                // ceiling left room for.
                style={menuMaxHeight ? { maxHeight: menuMaxHeight } : undefined}
                className="absolute left-4 right-4 top-full z-40 mt-2 flex max-h-[calc(100dvh_-_var(--safe-top,0px)_-_var(--safe-bottom,0px)_-_145px)] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-[rgba(252,247,255,0.94)] shadow-[0_18px_48px_rgba(60,30,90,0.28)] backdrop-blur-xl"
              >
                {categoryMenu.children}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Body (1018:6818): the name, the card. Scrolls itself — the
          document never does on the device. */}
      <div
        ref={scrollerRef}
        // Pulled up under the category chip by the chip's own height
        // (chipClearance): the rows scroll up into the haze under the chip
        // rather than ending at its underside. The clearance is given back
        // by a SPACER inside, not by padding: a sticky offset is measured
        // from inside a scroller's padding in Chromium, and the tabs landed
        // a whole clearance too low (owner: "we don't need that much space
        // between category row and game rules / players row").
        // [overflow-anchor:none]: the leaving tab's content is lifted out of
        // the flow while it fades (popLayout) and then removed, and Chromium's
        // scroll anchoring, having picked its anchor inside that content,
        // answered the removal by scrolling to the top. Nothing above the
        // viewport ever changes height here, so anchoring has nothing to do.
        className="relative z-10 mt-[calc(var(--chip-clearance)*-1)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overflow-anchor:none]"
        // The footer floats over this list now, so the list has to end above
        // it — measured rather than guessed, because the footer is one line
        // tall for a guest and three for a host with a caption under a
        // disabled Start.
        //
        // Clear of the HAZE, not just of the footer's own box: the blur
        // layers start FOOTER_HAZE_PX above the footer's top edge, so
        // padding for the footer alone parked the last row inside the ramp
        // — on screen, and smeared (owner: "when i scroll at the end blur
        // covers last raw behind").
        style={{ paddingBottom: footerHeight + FOOTER_HAZE_PX }}
      >
        <div ref={columnRef} className="mx-auto flex min-h-full w-full max-w-[700px] flex-col px-4 md:max-w-[520px]">
          {/* The chip's clearance, as a spacer (see the scroller's note). */}
          <div aria-hidden className="shrink-0" style={{ height: "var(--chip-clearance)" }} />

          {/* The room, said once and centred: its face, its name, how full
              it is (Figma 1059:532). 39px of air above the emblem and every
              spare pixel below the count, so the card underneath is the foot
              of the screen and sits 20px clear of Start rather than floating
              mid-air. The block claims nothing when the content is taller
              than the frame — there is no free space to claim — and the 12px
              floor keeps the emblem off the category chip in that case. */}
          <motion.div
            ref={titleRef}
            {...arrive(0.3)}
            // flex-1 until the first tab switch, then held at the height it
            // had (see switchTab): the card no longer rides up and down the
            // screen as the tabs change what is in it.
            className={cn("flex min-h-[12px] flex-col items-center pt-[39px]", titleHeight === null && "flex-1")}
            style={titleHeight === null ? undefined : { minHeight: titleHeight }}
          >
            {onRename ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={onRename}
                className="flex w-full flex-col items-center"
              >
                <RoomTitle name={roomName} icon={icon} editable />
              </motion.button>
            ) : (
              <RoomTitle name={roomName} icon={icon} />
            )}
            {/* How full the room is, right under its name.
                It used to sit at the foot of the players tab, below every
                bench and the hint — the one number that says whether this
                room can start, three scrolls from the room's own name and
                invisible on the rules tab entirely. */}
            {capacity && (
              <p className="mt-[18px] font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
                {Math.min(capacity.seated ?? capacity.taken, capacity.max)}/{capacity.max} {labels.players.toLowerCase()}
              </p>
            )}
          </motion.div>

          {/* The card (1018:6750 / 1018:5549) and its two tabs. */}
          <motion.section
            ref={cardRef}
            {...arrive(0.36)}
            className={cn(
              "relative mb-[20px] mt-[16px] w-full shrink-0 overflow-clip rounded-[24px] border-2 border-[rgba(255,255,255,0.6)] bg-[rgba(252,247,255,0.6)] px-[9px] pt-[9px]",
              CARD_SHADOW,
              // The stake used to sit here, below the tabs, and brought its
              // own 22px foot with it. It is a row inside the Rules tab now,
              // so whichever tab is open is the last thing in the card and
              // pays for its own bottom.
              tab === "rules" ? "pb-[50px]" : "pb-[31px]",
            )}
          >
            {/* The two tabs (1123:8947): a white bar standing on a chunky
                lilac foot, with the open tab drawn as a bordered pane inside
                it rather than the filled violet slab it was. Both labels stay
                the same colour — weight is what says which one is open, so
                the closed tab reads as a place to go rather than as text
                switched off. */}
            {/* Sticky: the body scrolls, the tabs stay. They used to ride up
                under the category chip's edge and out of reach the moment
                the rules ran long (owner: "make sure game rules and players
                tabs are sticky and do not go under select category
                container"). The body now runs up under the chip (see
                chipClearance), so the bar sticks at the chip's underside
                plus 10px, not at the scroller's own top. overflow-clip on
                the card is not a scroll container, so the bar sticks to the
                body's scroll, and the blur keeps the rows scrolling under it
                from showing through the bar's 77% white. */}
            <div className="sticky top-[calc(var(--chip-clearance)+10px)] z-20">
              {/* The haze continues behind the bar: the rows scrolling up
                  under the tabs frost out here, not just in the strip under
                  the chip (owner: "we need blurry background behind the game
                  rules and players container, increase blurry bg height
                  behind"). It rides with the sticky bar — under it, over the
                  rows — from 10px above the bar, where the chip's own ramp
                  ends, to 28px below it, so the two ramps meet and the
                  frost fades out just under the bar. The card's 9px side
                  padding is spanned so the haze reaches the card's edges. */}
              <div aria-hidden className="pointer-events-none absolute inset-x-[-9px] bottom-[-28px] top-[-10px]">
                <TopHaze />
              </div>
              <div className="relative flex items-center gap-[6px] rounded-[28px] border border-[#ceb8e4] bg-[rgba(255,255,255,0.77)] p-[10px] shadow-[0px_8px_0px_0px_#d0bbe3] backdrop-blur-md">
              {(["rules", "players"] as const).map((key) => {
                const active = tab === key;
                // The same asymmetric corner the category chip wears (see
                // CHIP_RADIUS above), mirrored per side: the left (rules)
                // tab scoops its own outer corner — bottom-left — and the
                // right (players) tab scoops its outer corner, bottom-right.
                const tabRadius =
                  key === "rules"
                    ? "rounded-tl-[24px] rounded-tr-[24px] rounded-br-[24px] rounded-bl-[54px]"
                    : "rounded-tl-[24px] rounded-tr-[24px] rounded-bl-[24px] rounded-br-[54px]";
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchTab(key)}
                    className={cn(
                      "relative flex h-[52px] flex-1 items-center justify-center px-[10px] text-center font-display text-[18px] leading-[26px] text-[#402666]",
                      tabRadius,
                      active ? "font-bold" : "font-normal",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="lobby-tab-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className={cn(
                          "absolute inset-0 border border-[#d1a7dc] bg-[rgba(240,218,245,0.22)]",
                          tabRadius,
                        )}
                      />
                    )}
                    <span className="relative truncate">
                      {key === "rules" ? labels.rules : labels.players}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>

            {/* popLayout, not wait: the leaving tab is lifted out of the
                flow at once and the arriving one laid out in the same
                frame, so the card changes height ONCE. Under "wait" it
                changed twice - to the bar alone while the old content
                faded, then to the new content - and the card, pushed to
                the foot of the screen, bounced the tabs bar with it
                (owner: "when i switch between tabs, page jumps a little"). */}
            <AnimatePresence mode="popLayout" initial={false}>
              {tab === "rules" ? (
                <motion.div
                  key="rules"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col px-[3px]"
                >
                  {/* What the host can still set — the count, the round
                      length, the TV — comes FIRST now (owner's ask): the
                      controls you touch to start sit at the top, and the
                      written rules read below them, not above. */}
                  <div className="mt-[16px] flex flex-col gap-[15px] empty:hidden">
                    {rules.map((row) => (
                      <div
                        key={row.key}
                        className={cn("flex h-[84px] items-center justify-between rounded-[20px] pl-[26px] pr-[13px]", RULE_BORDER)}
                      >
                        <span className="font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
                          {row.label}
                        </span>
                        {row.variant === "dropdown" ? <RuleDropdown row={row} /> : <Segmented row={row} />}
                      </div>
                    ))}
                    {/* Play on TV lives here now, a row in the rules — not a chip
                        up beside the category (owner's ask). */}
                    {tv && (
                      <LobbyInfoRow label={tv.label} onPress={tv.onPress}>
                        <img
                          alt=""
                          src={chipTv}
                          style={{ filter: "drop-shadow(2px -2px 0 rgba(0,0,0,0.12))" }}
                          className="h-8 w-8 object-contain"
                        />
                      </LobbyInfoRow>
                    )}
                    {rulesExtra}
                  </div>
                  {/* The stake: what this room is played for.

                      It sat on the card's own foot, below whichever tab was
                      open, which put it under the benches on the Players tab
                      — where it is not an answer to anything anyone is
                      looking at — and at the very bottom of the Rules tab,
                      three paragraphs below the last thing that mentions it.
                      It belongs with the rules, and above them: it is a
                      number the host sets the room up around, not a footnote
                      to the prose (owner's ask). */}
                  {reward && (
                    <div className="mt-[15px] flex h-[66px] items-center justify-between rounded-[20px] border border-[rgba(128,94,143,0.23)] bg-[#fdfbff] pl-[19px] pr-[15px] shadow-[0px_5px_0px_#d3c5db]">
                      <span className="font-[Nunito] text-[14px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666] opacity-60">
                        {reward.label}
                      </span>
                      <span className="flex h-[43px] min-w-[84px] shrink-0 items-center gap-[4px] rounded-[14.616px] border border-[#e8e0f5] pl-[7px] pr-[12px] shadow-[0px_2.94px_0px_0px_#d8d0e8,0px_4.409px_11.758px_0px_rgba(0,0,0,0.1)]">
                        {reward.icon && (
                          <img alt="" src={reward.icon} className="size-[32.305px] shrink-0 object-contain" />
                        )}
                        <span className="font-[Nunito] text-[18px] font-black leading-6 tracking-[-0.16px] text-[#402666]">
                          {reward.amount}
                        </span>
                      </span>
                    </div>
                  )}
                  {/* What the game IS, written out — under the controls and
                      the stake (owner's ask). An uppercase label over a
                      paragraph, one section each (Figma 1059:532). */}
                  {rulesText && rulesText.length > 0 && (
                    <div className="mt-[36px] flex flex-col gap-[36px] px-[23px] pb-[6px]">
                      {rulesText.map((section) => (
                        <div key={section.key}>
                          <h3 className="font-hero text-[16px] uppercase leading-[14px] tracking-[-0.2054px] text-[#402666] opacity-50">
                            {section.heading}
                          </h3>
                          <p className="mt-[17px] font-[Nunito] text-[14px] font-medium leading-[22px] tracking-[-0.16px] text-[#402666]">
                            {section.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="players"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="mt-[16px] flex flex-col gap-[16px] px-[3px]"
                >
                  {/* Invite goes ABOVE the benches (owner's ask, and where
                      1123:8843 draws it). At the foot of the list it was the
                      one thing on this tab you had to scroll to reach — and
                      in a room with enough people to need it, it was the row
                      furthest from the top, sitting in the footer's haze. A
                      room you are trying to fill should offer the way to
                      fill it first. */}
                  {onInvite && !(capacity && capacity.taken >= capacity.max) && (
                    <LobbyInviteRow faces={inviteFaces} label={labels.invite} onPress={onInvite} />
                  )}
                  {/* The gap is on the outer column, not just inside a group.
                      Each bench spaces its own rows at 10px and the column had
                      no gap at all, so on a two-bench mode the arena's second
                      side began immediately under the first one's footer —
                      its title sitting hard against the row above it, with
                      nothing to read as a break between the teams. One rhythm
                      between groups, the rows' own inside them. */}
                  {playersLayout === "columns" ? (
                    // Side by side, with the VS in the gutter between the two
                    // headings. Everything inside a column is narrower than a
                    // full-width row, so the rows go compact rather than
                    // truncating a name to three letters.
                    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-2">
                      {groups.slice(0, 2).map((group, i) => (
                        <div
                          key={group.key}
                          className="flex min-w-0 flex-col gap-[8px]"
                          // Row 1 explicitly, all three of them. Grid's
                          // auto-placement is sparse: naming columns 1 and 3
                          // and leaving 2 for a later child put that child on
                          // a row of its own, which is how the VS ended up
                          // under both benches instead of between them.
                          style={{ gridColumn: i === 0 ? 1 : 3, gridRow: 1 }}
                        >
                          {group.title}
                          {group.players.map((p) => (
                            <PlayerRow
                              key={p.id}
                              player={p}
                              youLabel={labels.you}
                              roundsLabel={labels.rounds}
                              captainLabel={labels.captain ?? "Captain"}
                              callLabel={labels.call ?? "Call"}
                              addFriendLabel={labels.addFriend ?? "Add friend"}
                              friendRequestedLabel={labels.friendRequested ?? "Sent"}
                              removeLabel={labels.remove ?? "Remove"}
                              leftLabel={labels.left ?? "left"}
                              invitedLabel={labels.invited ?? "invited"}
                              compact
                            />
                          ))}
                          {group.footer}
                        </div>
                      ))}
                      {/* Level with the crests, which are the first 52px of
                          each heading — that is the line the eye reads the
                          two sides across. */}
                      <p
                        style={{ gridColumn: 2, gridRow: 1 }}
                        className="mt-[14px] self-start text-center font-hero text-[20px] leading-[24px] text-[#d8b2e8]"
                      >
                        VS
                      </p>
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div key={group.key} className="flex flex-col gap-[10px]">
                        {group.title}
                        {group.players.map((p) => (
                          <PlayerRow
                            key={p.id}
                            player={p}
                            youLabel={labels.you}
                            roundsLabel={labels.rounds}
                            captainLabel={labels.captain ?? "Captain"}
                            callLabel={labels.call ?? "Call"}
                            addFriendLabel={labels.addFriend ?? "Add friend"}
                            friendRequestedLabel={labels.friendRequested ?? "Sent"}
                              removeLabel={labels.remove ?? "Remove"}
                            leftLabel={labels.left ?? "left"}
                            invitedLabel={labels.invited ?? "invited"}
                          />
                        ))}
                        {group.footer}
                      </div>
                    ))
                  )}
                  {capacity && capacity.taken >= capacity.max ? (
                    <div className="mt-[20px] flex flex-col items-center">
                      {playersFullSlot ?? (
                        <p className="text-center font-[Nunito] text-[14px] font-medium leading-[18px] tracking-[-0.16px] text-[#402666]">
                          {capacity.fullLabel}
                        </p>
                      )}
                    </div>
                  ) : (
                    playersHint && (
                      <p className="mt-[20px] text-center font-[Nunito] text-[14px] font-medium leading-[18px] tracking-[-0.16px] text-[#402666]">
                        {playersHint}
                      </p>
                    )
                  )}
                  {playersExtra}
                </motion.div>
              )}
            </AnimatePresence>

          </motion.section>
        </div>
        {/* The room the card is short by to reach the chip (reachSpacer). */}
        <div aria-hidden className="shrink-0" style={{ height: reachSpacer }} />
      </div>

      {/* Footer (1059:532): Start Game, and nothing else — no rule above it
          and no padding of its own. The card's 20px is the whole gap, which
          is what the divider and a second 16px of padding were quietly
          turning into 36.

          It floats over the list rather than sitting under it. As a flex
          sibling it cut the card off at a hard horizontal line — the Invite
          row was sliced through the middle of its glyphs and the screen
          simply ended there, which reads as "that is the bottom" and not as
          "there is more below" (owner's ask). Over the list, with the two
          hazes below, the content keeps going under the button, blurred:
          you can see something is there, and that it scrolls. The list's
          own padding-bottom (measured, above) keeps all of it reachable. */}
      <div ref={footerRef} className="absolute inset-x-0 bottom-0 z-20">
        {/* The haze: a progressive blur under the footer, shared with the
            results screen (FooterHaze) — the list keeps going under the
            button, blurred, so you can see there is more and that it
            scrolls. */}
        <FooterHaze />
        {/* Shorter than it was: the caption and the button are the whole
            reason this bar exists, and it was carrying 12px of air above
            the caption and 16 below the button for no one (owner's ask). */}
        <motion.div {...arrive(0.42)} className="relative px-[28px] pb-[14px] pt-1.5">
        <div className="mx-auto w-full max-w-[700px] md:max-w-[520px]">
          {footerExtraPlacement === "above" && footerExtra}
          {(start.disabled || start.captionAbove) && captionBlock}
          {/* 1123:9998: the violet slab, 63 tall with a hard #6906cd foot
              under it and a white hairline inside its top edge. */}
          {!start.captionOnly && (
          <motion.button
            type="button"
            whileTap={start.disabled ? undefined : { scale: 0.99 }}
            onClick={start.onPress}
            disabled={start.disabled}
            className={cn(
              "relative flex h-[63px] w-full items-center justify-center overflow-hidden rounded-[28px] border-[1.5px] border-solid border-[#402666] bg-[linear-gradient(180deg,#a374e9_0%,#cf5eff_58%,#9f5dff_100%)] shadow-[0px_4px_0px_0px_#6906cd,0px_8px_16px_0px_rgba(102,51,153,0.3)] transition-[transform,box-shadow,opacity] duration-100",
              start.disabled
                ? "opacity-50"
                : "active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_#6906cd,0px_8px_16px_0px_rgba(102,51,153,0.3)]",
            )}
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.45)]" />
            <span className="relative flex h-full items-center justify-center gap-2 font-display text-[20px] font-medium leading-[26px] text-white [text-shadow:1px_2px_0px_rgba(0,0,0,0.25)]">
              {start.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : start.icon}
              {start.label}
            </span>
          </motion.button>
          )}
          {!start.disabled && !start.captionAbove && captionBlock}
          {footerExtraPlacement === "below" && footerExtra}
        </div>
        </motion.div>
      </div>

      {children}
    </div>
  );
}

/**
 * One friend's face, with something to show when their avatar cannot be
 * drawn.
 *
 * `profiles.avatar_url` is not always loadable: build-hashed asset paths
 * from an older deploy 404, and eight per cent of accounts have no avatar
 * at all. Rendering that URL straight into an <img> is what put a torn-page
 * glyph in the middle of the invite row. resolveAvatarUrl recovers the
 * hashed paths it can, and anything still missing or broken falls back to
 * the same mascot the person wears everywhere else — seeded, so it is the
 * same one each time rather than a new face per render.
 */
function LobbyFace({ url, seed }: { url: string | null; seed: string }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveAvatarUrl(url);
  const src = failed || !resolved ? fallbackAvatarFor(seed) : resolved;
  return (
    <img
      alt=""
      src={src}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}

/**
 * The invite line (1018:5480): the dashed green + and the word, and any
 * faces the caller passes. Exported so a lobby with more than one bench
 * (the arena) can put one under each side.
 *
 * The design draws three friends beside the +, and nothing in the app does
 * any more: a face here is a face in the room to anyone reading it. See
 * `inviteFaces` above.
 */
export function LobbyInviteRow({
  faces = [],
  label,
  onPress,
  className,
}: {
  faces?: { url: string | null; online?: boolean }[];
  label: string;
  onPress: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {faces.length > 0 && (
        <div className="flex items-center">
          {faces.slice(0, 3).map((face, i) => (
            <span
              key={i}
              className="rounded-full p-[2px]"
              style={{
                marginLeft: i === 0 ? 0 : -15,
                backgroundImage:
                  face.online === false
                    ? "linear-gradient(135deg, rgb(148,163,184) 0%, rgb(203,213,225) 100%)"
                    : "linear-gradient(135deg, rgb(147,51,234) 0%, rgb(236,72,153) 50%, rgb(249,115,22) 100%)",
              }}
            >
              <span className="block rounded-full bg-white p-[1.34px]">
                <span className="block h-[36px] w-[36px] overflow-hidden rounded-full bg-[#e9d8ff]">
                  <LobbyFace url={face.url} seed={face.url ?? String(i)} />
                </span>
              </span>
            </span>
          ))}
        </div>
      )}
      <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onPress} className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-[20px] border-[1.25px] border-dashed border-[#10b981]">
          <Plus className="h-[25px] w-[25px] text-[#10b981]" strokeWidth={2.08} />
        </span>
        <span className="font-[Nunito] text-[18px] font-semibold leading-[28px] tracking-[-0.16px] text-[#10b981]">
          {label}
        </span>
      </motion.button>
    </div>
  );
}

/**
 * A rule-shaped row that states something rather than offering a choice —
 * the pot, the rounds, the team size. Same box as a rule row (1018:5464),
 * with whatever the mode wants on the right.
 */
export function LobbyInfoRow({
  label,
  children,
  hint,
  onPress,
}: {
  label: ReactNode;
  children?: ReactNode;
  /** A second, quieter line under the label. */
  hint?: ReactNode;
  onPress?: () => void;
}) {
  const Tag = onPress ? motion.button : "div";
  return (
    <Tag
      {...(onPress ? { type: "button" as const, onClick: onPress, whileTap: { scale: 0.99 } } : {})}
      className={cn(
        "flex h-[84px] w-full items-center justify-between rounded-[20px] pl-[26px] pr-[20px] text-left",
        RULE_BORDER,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
          {label}
        </span>
        {hint && (
          <span className="mt-[3px] block font-[Nunito] text-[12px] leading-4 text-[#402666]/60">{hint}</span>
        )}
      </span>
      {children && (
        <span className="ml-3 flex shrink-0 items-center gap-2 font-[Nunito] text-[18px] font-black leading-6 tracking-[-0.16px] text-[#402666]">
          {children}
        </span>
      )}
    </Tag>
  );
}

/**
 * Keep one line of text on ONE line by shrinking its font to fit.
 *
 * The h1 is a centred `whitespace-nowrap` box, so its rendered width
 * (`clientWidth`) is the box while the full name keeps its natural
 * `scrollWidth` — the standard way to ask "is this being cut off".
 *
 * It MEASURES rather than estimates. One pass of `base × avail / natural`
 * looks exact and is not: the heading carries a fixed negative tracking that
 * does not scale with the type, glyph advances round to whole pixels, and the
 * display face can swap in wider than whatever was measured. Any of those
 * leaves a name a few pixels over the edge — and a few pixels over is the
 * ellipsis, which is what the owner kept seeing. So the estimate is only the
 * first jump: after it, this checks, and keeps stepping down a pixel at a
 * time until the name genuinely fits (or hits the floor, where it ellipsises
 * because there is nothing left to give).
 *
 * A ResizeObserver re-fits on width changes (rotation, the two phone widths
 * in the mocks); changing font-size moves scrollWidth, not clientWidth, so
 * there is no loop.
 */
function useFitOneLine(text: string, basePx: number, minPx: number, gutterPx = 0) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [px, setPx] = useState(basePx);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const parent = el.parentElement;
      if (!parent) return;
      // AVAILABLE width comes from the PARENT, not the h1's own clientWidth.
      // The h1 is a flex item with the default `min-width: auto`, so it will
      // not shrink below its own text — its clientWidth stays equal to the
      // text and "is it cut off?" always reads false, which is why a long
      // name never shrank and just ellipsised. The parent is the full-width
      // (w-full) box and does not depend on the text, so it is the honest
      // ceiling.
      // Less a gutter each side. Fitting to the parent's full width is what
      // a shrunk name did, and it came out spanning the screen edge to edge
      // with nothing either side (owner: "text almost touching edges left
      // and right"). The gutter is also what makes a long name land smaller.
      const avail = parent.getBoundingClientRect().width - 2 * gutterPx;
      if (avail <= 0) return;
      // NATURAL width is the text's own one-line width, read off the BOX
      // while every constraint that could clip it is lifted: width
      // max-content, no max-width, no ellipsis. It used to be read from
      // scrollWidth with the box still capped at 100% and ellipsised —
      // and WebKit reports the CLIPPED width there, so on an iPhone every
      // name "fit" and none ever shrank ("Cheerful Shar…", owner's
      // screenshot, at the full size). A box that genuinely is the text's
      // width measures the same in every engine.
      const saved = { width: el.style.width, maxWidth: el.style.maxWidth, textOverflow: el.style.textOverflow };
      el.style.width = "max-content";
      el.style.maxWidth = "none";
      el.style.textOverflow = "clip";
      const widthAt = (px: number) => {
        el.style.fontSize = `${px}px`;
        return el.getBoundingClientRect().width;
      };
      const natural = widthAt(basePx);
      let size = basePx;
      if (natural > avail) {
        // One measured jump, then a few corrective steps: the fixed negative
        // tracking does not scale with the type and advances round to whole
        // pixels, so the estimate lands a hair over and the walk settles it.
        size = Math.max(minPx, Math.floor((basePx * avail) / natural));
        for (let guard = 0; guard < 16 && size > minPx && widthAt(size) > avail; guard++) {
          size -= 1;
        }
        el.style.fontSize = `${size}px`;
      }
      el.style.width = saved.width;
      el.style.maxWidth = saved.maxWidth;
      el.style.textOverflow = saved.textOverflow;
      setPx(size);
    };
    fit();
    // Watch the parent (its width is the ceiling); the h1's own size changing
    // as the font shrinks must not itself trigger a re-fit.
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    // The heading is set in a heavy display face (Slackey) that loads after
    // first paint. Measured against the fallback the name looks like it fits;
    // when the much wider face swaps in it overflows — and a ResizeObserver
    // never sees a font swap. Re-fit once the fonts settle, and again on the
    // next load event, so the name is shrunk against the face it is drawn in.
    const fonts = document.fonts;
    fonts?.ready.then(fit).catch(() => {});
    fonts?.addEventListener?.("loadingdone", fit);
    return () => {
      ro.disconnect();
      fonts?.removeEventListener?.("loadingdone", fit);
    };
  }, [text, basePx, minPx]);
  return { ref, px };
}

/** Breathing room either side of the room name, in px. */
const TITLE_GUTTER_PX = 24;

export function RoomTitle({
  name,
  icon,
  editable = false,
}: {
  name: string;
  icon?: string | null;
  editable?: boolean;
}) {
  // Stacked and centred (Figma 1059:532): the emblem at 91px, the name
  // under it at 43.656 on 51.36.
  //
  // These two spent a while side by side, at 34px, to buy back the row an
  // emblem above a big heading was costing on a short screen. The design
  // answers that differently: the name IS the screen above the card, so it
  // gets the size back, and the slack it needs comes out of the empty lilac
  // that used to sit under the card rather than out of the heading.
  //
  // The name ALWAYS stays on ONE line (owner's ask — a two-line title ate the
  // screen and read as broken). It never wraps: it renders at the frame's
  // 43.656px and, only when a longer name would not fit, shrinks its own font
  // until it does (`useFitOneLine`), ellipsising only a name too long even at
  // the floor.
  //
  // The box is the width it HAS, not the frame's 321px. That number came off
  // a 375pt mock, where it is the content width; hard-coded, it threw away
  // 40px of a modern phone and shrank — or cut off — names that had the room
  // to be drawn in full. The floor is 14px: the owner would rather read a
  // long name whole and small than have it cut, so it shrinks that far first
  // — and there is no ellipsis at all ("never show 3 dots"): a name past the
  // floor clips at the edge rather than growing dots.
  //
  // The pencil rides on the emblem's shoulder — one control, whichever half
  // is tapped, opening the sheet that sets both the name and the face. It is
  // never a child of the h1, so the chip's round edge and its shadow are never
  // clipped by the heading's overflow.
  const { ref: headingRef, px: headingPx } = useFitOneLine(name, 43.656, 14, TITLE_GUTTER_PX);
  const chip = (
    <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-white drop-shadow-[0px_2px_2px_rgba(0,0,0,0.18)]">
      <Pencil className="size-3 text-[#523b76]" />
    </span>
  );
  const heading = (
    <h1
      ref={headingRef}
      style={{ fontSize: headingPx, lineHeight: 1.176 }}
      className="w-full min-w-0 max-w-full overflow-hidden whitespace-nowrap text-center font-hero capitalize tracking-[-0.2054px] text-[#402666]"
    >
      {name}
    </h1>
  );
  // A room with no emblem has no shoulder to hang the pencil on, so it goes
  // beside the name — still its own flex child, outside the clamp.
  if (!icon) {
    return editable ? (
      <div className="flex w-full items-center justify-center gap-2">
        {heading}
        {chip}
      </div>
    ) : (
      heading
    );
  }
  const emblem = (
    <span className="relative block size-[91px] shrink-0">
      <img
        alt=""
        src={icon}
        className="size-full object-contain drop-shadow-[0_4px_10px_rgba(88,50,160,0.22)]"
      />
      {editable && <span className="absolute left-[65px] top-[4px]">{chip}</span>}
    </span>
  );
  return (
    <>
      {/* Emblem, then the name under it — nothing beside it. The kind of
          room this is belongs on the category chip at the top, which is
          where the player looks to see what the room plays; a caption here
          only pushed the emblem off centre (owner's ask). */}
      <span className="mb-[15px] block">{emblem}</span>
      {heading}
    </>
  );
}

/**
 * One of the two chips over the scene — the category, and Play on TV.
 *
 * They wear the rule row's own box now: `rounded-[20px]` and RULE_BORDER over
 * the same translucent surface as the card below them. They used to be their
 * own thing entirely — an asymmetric `24/24/24/54` radius, a 2px white border,
 * a per-chip gradient tint, and a 60px icon hung outside the box on negative
 * offsets with the label nudged back by a hand-tuned `labelShift` to clear it.
 * Two buttons drawn to a different specification than everything under them,
 * and each one to its own. One box, one border, one type ramp; the icon sits
 * inside it at the size the row can hold.
 */
function Chip({
  iconSlug,
  label,
  trailing,
  onPress,
  action,
}: {
  /** The category's own icon, once one is picked. With nothing picked the
      mock shows the words alone rather than a placeholder for it. */
  iconSlug?: string | null;
  label: string;
  /** A note pinned to the far right of the chip — "+5" extra rounds. */
  trailing?: string;
  onPress?: () => void;
  /** The + that queues another round, drawn INSIDE the pill's right end. */
  action?: ReactNode;
}) {
  return (
    // 1123:8967: one pill, not two boxes. The + used to be a second 63px
    // slab floating beside this one with its own border and its own foot,
    // so the row read as two controls that happened to be adjacent rather
    // than as one thing with an action on its end. The design draws a
    // single 465-wide pill with the icon at its left, the name across it
    // and the + inside its right edge — and in the lilac the rest of the
    // screen is in, where the old rose was the only warm note up here.
    //
    // :active on an ancestor matches while a descendant is pressed, so the
    // whole pill still takes its foot whichever half you touch.
    <div
      className={cn(
        CHIP_RADIUS,
        "relative flex h-[63px] w-full min-w-0 flex-1 items-center border-2 border-solid border-white bg-[#fcf7fd] shadow-[0px_2px_8px_0px_rgba(51,51,51,0.06),0px_8px_0px_0px_#bea5d4]",
        onPress
          && "transition-[transform,box-shadow] duration-100 active:translate-y-[4px] active:shadow-[0px_4px_0px_0px_#bea5d4]",
      )}
    >
      <motion.button
        type="button"
        whileTap={onPress ? { scale: 0.99 } : undefined}
        onClick={onPress}
        disabled={!onPress}
        className={cn(
          "flex h-full min-w-0 flex-1 items-center gap-2 rounded-bl-[22px] rounded-tl-[22px] text-left",
          // The picked category wears its own face; with nothing picked yet
          // the mock shows the words alone, so the label takes the icon's
          // place rather than standing beside a placeholder for it.
          iconSlug ? "pl-[13px]" : "pl-[31px]",
          // 8px is the gap before the + , which carries the real inset in
          // its own mr-[20px]. With no + there is nothing to carry it, and
          // the "+N" pill ended up 8px from the pill's edge — reading as
          // touching it (owner: "make sure + button in category picker raw
          // is not touching edge, check padding"). Without the action the
          // content ends where the + would have: same inset either way.
          action ? "pr-[8px]" : "pr-[20px]",
        )}
      >
        {iconSlug && (
          <span className="pointer-events-none shrink-0">
            <DynamicIcon slug={iconSlug} size={32} />
          </span>
        )}
        {/* The tabs' own 18px: the chip and the bar under it are the two
            labels on the same column, and they read as one voice at one
            size (owner: "increase select category font size, same font
            size what we have on game rules / players"). */}
        <span className="min-w-0 flex-1 truncate font-display text-[18px] font-bold leading-[26px] text-[#402666]">
          {label}
        </span>
        {/* The "+N" pops as it changes: keyed by its value, so a new count
            mounts a new span that springs in — the eye is drawn to a round
            being added. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {trailing && (
            <motion.span
              key={trailing}
              initial={{ opacity: 0, scale: 0.5, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 8 }}
              transition={{ type: "spring", stiffness: 520, damping: 22 }}
              // A pill, not a faded number: "+1" hanging loose at the far end
              // of the chip read as a stray glyph (owner: "looks weird").
              // Tinted like the rest of the lobby's counts so it says
              // "one more round" at a glance.
              className="ml-2 inline-flex h-[24px] shrink-0 items-center rounded-full bg-[#7126d5]/10 px-2.5 font-[Nunito] text-[13px] font-bold leading-none text-[#7126d5]"
            >
              {trailing}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {action}
    </div>
  );
}

/**
 * The attention ring around a chip: a gradient stroke travelling around it.
 *
 * `on` lights it — the host's chip and +, only while the host still has a
 * category to pick, so the way to add a round is found without looking and
 * then gets out of the way. Nobody else's chip wears it: when a round is
 * added the "+N" on the chip pops (see Chip), and that is the cue.
 *
 * Drawn as a masked gradient (see .lobby-ring in index.css) laid exactly
 * over the chip's own 1px border, so the ring is the border while it is
 * on — the same weight as every rule box below — rather than a second,
 * heavier band around it. The first cut was a 2px band outside the border,
 * which read as bolder than anything else on the screen.
 *
 * The overlay's radius has to match the chip's own asymmetric 24/24/24/54
 * corner exactly (see Chip above) — a uniform rounded-[20px] here traced a
 * different curve than the chip's actual edge, most visibly at the 54px
 * corner, and left a sliver of the chip's own border showing past the
 * ring: a stray line peeking out from behind the chip/+.
 */
const CHIP_RADIUS = "rounded-bl-[24px] rounded-br-[54px] rounded-tl-[24px] rounded-tr-[24px]";

function Ring({
  on,
  className,
  children,
}: {
  on: boolean;
  className?: string;
  children: ReactNode;
}) {
  // A flex box, not a block: the chip inside is `flex-1`, which only means
  // something in a flex parent. As a block, the ring left the chip at its
  // content width — "Economics +3" as a short pill inside a wide ring
  // (owner's screenshot).
  return (
    <div className={cn("relative flex", className)}>
      {children}
      {on && <span aria-hidden className={cn("lobby-ring pointer-events-none absolute inset-0 z-10", CHIP_RADIUS)} />}
    </div>
  );
}

/** A dropdown for a rule with too many options to lay out in a row — the
    player count runs 2–10. A native select, styled to sit in the rule box. */
function RuleDropdown({ row }: { row: LobbyRuleRow }) {
  // Same shell as Segmented — the [#ecdbf3] track with a p-[6px] inset — so
  // it reads as one control family. The current value rides a white pill,
  // exactly like a segmented control's selected option (owner's ask: it
  // looked like a different kind of control beside the 5/10/20 row).
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center rounded-[20px] bg-[#ecdbf3] p-[6px] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]",
        RULE_BORDER,
        !row.onChange && "opacity-70",
      )}
    >
      <span className="pointer-events-none flex items-center gap-1 rounded-[16px] bg-white px-[15px] py-2 drop-shadow-[0px_2px_4px_rgba(0,0,0,0.1)]">
        <span className="font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
          {row.options.find((o) => o.value === row.value)?.label ?? row.value}
        </span>
        <svg className="h-4 w-4 text-[#402666]" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {row.onChange && (
        <select
          value={row.value}
          onChange={(e) => row.onChange?.(e.target.value)}
          aria-label={row.label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {row.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/** The 5 / 10 / 20 and Public / Private control (1018:8058 / 1018:8095). */
function Segmented({ row }: { row: LobbyRuleRow }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center rounded-[20px] bg-[#ecdbf3] p-[6px] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]",
        RULE_BORDER,
        !row.onChange && "pointer-events-none",
      )}
    >
      {row.options.map((opt) => {
        const selected = opt.value === row.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={row.onChange ? () => row.onChange?.(opt.value) : undefined}
            className="relative px-[15px] py-2 font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]"
          >
            {selected && (
              <motion.span
                layoutId={`lobby-seg-${row.key}`}
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
                className="absolute inset-0 rounded-[16px] bg-white drop-shadow-[0px_2px_4px_rgba(0,0,0,0.1)]"
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** One seated (or invited) player (1018:5564). */
function PlayerRow({
  player,
  youLabel,
  roundsLabel,
  captainLabel,
  callLabel,
  addFriendLabel,
  friendRequestedLabel,
  removeLabel,
  leftLabel,
  invitedLabel,
  compact = false,
}: {
  player: LobbyPlayer;
  youLabel: string;
  roundsLabel: (count: number) => string;
  captainLabel: string;
  callLabel: string;
  addFriendLabel: string;
  friendRequestedLabel: string;
  removeLabel: string;
  leftLabel: string;
  invitedLabel: string;
  /** Half the width to work in: two benches share the card. */
  compact?: boolean;
}) {
  const Tag = player.onPress ? motion.button : "div";

  // An open seat. Dashed and quiet on the bench you cannot invite into, a
  // + on the one you can — either way it is there to be counted.
  if (player.empty) {
    return (
      <Tag
        type={player.onPress ? "button" : undefined}
        whileTap={player.onPress ? { scale: 0.97 } : undefined}
        onClick={player.onPress}
        className={cn(
          "flex w-full items-center justify-center rounded-[20px] border-2 border-dashed border-[rgba(156,100,181,0.45)]",
          compact ? "h-[58px] gap-1.5" : "h-[70px] gap-2",
          player.onPress ? "bg-white/40" : "opacity-55",
        )}
      >
        <Plus className={cn("text-[#8858d5]", compact ? "h-4 w-4" : "h-5 w-5")} strokeWidth={2.5} />
        <span
          className={cn(
            "truncate font-[Nunito] font-bold tracking-[-0.16px] text-[#402666]/60",
            compact ? "text-[12px] leading-4" : "text-[14px] leading-5",
          )}
        >
          {player.name}
        </span>
      </Tag>
    );
  }

  // The armband is its own control when it can be tapped, so the row is a box
  // holding two things rather than one button — a button inside a button is
  // not something a browser will honour, and the vote has to stay reachable.
  const Body = (
    <Tag
      type={player.onPress ? "button" : undefined}
      whileTap={player.onPress ? { scale: 0.99 } : undefined}
      onClick={player.onPress}
      className="flex min-w-0 flex-1 items-center text-left"
    >
      <span className="relative shrink-0">
        <span
          className={cn(
            "block overflow-hidden rounded-full bg-[#e9d8ff] shadow-[0px_0px_0px_2px_rgba(148,163,184,0.75)]",
            compact ? "h-9 w-9" : "h-12 w-12",
            // Away, not gone. Greyed rather than hidden: the seat is still
            // theirs and the room is still waiting on it.
            player.offline && "opacity-45 grayscale",
            // And the same for somebody who has been asked but has not
            // arrived: their face comes up in colour the moment they do
            // (owner's ask).
            player.pending && "opacity-45 grayscale",
          )}
        >
          {/* LobbyFace, not a bare <img>. This row rendered
              `player.avatarUrl` straight, so a build-hashed path from an
              older deploy — which 404s — drew a torn-page glyph next to the
              player's name. That is the exact bug the comment on LobbyFace
              describes being fixed for the invite row; the players list was
              never moved over. Seeded by name, so the fallback is the same
              mascot they wear everywhere else. */}
          <LobbyFace url={player.avatarUrl ?? null} seed={player.name} />
        </span>
        {/* The bell belongs ON the grey face, not at the far end of the
            row: the face is what says "away", and the two read as one
            thing — this person, and the way to fetch them. At the row's
            edge it was a loose amber circle a whole name away from what
            it referred to. */}
        {player.offline && (
          <span
            className={cn(
              "pointer-events-none absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-amber-400 text-[#402666] shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
              compact ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]",
            )}
          >
            <BellRing className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={2.75} />
          </span>
        )}
      </span>
      <span
        className={cn(
          "ml-2 min-w-0 flex-1 truncate bg-gradient-to-b from-[#565656] to-black bg-clip-text font-[Nunito] font-black tracking-[-0.146px] text-transparent opacity-60",
          compact ? "text-[13px] leading-[18px]" : "text-[16.16px] leading-[25.13px]",
        )}
      >
        {player.isYou ? youLabel : player.name}
      </span>
      {/* "joined" / "left", for a moment, springing in beside the name so
          the change is noticed (owner's ask). */}
      {/* Asked, not here. Unlike the notes below this one stays for as long
          as the invitation is outstanding, and goes when they arrive. */}
      {player.pending && !player.note && (
        <span className="ml-2 shrink-0 rounded-full bg-[#402666]/10 px-2 py-0.5 font-[Nunito] text-[11px] font-bold leading-4 text-[#402666]/60">
          {invitedLabel}
        </span>
      )}
      <AnimatePresence initial={false}>
        {player.note && (
          <motion.span
            key={player.note}
            initial={{ opacity: 0, x: -8, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 480, damping: 26 }}
            className={cn(
              "ml-2 shrink-0 rounded-full px-2 py-0.5 font-[Nunito] text-[11px] font-bold leading-4",
              "bg-[#402666]/10 text-[#402666]/60",
            )}
          >
            {leftLabel}
          </motion.span>
        )}
      </AnimatePresence>
      {player.score !== undefined && (
        <span className="ml-2 flex shrink-0 items-center gap-1">
          <span className="font-[Nunito] text-[16px] font-bold leading-6 tracking-[-0.16px] text-[#402666]">{player.score}</span>
          <span className="font-[Nunito] text-[12px] leading-4 tracking-[-0.16px] text-black/60">({roundsLabel(player.rounds ?? 0)})</span>
        </span>
      )}
    </Tag>
  );

  // The crown, said once. It used to be said twice on the host's own row —
  // one tipped over the avatar and one in the armband at the far end — which
  // read as two different marks meaning two different things. The armband is
  // the one that stays: it is the mark the captain wears everywhere else in
  // the app, and it is a control on the rows where the crown can be passed.
  const armbandClass = cn(
    "shrink-0 items-center justify-center rounded-full bg-white/60 flex",
    compact ? "ml-1 h-7 w-7" : "ml-2 h-9 w-9",
    RULE_BORDER,
  );
  const crownClass = compact ? "h-4 w-4 object-contain" : "h-5 w-5 object-contain";
  const armband = player.isCaptain ? (
    player.onCaptainPress ? (
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={player.onCaptainPress}
        aria-label={captainLabel}
        className={armbandClass}
      >
        <img alt="" src={crownIcon} className={crownClass} />
      </motion.button>
    ) : (
      <span aria-label={captainLabel} className={armbandClass}>
        <img alt="" src={crownIcon} className={crownClass} />
      </span>
    )
  ) : null;

  // The word next to the bell: "call them back", said once, in text, so the
  // badge on the face is not the only thing carrying the meaning.
  const call =
    player.offline && player.onCall ? (
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={player.onCall}
        aria-label={callLabel}
        className={cn(
          "shrink-0 truncate rounded-full bg-amber-400 font-[Nunito] font-bold text-[#402666] shadow-sm",
          compact ? "ml-1 px-2 py-1 text-[11px] leading-3" : "ml-2 px-3 py-1.5 text-[13px] leading-4",
        )}
      >
        {callLabel}
      </motion.button>
    ) : null;

  // The way to become friends, on the row of somebody who is not one yet:
  // a + beside their score, a tick once it has been sent. A sibling of the
  // row's body, not inside it — the body is itself a button on the rows the
  // host can tap, and a button in a button is not a thing.
  const addFriendClass = cn(
    "shrink-0 flex items-center justify-center rounded-full",
    compact ? "ml-1 h-7 w-7" : "ml-2 h-9 w-9",
    RULE_BORDER,
  );
  const addFriendIcon = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const addFriend = player.friendRequested ? (
    <span aria-label={friendRequestedLabel} className={cn(addFriendClass, "bg-[#10b981]/15 text-[#10b981]")}>
      <Check className={addFriendIcon} strokeWidth={2.75} />
    </span>
  ) : player.onAddFriend ? (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={player.onAddFriend}
      aria-label={addFriendLabel}
      className={cn(addFriendClass, "bg-white/60 text-[#8858d5]")}
    >
      <UserPlus className={addFriendIcon} strokeWidth={2.5} />
    </motion.button>
  ) : null;

  // The host's bin. The last thing on the row, after the friendlier
  // controls, in the red the app uses for "gone for good" — and a sibling
  // of the body for the same reason the + is: the body is a button.
  const remove = player.onRemove ? (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={player.onRemove}
      aria-label={removeLabel}
      className={cn(addFriendClass, "bg-white/60 text-[#e0245e]")}
    >
      <Trash2 className={addFriendIcon} strokeWidth={2.5} />
    </motion.button>
  ) : null;

  return (
    <div
      className={cn(
        "relative flex w-full items-center rounded-[20px]",
        compact ? "h-[58px] pl-[6px] pr-[8px]" : "h-[70px] pl-[8px] pr-[15px]",
        RULE_BORDER,
        player.pending && "opacity-60",
      )}
    >
      {Body}
      {addFriend}
      {call}
      {armband}
      {remove}
    </div>
  );
}
