import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Bell, BellRing, Loader2, Pencil, Play, Plus } from "lucide-react";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { cn } from "@/lib/utils";
import bgBlob1 from "@/assets/tb-lobby/bg-blob-1.jpg";
import bgBlob2 from "@/assets/tb-lobby/bg-blob-2.png";
import chipQuestion from "@/assets/lobby/chip-question.webp";
import chipTv from "@/assets/lobby/chip-tv.webp";
import crownIcon from "@/assets/lobby/crown.png";
import { resolveAvatarUrl, fallbackAvatarFor } from "@/utils/avatarUtils";

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
  /** For the row's tap: a profile, a seat menu. */
  onPress?: () => void;
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
  };
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
  /** Faces for the invite row: the player's friends, online first. */
  inviteFaces: { url: string | null; online?: boolean }[];
  onInvite?: () => void;
  /** Under the players list — results of a challenge, for instance. */
  playersExtra?: ReactNode;
  /**
   * The game's seat limits: how many it needs, how many it holds, how many
   * are taken (pending invites hold a seat). Stated on the rules tab,
   * counted under the players, and the invite line stands down when full.
   */
  capacity?: { min: number; max: number; taken: number; fullLabel: string };
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
  };
  /** Above the start button — an error the host must read, for instance. */
  footerExtra?: ReactNode;
  initialTab?: LobbyTab;
  /** Modals and sheets, rendered above everything. */
  children?: ReactNode;
}

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
  tv,
  labels,
  playersLayout = "stack",
  rules,
  rulesText,
  reward,
  rulesExtra,
  players,
  playersHint,
  inviteFaces,
  onInvite,
  playersExtra,
  capacity,
  start,
  footerExtra,
  initialTab = "rules",
  children,
}: UniversalLobbyProps) {
  const [tab, setTab] = useState<LobbyTab>(initialTab);
  const reduceMotion = useReducedMotion();

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

  const groups: LobbyPlayerGroup[] = isGrouped(players)
    ? players
    : [{ key: "all", players: players as LobbyPlayer[] }];

  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden safe-bleed"
      style={{ background: "#f5d9ff" }}
    >
      {/* Backdrop (1018:6748): the lilac blobs under a wash, then the scene
          blurred to a haze across the top two thirds. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <img alt="" src={bgBlob1} className="absolute inset-0 h-full w-full object-cover" />
        <img alt="" src={bgBlob2} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(249,219,255,0.5)_0%,rgba(249,219,255,0.3)_45%,rgba(249,219,255,0.5)_100%)]" />
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
        <div className="mx-auto flex w-full max-w-[700px] items-center justify-between md:max-w-[520px]">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="rounded-full p-2 transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-6 w-6 text-[#4b5563]" />
          </motion.button>
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

      {/* Body (1018:6818): chips, the name, the card. Scrolls itself — the
          document never does on the device. */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-[700px] flex-col px-4 md:max-w-[520px]">
          {category && (
            <motion.div {...arrive(0.24)} className="mt-[9px] shrink-0 pl-[9px] pr-[3px]">
              {/* Just the FIRST round — its category's icon and name, with a
                  "(+N)" when more rounds are queued (owner's ask; the list of
                  them read as clutter under the chip). Tapping the chip opens
                  the round list; the + queues another. */}
              <div className="flex h-[52px] items-stretch gap-2">
                <Chip
                  icon={chipQuestion}
                  iconSlug={category.iconSlug}
                  label={category.label}
                  trailing={category.trailing}
                  onPress={category.onPress}
                />
                {category.onAdd && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={category.onAdd}
                    aria-label="add category"
                    className={cn(
                      "flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[20px] bg-[rgba(252,247,255,0.6)]",
                      RULE_BORDER,
                    )}
                  >
                    <Plus className="h-6 w-6 text-[#402666]" strokeWidth={2.4} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* The room, said once and centred: its face, its name, how full
              it is (Figma 1059:532). 39px of air above the emblem and every
              spare pixel below the count, so the card underneath is the foot
              of the screen and sits 20px clear of Start rather than floating
              mid-air. The block claims nothing when the content is taller
              than the frame — there is no free space to claim — and the 12px
              floor keeps the emblem off the category chip in that case. */}
          <motion.div
            {...arrive(0.3)}
            className="flex min-h-[12px] flex-1 flex-col items-center pt-[39px]"
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
                {Math.min(capacity.taken, capacity.max)}/{capacity.max} {labels.players.toLowerCase()}
              </p>
            )}
          </motion.div>

          {/* The card (1018:6750 / 1018:5549) and its two tabs. */}
          <motion.section
            {...arrive(0.36)}
            className={cn(
              "relative mb-[20px] mt-[16px] w-full shrink-0 overflow-clip rounded-[24px] border-2 border-[rgba(255,255,255,0.6)] bg-[rgba(252,247,255,0.6)] px-[9px] pt-[9px]",
              CARD_SHADOW,
              // The stake's strip brings its own 22px foot; without one the
              // tab's content is the last thing in the card and pays for it.
              reward ? "pb-[22px]" : tab === "rules" ? "pb-[50px]" : "pb-[31px]",
            )}
          >
            <div className={cn("relative flex items-center rounded-[20px] p-[6px]", RULE_BORDER)}>
              {(["rules", "players"] as const).map((key) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className="relative flex-1 rounded-[16px] py-2 text-center font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px]"
                  >
                    {active && (
                      <motion.span
                        layoutId="lobby-tab-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-[16px] bg-[#402666] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)] drop-shadow-[0px_2px_4px_rgba(0,0,0,0.1)]"
                      />
                    )}
                    <span className={cn("relative", active ? "text-white" : "text-[#402666]")}>
                      {key === "rules" ? labels.rules : labels.players}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {tab === "rules" ? (
                <motion.div
                  key="rules"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col px-[3px]"
                >
                  {/* What the game IS, before what it is set to. The tab
                      opened on a column of dropdowns for years — a settings
                      sheet under a heading that promised rules — and the
                      rules themselves were written down nowhere in the app.
                      An uppercase label over a paragraph, one section each
                      (Figma 1059:532). */}
                  {rulesText && rulesText.length > 0 && (
                    <div className="flex flex-col gap-[36px] px-[23px] pb-[6px] pt-[27px]">
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
                  {/* What the host can still set — the count, the round
                      length, the TV. Under the rules, because a rule you
                      cannot change is still the thing you needed to read. */}
                  <div className="mt-[10px] flex flex-col gap-[15px] empty:hidden">
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
                          />
                        ))}
                        {group.footer}
                      </div>
                    ))
                  )}
                  {(playersHint || (capacity && capacity.taken >= capacity.max)) && (
                    <p className="mt-[20px] text-center font-[Nunito] text-[14px] font-medium leading-[18px] tracking-[-0.16px] text-[#402666]">
                      {capacity && capacity.taken >= capacity.max ? capacity.fullLabel : playersHint}
                    </p>
                  )}
                  {onInvite && !(capacity && capacity.taken >= capacity.max) && (
                    <LobbyInviteRow className="mt-[35px]" faces={inviteFaces} label={labels.invite} onPress={onInvite} />
                  )}
                  {playersExtra}
                </motion.div>
              )}
            </AnimatePresence>

            {/* The stake, on the card's own foot rather than inside a tab
                (Figma 1059:532): what this room is played for is true of the
                room, not of whichever tab happens to be open. */}
            {reward && (
              <div className="mx-[3px] mt-[36px] flex h-[66px] items-center justify-between rounded-[20px] border border-[rgba(128,94,143,0.23)] bg-[#fdfbff] pl-[19px] pr-[15px] shadow-[0px_5px_0px_#d3c5db]">
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
          </motion.section>
        </div>
      </div>

      {/* Footer (1059:532): Start Game, and nothing else — no rule above it
          and no padding of its own. The card's 20px is the whole gap, which
          is what the divider and a second 16px of padding were quietly
          turning into 36. */}
      <motion.div {...arrive(0.42)} className="relative z-20 shrink-0 px-4 pb-4">
        <div className="mx-auto w-full max-w-[700px] md:max-w-[520px]">
          {footerExtra}
          {!start.captionOnly && (
          <motion.button
            type="button"
            whileTap={start.disabled ? undefined : { scale: 0.98 }}
            onClick={start.onPress}
            disabled={start.disabled}
            className={cn(
              "relative h-[60px] w-full overflow-hidden rounded-[20px] transition-opacity",
              start.disabled && "opacity-50",
            )}
            style={{ background: "linear-gradient(180deg, #8858d5 0%, #8858d5 50%, rgba(136,88,213,0.9) 100%)" }}
          >
            <span className="absolute inset-0 rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0)_100%)]" />
            <span className="absolute left-2 right-2 top-0 h-px rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.5)_50%,rgba(255,255,255,0)_100%)]" />
            <span className="absolute inset-x-0 bottom-0 h-5 rounded-b-[20px] bg-[linear-gradient(0deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0)_100%)]" />
            <span className="relative flex h-full items-center justify-center gap-2 font-[Nunito] text-[18px] font-semibold leading-[28px] tracking-[-0.16px] text-white">
              {start.loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                start.icon ?? <Play className="h-5 w-5" strokeWidth={1.67} />
              )}
              {start.label}
            </span>
          </motion.button>
          )}
          {start.caption && (
            <p className="text-center font-[Nunito] text-[15px] font-semibold leading-[20px] text-[#402666]/70 [&:not(:first-child)]:mt-2">
              {start.caption}
            </p>
          )}
        </div>
      </motion.div>

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
 * The invite line (1018:5480): up to three friends' faces in gradient
 * rings, then the dashed green + and the word. Exported so a lobby with
 * more than one bench (the arena) can put one under each side.
 */
export function LobbyInviteRow({
  faces,
  label,
  onPress,
  className,
}: {
  faces: { url: string | null; online?: boolean }[];
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

function RoomTitle({
  name,
  icon,
  editable = false,
}: {
  name: string;
  icon?: string | null;
  editable?: boolean;
}) {
  // Stacked and centred (Figma 1059:532): the emblem at 91px, the name
  // under it at 43.656 on 51.36, capped at two lines.
  //
  // These two spent a while side by side, at 34px, to buy back the row an
  // icon above a 52px heading was costing on a short screen. The design
  // answers that differently: the name IS the screen above the card, so it
  // gets the size back, and the slack it needs comes out of the empty lilac
  // that used to sit under the card rather than out of the heading.
  //
  // The pencil rides on the emblem's shoulder — one control, whichever half
  // is tapped, opening the sheet that sets both the name and the face.
  const heading = (
    <h1 className="w-[321px] max-w-full text-center font-hero text-[43.656px] capitalize leading-[51.36px] tracking-[-0.2054px] text-[#402666] [overflow-wrap:anywhere] line-clamp-2">
      {name}
      {/* A room with no emblem has nowhere to hang the pencil, so it rides
          the name instead — the same chip, on the only half there is. */}
      {!icon && editable && (
        <span className="ml-1.5 inline-flex size-[22px] shrink-0 translate-y-[10px] items-center justify-center rounded-full bg-white drop-shadow-[0px_2px_2px_rgba(0,0,0,0.18)]">
          <Pencil className="size-3 text-[#523b76]" />
        </span>
      )}
    </h1>
  );
  if (!icon) return heading;
  return (
    <>
      <span className="relative mb-[15px] block size-[91px] shrink-0">
        <img
          alt=""
          src={icon}
          className="size-full object-contain drop-shadow-[0_4px_10px_rgba(88,50,160,0.22)]"
        />
        {editable && (
          <span className="absolute left-[65px] top-[4px] flex size-[22px] items-center justify-center rounded-full bg-white drop-shadow-[0px_2px_2px_rgba(0,0,0,0.18)]">
            <Pencil className="size-3 text-[#523b76]" />
          </span>
        )}
      </span>
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
  icon,
  iconSlug,
  iconShadow,
  label,
  trailing,
  onPress,
}: {
  icon: string;
  /** The category's own icon. When set it replaces the static art — the
      first round wears its category's face, not a generic question mark. */
  iconSlug?: string | null;
  iconShadow?: boolean;
  label: string;
  /** A note pinned to the far right of the chip — "+5" extra rounds. */
  trailing?: string;
  onPress?: () => void;
}) {
  const Tag = onPress ? motion.button : motion.div;
  return (
    <Tag
      type={onPress ? "button" : undefined}
      whileTap={onPress ? { scale: 0.96 } : undefined}
      onClick={onPress}
      className={cn(
        "relative flex h-[52px] min-w-0 flex-1 items-center gap-2 rounded-[20px] bg-[rgba(252,247,255,0.6)] px-3 text-left",
        RULE_BORDER,
      )}
    >
      {iconSlug ? (
        <span className="pointer-events-none shrink-0">
          <DynamicIcon slug={iconSlug} size={32} />
        </span>
      ) : (
        <img
          alt=""
          src={icon}
          style={{ filter: iconShadow ? "drop-shadow(2px -2px 0 rgba(0,0,0,0.12))" : undefined }}
          className="pointer-events-none h-8 w-8 shrink-0 object-contain"
        />
      )}
      <span className="min-w-0 flex-1 truncate font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
        {label}
      </span>
      {trailing && (
        <span className="ml-2 shrink-0 font-[Nunito] text-[16px] font-bold leading-[19.5px] tracking-[-0.16px] text-[#402666]/60">
          {trailing}
        </span>
      )}
    </Tag>
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
  compact = false,
}: {
  player: LobbyPlayer;
  youLabel: string;
  roundsLabel: (count: number) => string;
  captainLabel: string;
  callLabel: string;
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
          )}
        >
          {player.avatarUrl && <img alt="" src={player.avatarUrl} className="h-full w-full object-cover" />}
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
      {call}
      {armband}
    </div>
  );
}
