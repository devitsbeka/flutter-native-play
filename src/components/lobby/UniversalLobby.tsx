import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Bell, Loader2, Play, Plus } from "lucide-react";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import { cn } from "@/lib/utils";
import bgBlob1 from "@/assets/tb-lobby/bg-blob-1.jpg";
import bgBlob2 from "@/assets/tb-lobby/bg-blob-2.png";
import chipQuestion from "@/assets/lobby/chip-question.webp";
import chipTv from "@/assets/lobby/chip-tv.webp";
import crownIcon from "@/assets/lobby/crown.png";

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
  /** The host renames by tapping the name; a guest gets the name alone. */
  onRename?: () => void;
  onBack: () => void;
  unreadCount?: number;
  /** The left chip. Hidden when the mode has no category to pick. */
  category?: { label: string; onPress?: () => void };
  /** The right chip. Hidden when the mode cannot play on a TV. */
  tv?: { label: string; onPress?: () => void };
  /** Copy for the two tabs. */
  labels: {
    rules: string;
    players: string;
    invite: string;
    you: string;
    /** "(0r)" — the rounds played, short. */
    rounds: (count: number) => string;
  };
  rules: LobbyRuleRow[];
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
  onRename,
  onBack,
  unreadCount = 0,
  category,
  tv,
  labels,
  rules,
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
        {/* The card grows into the screen: it arrives sharp, at the size and
            corner radius it had in the carousel, swells to fill the top of
            the screen and dissolves into its own blur. */}
        <motion.div
          className="absolute inset-x-0 bottom-0 top-[-54px] overflow-hidden"
          // The frame (1018:6748) stops the scene at 667 of its 946: on a
          // phone that edge landed across the card as a hard line. The haze
          // runs to the bottom of the screen instead (owner's call), where
          // the card and the footer sit over it anyway.
          style={{ transformOrigin: "50% 42%" }}
          initial={reduceMotion ? false : { scale: 0.72, borderRadius: 28 }}
          animate={{ scale: 1, borderRadius: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 26 }}
        >
          <motion.img
            alt=""
            src={sceneArt}
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0"
            style={{ filter: "blur(37px)" }}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
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
                  "linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.4) 100%), linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 24.438%), linear-gradient(180deg, rgba(216,178,232,0.7) 0%, rgba(216,199,237,0) 35.822%)",
              }}
            />
          </motion.div>
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
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full">
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
            </span>
          </div>
        </div>
      </motion.header>

      {/* Body (1018:6818): chips, the name, the card. Scrolls itself — the
          document never does on the device. */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-[700px] flex-col px-4 md:max-w-[520px]">
          {(category || tv) && (
            <motion.div {...arrive(0.24)} className="mt-[9px] flex h-[52px] shrink-0 items-start gap-2 pl-[9px] pr-[3px]">
              {category && (
                <Chip
                  icon={chipQuestion}
                  iconSize={60}
                  tint="from-[rgba(255,215,208,0.6)]"
                  labelShift={13}
                  label={category.label}
                  onPress={category.onPress}
                />
              )}
              {tv && (
                <Chip
                  icon={chipTv}
                  iconSize={56}
                  tint="from-[rgba(215,196,160,0.6)]"
                  labelShift={17}
                  label={tv.label}
                  onPress={tv.onPress}
                  iconShadow
                />
              )}
            </motion.div>
          )}

          <div className="min-h-[36px] flex-1" />

          {/* The room's name (1018:6828): Slackey, 52 on 62, two lines. */}
          <motion.div {...arrive(0.3)} className="shrink-0 pl-[9px]">
            {onRename ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={onRename}
                className="block w-full max-w-[456px] text-left"
              >
                <RoomTitle name={roomName} />
              </motion.button>
            ) : (
              <div className="max-w-[456px]">
                <RoomTitle name={roomName} />
              </div>
            )}
          </motion.div>

          {/* The card (1018:6750 / 1018:5549) and its two tabs. */}
          <motion.section
            {...arrive(0.36)}
            className={cn(
              "relative mb-[7px] mt-[35px] w-full shrink-0 overflow-clip rounded-[24px_24px_54px_24px] border-2 border-[rgba(255,255,255,0.6)] bg-[rgba(252,247,255,0.6)] px-[9px] pt-[9px]",
              CARD_SHADOW,
              tab === "rules" ? "pb-[50px]" : "pb-[31px]",
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
                  className="mt-[10px] flex flex-col gap-[15px] px-[3px]"
                >
                  {capacity && (
                    <LobbyInfoRow label={labels.players}>
                      {capacity.min === capacity.max ? capacity.min : `${capacity.min}–${capacity.max}`}
                    </LobbyInfoRow>
                  )}
                  {rules.map((row) => (
                    <div
                      key={row.key}
                      className={cn("flex h-[84px] items-center justify-between rounded-[20px] pl-[26px] pr-[13px]", RULE_BORDER)}
                    >
                      <span className="font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
                        {row.label}
                      </span>
                      <Segmented row={row} />
                    </div>
                  ))}
                  {rulesExtra}
                </motion.div>
              ) : (
                <motion.div
                  key="players"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="mt-[16px] flex flex-col px-[3px]"
                >
                  {groups.map((group) => (
                    <div key={group.key} className="flex flex-col gap-[10px]">
                      {group.title}
                      {group.players.map((p) => (
                        <PlayerRow key={p.id} player={p} youLabel={labels.you} roundsLabel={labels.rounds} />
                      ))}
                      {group.footer}
                    </div>
                  ))}
                  {capacity && (
                    <p className="mt-[14px] text-center font-[Nunito] text-[13px] font-semibold leading-4 tracking-[-0.16px] text-[#402666]/60">
                      {Math.min(capacity.taken, capacity.max)}/{capacity.max} {labels.players.toLowerCase()}
                    </p>
                  )}
                  {(playersHint || (capacity && capacity.taken >= capacity.max)) && (
                    <p className="mt-[20px] text-center font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
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
          </motion.section>
        </div>
      </div>

      {/* Footer (1018:6840): Start Game. */}
      <motion.div
        {...arrive(0.42)}
        className="relative z-20 shrink-0 border-t border-[rgba(229,231,235,0.3)] px-4 pb-4 pt-4"
      >
        <div className="mx-auto w-full max-w-[700px] md:max-w-[520px]">
          {footerExtra}
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
          {start.caption && (
            <p className="mt-2 text-center font-[Nunito] text-[13px] font-medium leading-[18px] text-[#402666]/70">
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
                  {face.url && <img alt="" src={face.url} className="h-full w-full object-cover" />}
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

function RoomTitle({ name }: { name: string }) {
  return (
    <h1 className="font-hero text-[52px] capitalize leading-[62px] tracking-[-0.16px] text-[#402666] [overflow-wrap:anywhere]">
      {name}
    </h1>
  );
}

/** One of the two chips over the scene (1018:6824 / 1018:6820). */
function Chip({
  icon,
  iconSize,
  iconShadow,
  tint,
  labelShift,
  label,
  onPress,
}: {
  icon: string;
  iconSize: number;
  iconShadow?: boolean;
  tint: string;
  labelShift: number;
  label: string;
  onPress?: () => void;
}) {
  const Tag = onPress ? motion.button : motion.div;
  return (
    <Tag
      type={onPress ? "button" : undefined}
      whileTap={onPress ? { scale: 0.96 } : undefined}
      onClick={onPress}
      className={cn(
        "relative h-[52px] min-w-0 flex-1 rounded-[24px_24px_24px_54px] border-2 border-[rgba(255,255,255,0.6)] bg-gradient-to-b to-[rgba(252,247,255,0.6)] text-left",
        tint,
        CARD_SHADOW,
      )}
    >
      <img
        alt=""
        src={icon}
        style={{
          width: iconSize,
          height: iconSize,
          left: -9,
          top: 5,
          filter: iconShadow ? "drop-shadow(4px -4px 0 rgba(0,0,0,0.15))" : undefined,
        }}
        className="pointer-events-none absolute z-10 object-contain"
      />
      <span
        className="absolute inset-0 flex items-center justify-center pl-[48px] pr-3"
        style={{ paddingLeft: 48 + labelShift }}
      >
        <span className="truncate bg-gradient-to-b from-[#583e19] to-[#2e2c2a] bg-clip-text font-[Nunito] text-[16.16px] font-black leading-[25.13px] tracking-[-0.146px] text-transparent">
          {label}
        </span>
      </span>
    </Tag>
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
}: {
  player: LobbyPlayer;
  youLabel: string;
  roundsLabel: (count: number) => string;
}) {
  const Tag = player.onPress ? motion.button : "div";
  return (
    <Tag
      type={player.onPress ? "button" : undefined}
      whileTap={player.onPress ? { scale: 0.99 } : undefined}
      onClick={player.onPress}
      className={cn(
        "relative flex h-[70px] w-full items-center rounded-[20px] pl-[8px] pr-[15px] text-left",
        RULE_BORDER,
        player.pending && "opacity-60",
      )}
    >
      <span className="relative shrink-0">
        <span className="block h-12 w-12 overflow-hidden rounded-full bg-[#e9d8ff] shadow-[0px_0px_0px_2px_rgba(148,163,184,0.75)]">
          {player.avatarUrl && <img alt="" src={player.avatarUrl} className="h-full w-full object-cover" />}
        </span>
        {player.isHost && (
          <img alt="" src={crownIcon} className="pointer-events-none absolute left-[24px] top-[-16px] h-7 w-7 object-contain" />
        )}
      </span>
      <span className="ml-2 min-w-0 flex-1 truncate bg-gradient-to-b from-[#565656] to-black bg-clip-text font-[Nunito] text-[16.16px] font-black leading-[25.13px] tracking-[-0.146px] text-transparent opacity-60">
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
}
