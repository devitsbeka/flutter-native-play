import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Swords, Users, Send, X, Plus, UserPlus, Check } from "lucide-react";
import { RoomParticipant } from "@/hooks/useGameRoom";
import { MatchHistoryEntry } from "@/hooks/useRoomMatchHistory";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFriends } from "@/contexts/FriendsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParticipantPresence } from "@/hooks/useParticipantPresence";
import { useAuth } from "@/hooks/useAuth";
import { shouldOfferFriendRequest } from "@/utils/friendOffer";
import crownIcon from "@/assets/crown-icon.png";
import medalGold from "@/assets/icons/medal-gold.png";
import medalSilver from "@/assets/icons/medal-silver.png";
import medalBronze from "@/assets/icons/medal-bronze.png";

interface RoomScoreboardProps {
  participants: (RoomParticipant & { total_score?: number })[];
  matches: MatchHistoryEntry[];
  currentUserId?: string;
  showHostCrown?: boolean;
  maxPlayers?: number;
  isHost?: boolean;
  isRoomActive?: boolean;
  onInviteFriends?: () => void;
  onResendInvitation?: (userId: string) => void;
  /** Host only: nudge a player who already has a seat to come and play now. */
  onInvitePlayer?: (userId: string) => void | Promise<void>;
  onRemoveParticipant?: (participantId: string) => void;
}

/**
 * How long an arrival is celebrated for.
 *
 * It was 1.6s and rose-and-fell in one motion, which on a phone in a pocket
 * is over before it is looked at. Three and a half seconds, and shaped to
 * hold: a fast ramp, a plateau that is actually visible, then a slow fade
 * into the steady ring underneath. The ring is what remains — the glow says
 * "they just arrived", the ring says "they are here".
 */
const ARRIVAL_GLOW = { duration: 3.5, times: [0, 0.12, 0.55, 1] };

/**
 * The presence ring, written as a shadow rather than as `ring-2`.
 *
 * It has to be, because the same element animates its `boxShadow`. Tailwind's
 * ring utilities ARE a box-shadow — `--tw-ring-shadow` composed into the
 * shadow list — so an inline `style.boxShadow`, which is what framer-motion
 * writes on every frame, replaces the ring outright. The class was on the
 * element the whole time and never painted: an online player got the soft
 * glow alone, which over a dark gradient reads as an uneven smudge under the
 * avatar rather than as a stroke around it, and an offline player got nothing.
 *
 * So the stroke and the glow are one shadow list, and both states carry two
 * shadows so the two can interpolate into each other.
 */
const RING_ONLINE = "0 0 0 2px rgba(52,211,153,0.95)";
const RING_OFFLINE = "0 0 0 2px rgba(148,163,184,0.75)";
/** Small enough to read as presence, not as a light source. */
const GLOW_STEADY = "0 0 8px 2px rgba(52,211,153,0.35)";
const GLOW_NONE = "0 0 0px 0px rgba(52,211,153,0)";

const ringShadow = (isOnline: boolean) =>
  isOnline ? `${RING_ONLINE}, ${GLOW_STEADY}` : `${RING_OFFLINE}, ${GLOW_NONE}`;

/** The flare: the ring holds still underneath while the glow swells and fades. */
const arrivalShadows = (peak: string) => [
  `${RING_ONLINE}, ${GLOW_NONE}`,
  `${RING_ONLINE}, ${peak}`,
  `${RING_ONLINE}, ${peak}`,
  `${RING_ONLINE}, ${GLOW_STEADY}`,
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <img src={medalGold} alt="1st" className="w-6 h-6 object-contain" />;
    case 2:
      return <img src={medalSilver} alt="2nd" className="w-6 h-6 object-contain" />;
    case 3:
      return <img src={medalBronze} alt="3rd" className="w-6 h-6 object-contain" />;
    default:
      // White, like every other word in this panel. muted-foreground is a
      // dark grey meant for light surfaces, and this sits on the lobby's dark
      // glass — so first three showed their medals and everyone after them
      // got a number that read as black.
      return <span className="text-sm font-extrabold text-white">#{rank}</span>;
  }
};

/**
 * Add the player beside you in the lobby.
 *
 * The room is where players actually meet — seven of them on a scoreboard,
 * having just played fifteen rounds together — and there was no way to add
 * any of them from here. Adding a friend meant knowing their name and going
 * to find them.
 *
 * Hidden for yourself, for an invited placeholder who has not arrived, and
 * for someone already on the friends list. sendFriendRequest handles the
 * rest: it accepts a request they had already sent you rather than opening a
 * second one, and says so if you are already friends.
 */
function AddFriendButton({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { friends, sendFriendRequest } = useFriends();
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!shouldOfferFriendRequest(user?.id, userId, friends.map((f) => f.friendId))) {
    return null;
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      disabled={sending || sent}
      aria-label={t("extra.addFriendLabel")}
      onClick={async (e) => {
        // The row itself may open a profile; adding a friend is its own action.
        e.stopPropagation();
        setSending(true);
        const ok = await sendFriendRequest(userId);
        setSending(false);
        if (ok) setSent(true);
      }}
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
        sent ? "bg-emerald-500/25 text-emerald-300" : "bg-white/15 text-white hover:bg-white/25"
      }`}
    >
      {sent ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
    </motion.button>
  );
}

/**
 * Call a player who already has a seat back to the table.
 *
 * The room's roster outlives any one evening: everyone who ever played here is
 * still on this list, and most of them are not looking at the app. The `+` in
 * the header invites somebody NEW, and the green Send button belongs to a
 * placeholder who never arrived — so for the six people who have played here
 * fifteen times, the host had no way to say "we're playing now" short of
 * leaving the room and finding them somewhere else.
 *
 * Host only, and never against the host themselves.
 *
 * On a phone it is the icon alone. The row already carries a rank, an avatar,
 * a name, an add-friend button and a score, and a word on top of that pushed
 * the name into an ellipsis to make room for a label the icon already gives.
 * The wider screens keep the word, because there they cost nothing.
 */
function InvitePlayerButton({
  userId,
  onInvite,
  iconOnly = false,
}: {
  userId: string;
  onInvite: (userId: string) => void | Promise<void>;
  /** Phone widths: the paper-plane says it, so the word comes off. */
  iconOnly?: boolean;
}) {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // The tick means "asked, waiting". It does not have to retire itself any
  // more: the button is not rendered at all once they are online, so the
  // whole control disappears the moment the invite is answered.
  const showSent = sent;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      disabled={sending || showSent}
      aria-label={t("extra.inviteFriendBtn")}
      title={t("extra.inviteFriendBtn")}
      // touchAction: a parent that owns the gesture can otherwise take the
      // tap before this button sees it, and the button reads as dead. That
      // has happened twice in this app — "+ trivia" needed three taps, and
      // the friend rows in InviteFriendsModal needed their own touch handler.
      style={{ touchAction: "manipulation" }}
      onClick={async (e) => {
        // The row can open a profile; inviting is its own action.
        e.stopPropagation();
        e.preventDefault();
        if (sending || showSent) return;
        setSending(true);
        try {
          await onInvite(userId);
          setSent(true);
        } catch {
          // The caller has already said so in a toast. Staying un-green and
          // pressable again is the whole of this side's response.
        } finally {
          setSending(false);
        }
      }}
      className={`flex flex-shrink-0 items-center justify-center transition-colors ${
        // A circle at icon size, a pill when it carries a word. Squeezing a
        // label into the circle is what made it an oval nothing else matched.
        iconOnly ? "h-7 w-7 rounded-full" : "gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      } ${
        showSent
          ? "bg-emerald-500/25 text-emerald-300"
          : "bg-white/15 text-white hover:bg-white/25"
      }`}
    >
      {showSent ? (
        <Check className={iconOnly ? "h-3.5 w-3.5" : "h-3 w-3"} />
      ) : (
        <Send className={iconOnly ? "h-3.5 w-3.5" : "h-3 w-3"} />
      )}
      {/* No "sent" caption. The invite's real outcome is the player turning
          up, and their avatar says that — a green ring the moment they are in
          the app. A word here claimed the outcome the instant the row was
          written, and then sat there unchanged whether they came or not. */}
      {!iconOnly && !showSent && t("extra.inviteFriendBtn")}
    </motion.button>
  );
}

/**
 * The avatar, ringed green while its owner is in the app, and flaring once at
 * the moment they arrive.
 *
 * Two different facts, drawn as one thing on purpose. The ring is a state —
 * green while they are in the app, grey once their heartbeat dries up, so at
 * a glance the scoreboard says who could actually play right now. It is drawn
 * in both states rather than switched off: a ring that disappears changes the
 * circle's size as well as its colour, and a row of avatars where some carry
 * a stroke and some do not reads as a rendering fault rather than as two
 * kinds of player.
 * The flare is an event, and it fires exactly once per arrival: it is what
 * turns "the list changed while I was looking elsewhere" into something the
 * host can see happen, which is the whole reason to send an invite and wait.
 */
function PresenceAvatar({
  avatarUrl,
  nickname,
  isOnline,
  justArrived,
  dimmed,
  crown,
}: {
  avatarUrl: string | null;
  nickname: string;
  isOnline: boolean;
  justArrived: boolean;
  dimmed: boolean;
  crown: boolean;
}) {
  return (
    // Colour is presence. Someone who is not in the app right now is drawn in
    // grey, so a glance at the board separates who could play from who would
    // have to be fetched — which is the question a host is asking when they
    // look at it.
    <div className={`relative flex-shrink-0 ${dimmed || !isOnline ? "grayscale" : ""}`}>
      <motion.div
        // Sized and flex, not left to its content. The ring is a box-shadow on
        // THIS element, so its shape is this element's shape — and a plain
        // block wrapped around an inline-block avatar is a line box, which can
        // carry the font's descent under the circle. Chromium measures it
        // square; the device drew an egg, with the extra height showing as a
        // gap between the avatar and the bottom of the ring. A flex box of a
        // stated size has no line box and no opinion about baselines.
        className="flex h-12 w-12 rounded-full"
        // Keyed on the arrival so remounting is not needed to replay it; a
        // glow that cannot repeat would only ever be seen by whoever happened
        // to be looking the first time.
        // Three states, not two. The flare is the arrival and fires once; the
        // steady glow is the standing fact that they are here, and it stays
        // until they leave; no glow at all means offline. The glow used to
        // fall back to nothing the moment the flare finished, so a player who
        // was plainly in the app looked identical to one who had gone.
        animate={
          justArrived
            ? { boxShadow: arrivalShadows("0 0 16px 5px rgba(52,211,153,0.8)") }
            : { boxShadow: ringShadow(isOnline) }
        }
        transition={justArrived ? ARRIVAL_GLOW : { duration: 0.2 }}
      >
        <SmartAvatar avatarUrl={avatarUrl} fallback={nickname} size="md" />
      </motion.div>
      {crown && (
        <img
          src={crownIcon}
          alt=""
          className="pointer-events-none absolute -bottom-1 -left-1 w-4 h-4 object-contain drop-shadow"
        />
      )}
    </div>
  );
}

/**
 * One half of the two-player face-off.
 *
 * Drawn twice from here rather than written out twice, which is what let the
 * two halves drift apart: as two copies each column was only as tall as its
 * own contents, and one extra control on one side — an add-friend button the
 * other player did not qualify for — slid that entire column relative to its
 * opponent. Everything below sits in a slot of a fixed height, so the two
 * sides line up row for row whatever either is carrying.
 */
function VsPlayer({
  player,
  currentUserId,
  showHostCrown,
  isHost,
  isRoomActive,
  isMobile,
  online,
  arrived,
  flag,
  sentInvites,
  onResendInvitation,
  onInvitePlayer,
  onMarkSent,
}: {
  player: RoomParticipant & { total_score?: number };
  currentUserId?: string;
  showHostCrown: boolean;
  isHost: boolean;
  isRoomActive: boolean;
  isMobile: boolean;
  online: Set<string>;
  arrived: Set<string>;
  flag: string;
  sentInvites: Set<string>;
  onResendInvitation?: (userId: string) => void;
  onInvitePlayer?: (userId: string) => void | Promise<void>;
  onMarkSent: (userId: string) => void;
}) {
  const { t } = useLanguage();
  const isInvited = (player.status as string) === "invited";
  // Colour follows presence and nothing else. It used to be `!isInvited &&`,
  // which meant a player who was in the app right now was still drawn in grey
  // because their seat was booked with an invite they had not formally
  // accepted — the app saying "not here" about somebody plainly here. The
  // invited state has its own words and its own button; it does not get to
  // overrule the heartbeat.
  const isOnline = online.has(player.user_id);
  const justArrived = arrived.has(player.user_id);

  return (
    <div
      className={`flex w-full max-w-[140px] flex-col items-center text-center ${
        isInvited ? "opacity-60" : ""
      }`}
    >
      {/* Avatar. h-16 on the wrapper, so the crown and the ring — both of
          which paint outside the avatar's box — cannot change how far down
          the name starts. */}
      <div className={`relative h-16 w-16 ${!isOnline ? "grayscale" : ""}`}>
        {showHostCrown && player.is_host && !isInvited && (
          <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-500 fill-amber-400 z-10" />
        )}
        {/* The same ring as the ranked list — green online, grey offline — so
            a player is not online on one layout and grey on the other. */}
        <motion.div
          // Square by construction — see PresenceAvatar.
          className="flex h-16 w-16 rounded-full"
          animate={
            justArrived
              ? { boxShadow: arrivalShadows("0 0 20px 6px rgba(52,211,153,0.8)") }
              : { boxShadow: ringShadow(isOnline) }
          }
          transition={justArrived ? ARRIVAL_GLOW : { duration: 0.2 }}
        >
          <SmartAvatar avatarUrl={player.avatar_url} fallback={player.nickname} size="xl" />
        </motion.div>
        {/* The flag, bare and centred under the chin. It used to be a white
            disc pinned to the right, which at this size is a second badge
            competing with the crown for the same corner of a 64px circle —
            and the disc read as chrome rather than as a flag. A drop shadow
            does what the disc was there for: it holds the emoji apart from
            whatever the avatar's edge happens to be. */}
        <span className="pointer-events-none absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[26px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
          {flag}
        </span>
      </div>

      {/* Name: one line, fixed height, so a two-line name on one side cannot
          push that side's score below the other's. The top margin clears the
          flag, which now hangs below the avatar's box. */}
      <p
        className={`mt-6 h-5 w-full truncate text-sm font-medium leading-5 ${
          isInvited ? "text-white/50" : "text-white"
        }`}
      >
        {player.user_id === currentUserId ? t("extra.youLabel") : player.nickname}
      </p>

      {isInvited ? (
        <div className="mt-2 flex flex-col items-center">
          {isHost && sentInvites.has(player.user_id) ? (
            <>
              <span className="text-xs text-green-400 font-medium">{t("extra.sentLabel")}</span>
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xs text-white/50"
              >
                {t("extra.waitingLabel")}
              </motion.p>
            </>
          ) : (
            <>
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xs text-white/40 italic"
              >
                {t("extra.invitedEllipsis")}
              </motion.p>
              {isHost && (
                <div className="min-h-[36px] flex items-center justify-center mt-1">
                  <motion.button
                    onClick={async () => {
                      await onResendInvitation?.(player.user_id);
                      onMarkSent(player.user_id);
                    }}
                    className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium text-xs shadow-md flex items-center gap-1.5"
                    whileTap={{ scale: 0.95 }}
                  >
                    <Send className="w-3 h-3" />
                    {isRoomActive ? t("extra.resendInvite") : t("extra.sendInvite")}
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <span className="mt-2 h-8 text-2xl font-display font-bold leading-8 text-white">
            {player.total_score || 0}
          </span>
          <p className="h-4 text-xs leading-4 text-white/60">
            {t("extra.scoreboardRoundStats", {
              rounds: player.total_rounds_played || 0,
              wins: player.total_wins || 0,
            })}
          </p>
          {/* The action slot keeps its height whether or not it has anything
              in it — this is the row that used to shift one column against
              the other whenever only one player could be added as a friend. */}
          <div className="mt-1.5 flex min-h-[28px] items-center justify-center gap-1.5">
            <AddFriendButton userId={player.user_id} />
            {/* Nobody to invite: they are already in the app, and the glow
                says so. The button used to stay for a second ask, which put
                a call to action under a player who had plainly answered. */}
            {isHost && onInvitePlayer && player.user_id !== currentUserId && !isOnline && (
              <InvitePlayerButton
                userId={player.user_id}
                onInvite={onInvitePlayer}
                iconOnly={isMobile}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function RoomScoreboard({ participants, matches, currentUserId, showHostCrown = true, maxPlayers, isHost = false, isRoomActive = true, onInviteFriends, onResendInvitation, onInvitePlayer, onRemoveParticipant }: RoomScoreboardProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  // Everyone on the board, so an invited player lighting up is visible here
  // rather than only on the rooms list.
  const participantIds = useMemo(
    () => participants.map((p) => p.user_id).filter(Boolean),
    [participants]
  );
  const { online, arrived } = useParticipantPresence(participantIds);
  // Track sent invites for showing feedback
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  // Sort by total cumulative score (primary), then by total wins (secondary)
  const sortedParticipants = [...participants].sort(
    (a, b) => {
      const scoreA = (a as any).total_score || 0;
      const scoreB = (b as any).total_score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.total_wins || 0) - (a.total_wins || 0);
    }
  );

  const getFlagEmoji = (countryCode: string) => {
    try {
      const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return "🏳️";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden bg-white/10 border border-white/[0.12]"
    >
      {/* Header - Combined label with count */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-white/60" />
          <span className="font-semibold text-white text-[15.4px]">
            {t("extra.playersHeader")} {maxPlayers && <span className="text-white/60">({participants.length}/{maxPlayers})</span>}
          </span>
        </div>

        {isHost && onInviteFriends && (
          <motion.button
            type="button"
            onClick={onInviteFriends}
            whileTap={{ scale: 0.92 }}
            className="w-10 h-10 rounded-xl border border-dashed border-white/40 flex items-center justify-center"
            aria-label={t("extra.addFriendLabel")}
            title={t("extra.addFriendLabel")}
          >
            <Plus className="w-5 h-5 text-white/60" />
          </motion.button>
        )}
      </div>

      {/* Scoreboard Content */}
      <div className="p-3">
        {/* VS Display for 2 players.

            One component drawn twice, not two copies of the same ninety
            lines. The copies were the reason the two halves never lined up:
            each column was only as tall as its own contents, the row centred
            them against each other, and a single extra control on one side —
            an add-friend button the other player did not qualify for — slid
            that player's whole column up relative to their opponent. Names
            at different heights, scores at different heights, and a check
            mark dangling below one of them.

            Now the row aligns to the top and every element sits in a slot of
            a fixed height, so avatar lines up with avatar, name with name and
            score with score no matter what either side is carrying. */}
        {sortedParticipants.length === 2 ? (
          <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-start justify-items-center gap-2">
            <VsPlayer
              player={sortedParticipants[0]}
              currentUserId={currentUserId}
              showHostCrown={showHostCrown}
              isHost={isHost}
              isRoomActive={isRoomActive}
              isMobile={isMobile}
              online={online}
              arrived={arrived}
              flag={getFlagEmoji(sortedParticipants[0].country_code || "GE")}
              sentInvites={sentInvites}
              onResendInvitation={onResendInvitation}
              onInvitePlayer={onInvitePlayer}
              onMarkSent={(id) => setSentInvites((prev) => new Set([...prev, id]))}
            />

            {/* The swords, centred against the avatars rather than against
                the columns: mt-2 is half the 64px avatar less half its own
                48px. Against the columns it drifted with whichever side
                happened to be taller. */}
            <div className="mt-2 flex flex-shrink-0 flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"
                style={{ boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}
              >
                <Swords className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-xs text-white/60 mt-1 text-center">
                {t("extra.scoreboardRoundsLabel", { count: sortedParticipants[0].total_rounds_played || 0 })}
              </span>
            </div>

            <VsPlayer
              player={sortedParticipants[1]}
              currentUserId={currentUserId}
              showHostCrown={showHostCrown}
              isHost={isHost}
              isRoomActive={isRoomActive}
              isMobile={isMobile}
              online={online}
              arrived={arrived}
              flag={getFlagEmoji(sortedParticipants[1].country_code || "GE")}
              sentInvites={sentInvites}
              onResendInvitation={onResendInvitation}
              onInvitePlayer={onInvitePlayer}
              onMarkSent={(id) => setSentInvites((prev) => new Set([...prev, id]))}
            />
          </div>
        ) : (
          /* Multi-player list */
          <div className="space-y-2">
            {sortedParticipants.map((p, index) => {
              const isInvited = (p.status as string) === 'invited';
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-opacity ${
                    isInvited 
                      ? "bg-white/5 opacity-50" 
                      : p.user_id === currentUserId 
                        ? "bg-white/15" 
                        : "bg-white/5"
                  }`}
                >
                  {/* Rank - fixed width */}
                  <div className="w-7 flex items-center justify-center flex-shrink-0">
                    {isInvited ? (
                      <span className="text-xs text-white/40">...</span>
                    ) : (
                      getRankIcon(index + 1)
                    )}
                  </div>
                  
                  {/* Avatar: the host's crown on its corner, and a green ring
                      while its owner is in the app.

                      The crown used to trail the name, where it competed with
                      the add-friend and invite buttons for the same strip of
                      row and pushed longer names into an ellipsis. On the
                      avatar it belongs to the face rather than to the text,
                      which is also where the room cards have always put it. */}
                  <PresenceAvatar
                    avatarUrl={p.avatar_url}
                    nickname={p.nickname}
                    isOnline={online.has(p.user_id)}
                    justArrived={arrived.has(p.user_id)}
                    // Dimmed is for a seat nobody has taken. Somebody with a
                    // live heartbeat has taken it, whatever their row says.
                    dimmed={isInvited && !online.has(p.user_id)}
                    crown={showHostCrown && p.is_host && !isInvited}
                  />

                  {/* Name + Crown - flex grow. The add-friend button belongs
                      to the person, so it sits with their name rather than
                      out in the score column, where it read as part of the
                      score. */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <p className={`font-medium text-sm truncate ${isInvited ? "text-white/50" : "text-white"}`}>
                      {p.user_id === currentUserId ? t("extra.youLabel") : p.nickname}
                    </p>
                    {isInvited && (
                      <span className="text-xs text-white/40 italic">{t("extra.invitedLabel")}</span>
                    )}
                    {!isInvited && <AddFriendButton userId={p.user_id} />}
                    {isHost && !isInvited && onInvitePlayer && p.user_id !== currentUserId && !online.has(p.user_id) && (
                      <InvitePlayerButton
                        userId={p.user_id}
                        onInvite={onInvitePlayer}
                        iconOnly={isMobile}
                      />
                    )}
                  </div>

                  {/* Score + Rounds - fixed width, right aligned */}
                  {!isInvited ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-bold text-white">{(p as any).total_score || 0}</span>
                      <span className="text-xs text-white/60">
                        ({t("extra.roundsShort", { count: p.total_rounds_played || 0 })})
                      </span>
                    </div>
                  ) : isHost && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {sentInvites.has(p.user_id) ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-green-400 font-medium">{t("extra.sentLabel")}</span>
                            <motion.p 
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-[10px] text-white/50"
                            >
                              {t("extra.waitingLabel")}
                          </motion.p>
                        </div>
                      ) : (
                        <motion.button
                          onClick={async () => {
                            await onResendInvitation?.(p.user_id);
                            setSentInvites(prev => new Set([...prev, p.user_id]));
                          }}
                          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium text-xs shadow-md flex items-center gap-1.5"
                          whileTap={{ scale: 0.95 }}
                        >
                           <Send className="w-3 h-3" />
                           {isRoomActive ? t("extra.resendInvite") : t("extra.sendInvite")}
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Rounds */}
        {matches.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-[13.2px] text-white/50 mb-2">{t("extra.recentRoundsTitle")}</p>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {matches.slice(0, 5).map((match, index) => {
                const winner = match.player_scores?.find(p => p.user_id === match.winner_user_id);
                const isMyWin = match.winner_user_id === currentUserId;
                const displayedCount = Math.min(matches.length, 5);
                const roundNumber = displayedCount - index;
                
                return (
                  <div
                    key={match.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                      isMyWin ? "bg-green-500/20" : "bg-white/5"
                    }`}
                  >
                    <span className="text-white/50 w-6 text-center text-xs">#{roundNumber}</span>
                    <div className="w-5 flex items-center justify-center flex-shrink-0">
                      <img 
                        src={isMyWin ? medalGold : medalSilver} 
                        alt={isMyWin ? "Win" : "Loss"} 
                        className="w-5 h-5 object-contain" 
                      />
                    </div>
                    <span className="flex-1 font-medium truncate text-xs text-white/90">
                      {isMyWin 
                        ? t("extra.scoreboardYouWon")
                        : t("extra.scoreboardPlayerWon", { name: winner?.nickname || "?" })}
                    </span>
                    <span className="text-white/50 text-xs">{winner?.score || 0}pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
