import { useMemo, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { CoinDeltaPill } from "@/components/game/CoinDeltaPill";
import { useMultiplayerV2, settleMostLikelyVotes } from "@/contexts/MultiplayerContextV2";
import { activeRoundPlayers } from "@/utils/roundPlayers";
import { playersStillOut, roundSettleTiming } from "@/utils/roundSettlement";
import { useMissions } from "@/hooks/useMissions";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRoomCategoryQueue } from "@/hooks/useRoomCategoryQueue";
import { supabase } from "@/integrations/supabase/client";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";
import { useChallengeShare } from "@/hooks/useChallengeShare";
import { ArrowLeft, Crown, Shuffle, Library, ChevronRight, Loader2, Gift, Share2, ListOrdered, X } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import { toast } from "@/lib/toast";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { CategoryPickerModal } from "./CategoryPickerModal";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { isUndecidedRound, UNDECIDED_ICON_SLUG } from "@/utils/undecidedRound";
import { useCategoryIdentity } from "@/hooks/useCategoryIdentity";
import { RoomQueueSheet } from "./RoomQueueSheet";
import { calculateMultiplayerPayout } from "@/utils/multiplayerPayout";
import { useRoomPot, type RoomPotLine } from "@/hooks/useRoomPot";
import { useMatchInfo } from "@/hooks/useMatchInfo";
import { matchTotals } from "@/hooks/useMatchRounds";
import { useRoomRounds, type RoomRound } from "@/hooks/useRoomRounds";
import { FooterHaze } from "@/components/shared/FooterHaze";
import { isGuestAccount } from "@/utils/guestAccount";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { useCategoryIconByName, useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import { useRoomIconPool } from "@/hooks/useRoomIconPool";
import { dealtRoomIcon } from "@/utils/roomCrests";
import { useVipStatus } from "@/contexts/VipContext";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { applyRematchPick, sendRematchRequest, type RematchPick } from "@/utils/rematchRequests";
import { Lock } from "lucide-react";

// Games whose results were already counted on this device. Module-level (not a
// ref) because the results screen can remount for the SAME game (results ->
// lobby -> results bounce while a slow player finishes) and a per-mount ref
// would re-grant coins/stats and re-touch participant rows mid-next-round.
const processedResultsGames = new Set<string>();

/**
 * The podium, left to right: second, first, third. Indexes into the ranked
 * list — first place in the middle, taller than the two beside it.
 */
const PODIUM_ORDER = [1, 0, 2] as const;
/** Two players: side by side, centred - no empty third step (owner's ask). */
const TWO_UP_ORDER = [0, 1] as const;
/** How far above the footer its haze reaches (FooterHaze's top-[-120px]). */
const FOOTER_HAZE_PX = 120;
/** The screen's violet ground at the bottom of its gradient, as "r,g,b". */
const RESULTS_HAZE_TINT = "155,137,245";
/** The medal for the top three, the place number from fourth down. */
const placeMark = (idx: number, rank: number) =>
  idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${rank}`;

/**
 * What a seat's place was worth, under its medal: the prize less the stake,
 * signed, and nothing at all while the round is still settling or when it
 * settled nothing (practice, or a function that predates the deltas). Read
 * from the ledger via settle_room_round, never worked out here: the client
 * names no amounts (roomPot.test).
 */
/**
 * A seat's line, in the pill every results screen shares: green for a
 * place that paid, red for one that did not, a quiet pill for zero
 * (owner: "use them everywhere on results pages"). It used to be gold,
 * silver, bronze and white by place, which said where a seat came, not
 * what it won — the medal already says where.
 */
function PotLine({ net, compact }: { net: number | undefined; compact?: boolean }) {
  if (net === undefined) return null;
  return <CoinDeltaPill delta={net} size={compact ? "sm" : "md"} className={compact ? undefined : "mt-1.5"} />;
}

/**
 * The results tile — the lobby's chunky shape (Figma 1157:10225): 24px
 * corners, a rose wash and an 8px rose foot — and the eyebrow that titles
 * what is in it. Shared by the round's standings, the earlier rounds and the
 * match's final standings, so the three read as one thing.
 */
const TILE =
  "rounded-[24px] border-2 border-[rgba(255,217,217,0.1)] bg-[rgba(255,222,222,0.2)] px-3 py-3 shadow-[0px_2px_8px_0px_rgba(102,51,153,0.06),0px_8px_0px_0px_rgba(232,185,185,0.4)]";
const EYEBROW = "text-[12px] font-bold uppercase leading-[18px] tracking-[0.3px] text-white/60";

/** A round's pot, on the tile's title row. */
function PotPill({ amount }: { amount: number }) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-bold text-white">
      <img src={coinIcon} alt="" className="h-3.5 w-3.5 object-contain" />
      {t("extra.roundPotLabel", { amount: amount.toLocaleString() })}
    </span>
  );
}

/** A titled tile holding a list of StandingRows. */
function StandingsCard({
  title,
  pot,
  delay = 0.3,
  children,
}: {
  title: string;
  pot?: number;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={TILE}
      aria-label={title}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className={EYEBROW}>{title}</p>
        {pot !== undefined && pot > 0 && <PotPill amount={pot} />}
      </div>
      <ol className="space-y-1">{children}</ol>
    </motion.section>
  );
}

/**
 * The ring a place wears: gold, silver and bronze for the medals, plain
 * white from fourth down. The same gold the podium used, so the winner's
 * face is still the one thing on the screen that glows.
 */
const PLACE_RING = [
  "border-[#fcd34d] shadow-[0_0_0_3px_rgba(251,191,36,0.35)]",
  "border-[#d4d4d8] shadow-[0_0_0_3px_rgba(212,212,216,0.3)]",
  "border-[#d9884f] shadow-[0_0_0_3px_rgba(217,136,79,0.3)]",
] as const;

/**
 * One player's row: their place, their face, their name, and what the
 * round did for them — the score under the name, the coins on the right.
 *
 * A fixed height and a truncating name: ten of these stack, and none of
 * them cuts "TriviaMaster" down to "TriviaMas…" the way a third of the
 * width did. Yours is the row with the wash, so it can be found at a glance
 * in a list of ten.
 */
function StandingRow({
  idx,
  rank,
  name,
  avatarUrl,
  isMe,
  detail,
  net,
  onTap,
}: {
  idx: number;
  rank: number;
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
  /** Under the name: the score, where the row has one. */
  detail?: string;
  net: number | undefined;
  onTap?: () => void;
}) {
  const ring = PLACE_RING[idx] ?? "border-white/40";
  return (
    <li
      className={cn(
        "flex h-[60px] items-center gap-3 rounded-2xl px-2",
        isMe && "bg-white/15",
      )}
    >
      <span className="w-8 shrink-0 text-center font-display text-[20px] font-bold leading-none text-[#ffe9a8]">
        {placeMark(idx, rank)}
      </span>
      <div
        className={cn("shrink-0", onTap && "cursor-pointer active:scale-95 transition-transform")}
        onClick={onTap}
        role={onTap ? "button" : undefined}
      >
        <SafeAvatar
          avatarUrl={avatarUrl}
          fallback={name || "?"}
          className={cn("h-11 w-11 border-2", ring)}
          fallbackClassName="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-base font-bold"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[17px] font-bold leading-5 tracking-[-0.16px] text-white">
          {name}
        </p>
        {detail && <p className="truncate text-[12px] leading-4 text-white/60">{detail}</p>}
      </div>
      <PotLine net={net} compact />
    </li>
  );
}

interface RankedParticipant {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
  score: number;
  rank: number;
  isMe: boolean;
}

export function GameResultsScreenV2() {
  const navigate = useNavigate();
  const { user, profile, setProfileLocal } = useAuth();
  const { playSound, vibrate } = useSound();
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  const { settleRoomRound, readRoomRound } = useRoomPot();
  const { trackMissionEvent } = useMissions();
  const { openProfile } = usePlayerProfile();
  const [coinsEarned, setCoinsEarned] = useState(0);
  // What the stake cost when the pot went elsewhere — said out loud rather
  // than left as a balance that quietly dropped.
  const [coinsLost, setCoinsLost] = useState(0);
  // Every seat's line in the pot — what each place won or paid — so the
  // podium can say it under the medals, not only this player's own.
  const [potLines, setPotLines] = useState<Record<string, RoomPotLine>>({});
  /** The round-by-round sheet, open. */
  const [showRounds, setShowRounds] = useState(false);
  /**
   * The footer floats over the list of seats, behind the lobby's haze, so
   * the tiles keep going under the button — blurred, so you can see there
   * is more and that it scrolls (owner: "use same background blur behind
   * the button what we use in lobby in bottom"). The list pads its own
   * bottom by the footer's measured height plus the haze, so every tile
   * is still reachable.
   */
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
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [showQueueSheet, setShowQueueSheet] = useState(false);

  // Let the result land before asking for anything — the score is the reason
  // they played, and the ask reads as a reward rather than a toll gate.
  useEffect(() => {
    if (!isGuestAccount(user)) return;
    const timer = setTimeout(() => setShowGuestSignUp(true), 3000);
    return () => clearTimeout(timer);
  }, [user]);
  const {
    myScore: localMyScore,
    participants,
    resetMultiplayer,
    currentRoom,
    exitRoom,
    leaveRoomPermanently,
    continueInRoom,
    startNewRound,
    startNextFromQueue,
    isHost,
    isMostLikelyRound,
    hostIsObserver,
  } = useMultiplayerV2();

  // "Most Likely To" rounds settle server-side, and the totals snapshot
  // (complete_room_round) must not be claimed before the votes are in. Wait
  // until every active player finished; a player who quits without a trace
  // would hold that forever, so a timer eventually lets the round settle
  // with whatever votes exist.
  const [mltWaitExpired, setMltWaitExpired] = useState(false);
  useEffect(() => {
    if (!isMostLikelyRound) return;
    const timer = setTimeout(() => setMltWaitExpired(true), 60_000);
    return () => clearTimeout(timer);
  }, [isMostLikelyRound]);
  const mltAllVotersDone =
    !isMostLikelyRound ||
    mltWaitExpired ||
    activeRoundPlayers(participants, {
      hostIsObserver,
      hostUserId: currentRoom?.host_user_id,
    }).every(
      p =>
        p.status === "finished" ||
        (p.current_question ?? 0) >= (currentRoom?.total_questions ?? Infinity)
    );

  /**
   * A private round pays out when everybody has played it.
   *
   * Private rooms are invited friends playing at different times, so the
   * first player to finish arrives here with a scoreboard of one. Settling
   * then would rank a full room against that and pay out on it. The whole
   * chain — the round snapshot, the stats and the pot — waits until every
   * seat that can still answer has, or until the round's own deadline ends
   * the wait with whoever played (owner: "private rooms can be played in
   * different times and when all invited players play the round we give
   * rewards after that").
   *
   * A public room waits the same way, for minutes rather than a day
   * (PUBLIC_ROUND_DEADLINE_MS): it used to settle on the first player to
   * finish, and ranked the pot on a scoreboard of one.
   */
  const isPublicRoom = Boolean((currentRoom as { is_public?: boolean } | null)?.is_public);
  const roundCtx = { hostIsObserver, hostUserId: currentRoom?.host_user_id };
  const settleHold = roundSettleTiming({
    isPublic: isPublicRoom,
    participants,
    ctx: roundCtx,
    totalQuestions: currentRoom?.total_questions,
    startedAt: currentRoom?.started_at,
  });
  const waitingForPlayers = settleHold === "waiting_for_players";
  const stillOut = waitingForPlayers
    ? playersStillOut(participants, roundCtx, currentRoom?.total_questions).length
    : 0;

  const { queue, addToQueue } = useRoomCategoryQueue(currentRoom?.id || null);
  // The category this game was played in, resolved to its own slug and
  // icon_slug. See where it is drawn below for why both are needed.
  const resultsCategory = useCategoryIdentity(currentRoom?.category_id);
  // Whose room this is — so a results screen names its room. The host's icon,
  // else a random one dealt from the shared pool by room id (owner's rule).
  const roomIconPool = useRoomIconPool();
  const roomFace = currentRoom?.room_icon ?? (currentRoom ? dealtRoomIcon(currentRoom.id, roomIconPool) : null);
  const { share, sharing } = useChallengeShare();

  const [isStartingRematch, setIsStartingRematch] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  // A player who is not the host asking for a rematch — PRO only, with a
  // pick of their own. The picker is the host's; what happens on a pick is
  // not, so the two are told apart here.
  const { isVip } = useVipStatus();
  const [showAskPicker, setShowAskPicker] = useState(false);
  const [showAskWall, setShowAskWall] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [challengeQuestions, setChallengeQuestions] = useState<any[]>([]);
  const hasFetchedChallengeQuestions = useRef(false);

  /**
   * The best score seen for each player while this screen has been up.
   *
   * room_participants.score is live round state, not a record of what
   * happened. When the host starts the next round — or the realtime
   * subscription reconnects and finds the room still playing — every client
   * resets its OWN row to score 0, and it does that whether or not the
   * player is still reading the last round's result. So the scoreboard a
   * player was looking at rewrote itself to 0/0 while they waited for the
   * host, with the header still showing the XP the round had paid.
   *
   * Scores only ever climb during a round, so keeping the highest value seen
   * ignores the reset without needing to detect it, and still lets a score
   * that propagates late arrive. The header already did exactly this for the
   * player's own total (Math.max with localMyScore); the rows did not, which
   * is why the two disagreed.
   */
  const bestSeenScores = useRef<Map<string, number>>(new Map());
  for (const p of participants) {
    const seen = bestSeenScores.current.get(p.user_id) ?? 0;
    bestSeenScores.current.set(p.user_id, Math.max(seen, p.score || 0));
  }
  const roundScoreOf = (p: { user_id: string; score?: number | null }) =>
    Math.max(bestSeenScores.current.get(p.user_id) ?? 0, p.score || 0);

  // Sort participants by score and assign ranks — the seats the POT ranks,
  // which are the ones the round was played by. An invitation nobody
  // accepted and the observing host stood on the list on 0 points ("#4
  // Friend — 0 points" for someone who never arrived), and the places the
  // screen showed were not the places the pot paid. A seat that left
  // mid-round stays: it was staked, and the ledger has a line for it.
  const rankedParticipants: RankedParticipant[] = participants
    .filter((p) => (p.status as string) !== "invited")
    .filter((p) => !(hostIsObserver && p.user_id === currentRoom?.host_user_id))
    .sort((a, b) => roundScoreOf(b) - roundScoreOf(a))
    .map((p, index) => ({
      user_id: p.user_id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      country_code: p.country_code,
      score: roundScoreOf(p),
      rank: index + 1,
      isMe: p.user_id === user?.id,
    }));

  const myParticipant = rankedParticipants.find(p => p.isMe);
  // Use Math.max to handle race condition where DB score hasn't propagated yet
  const myScore = Math.round(Math.max(myParticipant?.score || 0, localMyScore));
  /**
   * My place — or nothing, when this screen cannot see my row yet.
   *
   * It used to fall back to `rankedParticipants.length`: absent from the
   * list was reported as LAST. A player who leaves and comes back arrives
   * here before their participant row is read back, so the winner was told
   * they came fourth while the list beside the words showed them first with
   * the top score. Being missing and coming last are different facts, and
   * only one of them is knowable here.
   */
  const myRank = myParticipant?.rank ?? null;

  const isWin = myRank === 1;
  const isPodium = myRank !== null && myRank <= 3;
  const result =
    myRank === null
      ? // Nothing to claim: the row is not here to read a place off. "Game
        // over" is true whatever the place turns out to be, where "4th
        // Place" over a list showing you first is not.
        t("extra.gameOver")
      : isWin
        ? t("game.victory")
        : isPodium
          ? t("game.placeFirst", { rank: myRank })
          : t("game.place", { rank: myRank });
  /**
   * The rank the PAYOUT uses, which cannot be null.
   *
   * Still last when the row is missing, deliberately: that is the smallest
   * reward, and paying out on a guess should err downwards. The display
   * above is what the owner reported and what changed; the money is left
   * exactly as it was.
   */
  const myRankForPayout = myRank ?? rankedParticipants.length;

  /**
   * A seat's line in the pot, for the podium. The server's per-seat lines
   * first; failing those, this player's own result — which the settlement
   * reports even when the function predates per-seat reporting — and
   * nothing for anyone else.
   */
  const netFor = (p: RankedParticipant): number | undefined => {
    const line = potLines[p.user_id];
    if (line) return line.net;
    if (p.isMe && (coinsEarned > 0 || coinsLost > 0)) return coinsEarned - coinsLost;
    return undefined;
  };

  /**
   * Which game this round belongs to, and which round of it this is
   * (useMatchInfo — the countdown reads the same). Null until read, and
   * hidden when the room predates the numbering.
   */
  const matchInfo = useMatchInfo(currentRoom?.id, currentRoom?.current_game_id);

  /**
   * The room, round by round: which category each round was, what its pot
   * was, and who won and who lost it — the ledger READ through
   * room_round_ledger for every round, once the current round's own lines
   * are in. Nothing settles on that read: it used to go through
   * settle_room_round, and a screen that only meant to look settled rounds
   * other players had not finished. The podium says what THIS round paid;
   * this says what every round paid (owner: "show what happened in rounds,
   * per match has its pot - we need to show it clear who won who lose per
   * round").
   */
  const hasPotLines = Object.keys(potLines).length > 0;
  /**
   * Every round the room has played, game by game (useRoomRounds), and every
   * seat's coins over all of them. The summary used to start at the current
   * match; a room on its third game could not say what game one paid
   * (owner: "show all rounds pot not only last game and show all coins
   * users won or lose, like summery of the all games"). Null until the
   * current round's own lines are in, so it never reads before the round
   * that just happened has been settled.
   */
  const roomRounds = useRoomRounds(currentRoom?.id, hasPotLines, readRoomRound);
  /** Newest game first, its rounds in play order — the one just played on top. */
  const roomGames = useMemo(() => {
    const byGame = new Map<number, RoomRound[]>();
    for (const round of roomRounds ?? []) byGame.set(round.game, [...(byGame.get(round.game) ?? []), round]);
    return [...byGame.entries()].sort((a, b) => b[0] - a[0]);
  }, [roomRounds]);
  const roomTotals = roomRounds && roomRounds.length >= 2 ? matchTotals(roomRounds) : null;
  /** Everything staked into this round — the pot the podium was played for. */
  const thisRoundPot = Object.values(potLines).reduce((sum, line) => sum + line.staked, 0);
  /** A past round's icon, off its stored name, when its questions carried none. */
  const iconForCategoryName = useCategoryIconByName();

  const hasUpdatedStats = useRef(false);

  // Victory/loss sound and confetti
  useEffect(() => {
    if (isWin) {
      playSound("game-win");
      vibrate([100, 50, 100]);
      
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#7C5CFC', '#F5A623', '#FFD6E0'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#7C5CFC', '#F5A623', '#FFD6E0'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else if (isPodium) {
      playSound("game-win");
      vibrate(100);
    } else {
      playSound("game-lose");
      vibrate(200);
    }
  }, [isWin, isPodium, playSound, vibrate]);

  // Update stats and save game
  useEffect(() => {
    // Key by game id so a remount for the same game can't double-count. Rooms
    // without a game id (legacy/RLS-blocked inserts) keep the per-mount guard
    // only - keying those by room id would block every later round's stats.
    const statsKey = currentRoom?.current_game_id || null;
    // Vote rounds hold the whole settlement chain until every voter finished
    // (or the wait expired): claiming complete_room_round earlier would
    // snapshot cumulative totals before the majority points exist.
    if (!mltAllVotersDone) return;
    // A private round holds the whole chain until everyone has played (or
    // the deadline ends the wait). Nothing is charged meanwhile: the stakes
    // are collected by the settlement itself, so an unsettled round has
    // taken nothing from anyone.
    if (waitingForPlayers) return;
    if (user && profile && currentRoom && !hasUpdatedStats.current && !(statsKey && processedResultsGames.has(statsKey))) {
      hasUpdatedStats.current = true;
      if (statsKey) processedResultsGames.add(statsKey);

      const updateStats = async () => {
        // Vote rounds: settle anything still open — normally a no-op (each
        // question settled live as its last vote landed), but a player who
        // left mid-round leaves questions no device ever saw completed.
        // Idempotent, so every device calling it is fine.
        if (isMostLikelyRound && currentRoom.current_game_id) {
          await settleMostLikelyVotes(currentRoom.id, currentRoom.current_game_id, null);
        }

        // Round completion — the room-wide write-set (room_games completion
        // snapshot, match history row, and every participant's cumulative
        // total_score / total_rounds_played / total_wins) — happens in ONE
        // idempotent SECURITY DEFINER RPC, called by every device; the first
        // call applies it, the rest no-op. It replaced a host-only client
        // loop that RLS silently reduced to the host's own row: every other
        // player sat at 0 points / 0 rounds on the scoreboard forever.
        // First in the chain and error-isolated, so a coins or profile
        // failure below can never eat the round again.
        if (currentRoom.current_game_id) {
          const { error: roundError } = await supabase.rpc("complete_room_round", {
            p_room_id: currentRoom.id,
            p_game_id: currentRoom.current_game_id,
          });
          if (roundError) {
            console.error("[GameResults] complete_room_round failed:", roundError);
          }
        }

        // The pot. Everybody at the table put 500 in and the table is what
        // gets paid out — winner takes all at two players, 70/20/10 at three
        // or more (owner's ask). The client names neither the stake nor the
        // prize: settle_room_round collects, ranks and pays server-side, once
        // per round however many devices call it, and hands back what
        // actually moved for THIS player.
        //
        // The old path credited a number this device worked out from
        // placement and raw score and then granted it to itself. Nobody paid
        // anything in, so a room was free money — the more players, the more
        // of it. What survives of that function is the practice rule and
        // whether the win counts, which are not money.
        const { isPractice, countsAsWin } = calculateMultiplayerPayout({
          playerCount: participants.length,
          myRank: myRankForPayout,
          myScore,
          isWin,
        });

        // What moved is what the server says moved — and nothing else. There
        // used to be a fallback here for the window before settle_room_round
        // was deployed, paying a placement reward the CLIENT worked out; the
        // function has been live for a long time, and a client that names
        // its own prize is the hole rule 3 of CLAUDE.md exists to close. A
        // round the server did not settle pays nobody.
        const settlement = await settleRoomRound(currentRoom.id, currentRoom.current_game_id ?? null);
        setCoinsEarned(Math.max(0, settlement.applied));
        setCoinsLost(Math.max(0, -settlement.applied));
        setPotLines(settlement.lines);

        // Tell the players who are not here.
        //
        // A private round settles when the LAST person plays it, and by then
        // the ones who played this morning are gone — without this they
        // would find out they had won by noticing their balance had changed.
        // Only for a room that waits: a public round is settled in front of
        // everyone who was in it (owner's choice of push for this).
        //
        // Fire-and-forget, and the server decides everything: it re-reads
        // the round, refuses one that has not actually settled, and claims
        // one push per player per round so several devices arriving at once
        // cannot ring the same phone twice.
        if (!isPublicRoom && currentRoom.current_game_id) {
          supabase.functions
            .invoke("send-social-push", {
              body: {
                kind: "room_round_settled",
                roomId: currentRoom.id,
                gameId: currentRoom.current_game_id,
              },
            })
            .catch(() => {});
        }

        // Missions: every room game counts as played; a real (non-practice)
        // room is a game with friends; ranked wins advance win missions
        void trackMissionEvent("game_played", 1);
        if (!isPractice) void trackMissionEvent("friend_game", 1);
        if (countsAsWin) void trackMissionEvent("game_won", 1);

        // Update profile stats — XP is placement-independent: every player
        // banks their raw score in every mode. Increment RPC, not an
        // absolute write: a mission settling in parallel reads the same
        // starting total, and whichever absolute write landed last used to
        // erase the other grant. The database does the addition now.
        const { data: statsData, error: statsError } = await supabase.rpc("increment_profile_stats", {
          p_points: Math.min(Math.round(myScore), 5000),
          p_games_played: 1,
          p_games_won: countsAsWin ? 1 : 0,
          p_streak_action: countsAsWin ? "win" : isPractice ? "none" : "reset",
        });
        if (statsError) {
          console.error("[GameResults] increment_profile_stats failed:", statsError);
        } else if (statsData) {
          setProfileLocal(statsData as Record<string, number>);
        }

        // room_games completion, room_match_history, and the cumulative
        // participant totals are all written by complete_room_round above —
        // server-side, from live scores, once per round. The client-side
        // versions this replaces were host-gated (RLS made anything else a
        // silent no-op) and read from whichever snapshot this device had.

        // Every device still marks only its own "seen results" flag
        const myRow = participants.find(p => p.user_id === user.id);
        if (myRow) {
          await supabase
            .from("room_participants")
            .update({ has_seen_results: true })
            .eq("id", myRow.id);
        }
      };

      // The guards flip synchronously above so a re-render can't start the
      // chain twice — but a FAILED chain hands them back, so a remount
      // retries instead of the round's payout being lost forever (the old
      // behavior: one network error and the coins were gone with no retry).
      // complete_room_round is idempotent server-side; the worst a retry
      // can double is a coin grant whose first attempt half-landed, which
      // beats guaranteed loss.
      updateStats().catch((e) => {
        console.error("[GameResults] settlement failed, will retry on next mount:", e);
        hasUpdatedStats.current = false;
        if (statsKey) processedResultsGames.delete(statsKey);
      });
    }
  }, [user, profile, myScore, myRankForPayout, isWin, isHost, currentRoom, setProfileLocal, rankedParticipants, settleRoomRound, participants, mltAllVotersDone, isMostLikelyRound, waitingForPlayers, isPublicRoom]);

  // Prefetch the questions a challenge link carries, so sharing is one tap
  // and not a wait.
  //
  // The correct-answer count used to be fetched here too. It existed only to
  // print "(2 correct)" inside the dialog that is gone, so it was a round trip
  // on every results screen for something nobody reads.
  useEffect(() => {
    if (hasFetchedChallengeQuestions.current || !currentRoom?.current_game_id || !user) return;

    hasFetchedChallengeQuestions.current = true;

    const fetchQuestions = async () => {
      const { data: qData } = await supabase
        .from("room_questions")
        .select("question_text, correct_answer, incorrect_answers, icon_slug")
        .eq("game_id", currentRoom.current_game_id!)
        .order("question_index");
      setChallengeQuestions(qData || []);
    };
    fetchQuestions();
  }, [currentRoom, user]);

  /**
   * The back arrow, after a match: the lobby, and the room waits.
   *
   * It used to close a public room — cancelled and archived, the guests
   * sent out — on the reading that a public room was made for one play.
   * The rule is finer now: a public room is public ONCE. Its first round
   * turns it private (complete_room_round, and the host's own completion
   * write), and from then on it is the players' own — they may keep
   * playing in it, and nothing lists it again (owner: "public room is
   * public only once than it becomes private room with no ability to make
   * the room public again. players in it can play more but room stays
   * private"). So by the time anyone is on this screen the room IS a
   * private room, and back is what it is for one: the lobby.
   */
  const handleBackToRoom = () => {
    continueInRoom();
  };

  // Get next queue item for display
  const nextQueueItem = queue[0];

  const handlePlayAgain = async () => {
    setIsStartingRematch(true);
    try {
      if (queue.length > 0) {
        // Continue with next queued category
        await startNextFromQueue();
      } else {
        // No queue - repeat same category
        await startNewRound();
      }
    } catch (error) {
      console.error("Error starting new round:", error);
      toast.error(t("game.couldNotStartRound"));
    } finally {
      setIsStartingRematch(false);
    }
  };

  /**
   * The host's New Game.
   *
   * It used to start the round on the spot: category written, startGame(),
   * and every other player pulled into it by the room's realtime status
   * whether they were still looking or not — and, since a room is played
   * for a pot, staked for it. A new game is asked now (owner: "host starts
   * new match with new pot and we should notify players in that room - do
   * you want rematch showing host"): the room takes the pick and goes back
   * to its lobby, everyone at the table gets "Rematch?" with the host's
   * name on it, and the host presses Start in the lobby — where the stake
   * is shown and a seat that cannot pay is refused — with whoever said yes.
   */
  const everyoneElse = () =>
    participants.filter((p) => p.user_id !== user?.id && (p.status as string) !== "invited").map((p) => p.user_id);

  const askRematch = async (pick: RematchPick, kind: "host_new_game" | "player_ask") => {
    if (!currentRoom || !user) return 0;
    return sendRematchRequest({
      room: currentRoom,
      requester: { id: user.id, nickname: profile?.nickname ?? null, avatar_url: profile?.avatar_url ?? null },
      pick,
      kind,
      recipientIds: everyoneElse(),
      title: t("extra.rematchRequestTitle"),
      message:
        kind === "host_new_game"
          ? t("extra.rematchNewGameBody", { name: profile?.nickname || t("extra.friendFallback") })
          : t("extra.rematchRequestBody", { name: profile?.nickname || t("extra.friendFallback") }),
    });
  };

  const beginNewGame = async (pick: RematchPick) => {
    setShowCategoryPicker(false);
    if (!currentRoom) return;
    setIsStartingRematch(true);
    try {
      const applied = await applyRematchPick(currentRoom.id, pick);
      if (!applied) {
        // Somebody already started the next round; the lobby is not where
        // this room is any more. Follow the room rather than fight it.
        continueInRoom();
        return;
      }
      // The table is not asked from here any more: the lobby's Start asks,
      // once the host has settled the rounds and the rules, with all of it
      // on the card (owner's ask). From here the room only goes back to its
      // lobby with the pick.
      continueInRoom();
    } catch (error) {
      console.error("Error starting new game:", error);
      toast.error(t("game.couldNotStartRound"));
    } finally {
      setIsStartingRematch(false);
    }
  };

  // Category picker handlers - directly from results screen
  const handleSelectCategory = (category: { id: string; name: string; iconSlug?: string | null }) =>
    beginNewGame({ source_type: "category", category_id: category.id, category_name: category.name, icon_slug: category.iconSlug ?? null });

  /** A random pick is dealt HERE, once, so everyone is asked the same question. */
  const dealRandomPick = async (): Promise<RematchPick | null> => {
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, icon_slug, is_language_specific, language")
      .eq("is_active", true);
    const pool = filterCategoriesForLanguage(categories || []);
    if (pool.length === 0) return null;
    const randomCat = pool[Math.floor(Math.random() * pool.length)];
    return { source_type: "random", category_id: randomCat.id, category_name: randomCat.name, icon_slug: randomCat.icon_slug ?? null };
  };

  const handleSelectRandom = async () => {
    const pick = await dealRandomPick();
    if (pick) await beginNewGame(pick);
    else setShowCategoryPicker(false);
  };

  const handleSelectTrivia = (trivia: { id: string; title: string }) =>
    beginNewGame({ source_type: "user_trivia", user_trivia_id: trivia.id, category_name: trivia.title, category_id: null });

  /**
   * A player asking the host for a rematch, with their own pick.
   *
   * PRO only (owner: "other PRO players can play rematch ... with their
   * rules like chose categories what they want not the host this time").
   * Nothing is written to the room: the ask is a notification to the host
   * and to every other seat, and the host's yes is what reshapes the room.
   */
  const handleAskPick = async (pick: RematchPick) => {
    setShowAskPicker(false);
    if (!currentRoom || !user) return;
    setIsAsking(true);
    try {
      const sent = await askRematch(pick, "player_ask");
      if (sent > 0) toast.success(t("extra.rematchAskSent"));
    } catch (error) {
      console.error("[GameResults] rematch ask failed:", error);
      toast.error(t("extra.errorOccurred"));
    } finally {
      setIsAsking(false);
    }
  };

  const handleAskRandom = async () => {
    const pick = await dealRandomPick();
    if (pick) await handleAskPick(pick);
    else setShowAskPicker(false);
  };

  const handleAddToQueue = async (item: {
    source_type: "category" | "random" | "user_trivia";
    category_id?: string | null;
    category_name?: string | null;
    user_trivia_id?: string | null;
    icon_slug?: string | null;
  }) => {
    if (!currentRoom) return;
    
    // Add item to queue first
    await addToQueue(item);

    // CRITICAL FIX: Reset room status to waiting, but DON'T set category fields
    // The queue items will be shown separately, and the first item
    // will become "current" only when the game starts
    // This prevents the duplicate display bug where category appears both as
    // "current" AND in the queue
    // Guard: never downgrade a "playing" room - another player may have already
    // started the next round and this write would derail their live game
    const { data: freshRoom } = await supabase
      .from("game_rooms")
      .select("status")
      .eq("id", currentRoom.id)
      .single();

    if (freshRoom?.status !== "playing") {
      await supabase
        .from("game_rooms")
        .update({
          status: "waiting",
          category_id: null,      // Clear - no current category
          category_name: null,    // Clear - show empty state
          user_trivia_id: null,   // Clear - no current trivia
        })
        .eq("id", currentRoom.id);
      // As with New Game, the table is asked from the lobby's Start, not
      // from here.
    }
    
    // Navigate to lobby (continueInRoom will see status is already "waiting" and skip redundant DB update)
    continueInRoom();
  };

  return (
    <>
    {/* A visitor who opened a shared room link is signed in anonymously so
        they can play immediately. That free game ends here: the score lands
        first, then the offer to keep it. Guests only — a real account never
        sees this. */}
    <AuthRequiredModal
      isOpen={showGuestSignUp}
      onClose={() => setShowGuestSignUp(false)}
      message={t("extra.guestSaveScorePrompt")}
    />
    {/* safe-bleed, because this screen renders standalone inside the
        safe-area-padded #root: a plain 100dvh box in there is taller than
        the padded shell by both insets, and overflow-hidden was clipping
        the bottom section — the next-round queue and the waiting-for-host
        button — off the screen. Bled into the insets and self-padded, the
        box is exactly the viewport and the gradient covers the status bar. */}
    <div className="h-[100dvh] w-full overflow-hidden safe-bleed bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5]">
      <div className="relative w-full h-full flex flex-col max-w-[700px] mx-auto">
      {/* Back Button Header — with the room it belongs to centred, so a
          result read out of context still names its room. */}
      <div className="flex items-center px-4 pt-3 pb-0 flex-shrink-0">
        <button
          onClick={handleBackToRoom}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0 -ml-10">
          {roomFace && (
            <img src={roomFace} alt="" className="w-6 h-6 object-contain shrink-0 drop-shadow-sm" />
          )}
          <span className="text-white font-semibold truncate max-w-[220px]">
            {currentRoom?.room_name || t("extra.gameRoomLabel")}
          </span>
        </div>
      </div>

      {/* The category, under the room's name (owner: "show category below
          the room title"). The trophy and the stars that used to sit here
          are gone — the podium below says who won, and how well. */}
      {currentRoom?.category_name && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center mt-2 px-4 flex-shrink-0"
        >
          {/* The design's pill (1157:10058): the category's artwork at 64px
              on the left, its name beside it and, under the name, which
              round of which game this was. */}
          <div className="flex h-[78px] w-full max-w-[294px] items-center gap-[25px] px-5 py-2 rounded-full bg-white/15 backdrop-blur-sm">
            {/* CategoryArtwork rather than DynamicIcon: the six picture-guess
                categories carry generic stand-ins in icon_slug, so the library
                answers "guess the city" with a globe.

                Both halves have to be passed. category_id on a room is a slug
                for some rooms and a uuid for others; handed a uuid alone,
                CategoryArtwork matches nothing in the popular set AND gives
                DynamicIcon no slug to look up, and DynamicIcon's last resort
                is getRandomIconForCategory — which is how world history came
                out as a camera and guess-the-city as a banana. Resolving the
                identity first turns the uuid into the category's own slug and
                its icon_slug, and the random fallback is never reached. */}
            {/* A "mixed" or "random" round has no category to carry an icon,
                so both halves come back empty and DynamicIcon's last resort —
                a grey question mark — stood in for the one category the rest
                of the app draws as the mystery box. */}
            <CategoryArtwork
              // Never a stale id's picture on a mixed round, and never a
              // question mark on a round that has no category at all — the
              // same two rules the countdown applies.
              categoryId={
                isUndecidedRound(currentRoom.category_id, currentRoom.category_name)
                  ? null
                  : resultsCategory.categoryId ?? currentRoom.category_id
              }
              iconSlug={
                isUndecidedRound(currentRoom.category_id, currentRoom.category_name)
                || (!currentRoom.category_id && !resultsCategory.iconSlug)
                  ? UNDECIDED_ICON_SLUG
                  : resultsCategory.iconSlug
              }
              size={64}
              className="shrink-0 drop-shadow-none"
            />
            <div className="min-w-0 flex flex-col">
              <span className="truncate font-[Nunito] text-[16px] font-medium leading-6 tracking-[-0.16px] text-white">
                {localizeCategory(currentRoom.category_name)}
              </span>
              {matchInfo && (
                <span className="text-[12px] font-bold uppercase leading-[18px] tracking-[0.3px] text-white/60">
                  {t("extra.matchRoundLabel", { game: matchInfo.game, round: matchInfo.round })}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Middle Section: the podium, then the room's whole story under it.

          The top three as faces side by side — first in the middle and
          bigger, a medal off each ring, the coins under the medal — and then
          a column that scrolls: the rest of this round as rows, every game
          the room has played round by round, and every seat's coins over all
          of it (owner: "show 1,2,3 places how we had, besides in top, first
          player with bigger avatar in middle and below show all rounds pot
          not only last game and show all coins users won or lose, like
          summery of the all games"). The list is for the many; the podium is
          for the three the round was about. */}
      <div className="flex-1 min-h-0 flex flex-col items-center gap-3 px-4 pt-4 overflow-hidden">
        {/* A private round still out with somebody. The scores so far are
            right there under this line — they are real, they are just not
            everyone's yet — and the rows carry no coin pills, because
            nothing has been staked or paid while the round is open. Said
            here rather than as a toast: it is the answer to "where are my
            coins", and it has to be on screen when that is asked. */}
        {waitingForPlayers && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 rounded-full bg-white/15 px-4 py-2 text-center font-[Nunito] text-sm font-bold text-white/90"
          >
            {t("extra.roundWaitingForPlayers", { count: stillOut })}
          </motion.p>
        )}

        {/* The podium: second on the left, first in the middle and taller,
            third on the right — a medal under each face and, under the
            medal, what the place was worth (owner: "show first 3 places
            besides, first place in the middle bigger than 2,3 places
            avatars ... show medals below their avatars - below medals show
            coins"). A grid, not a flex row, so the steps keep their
            places. Two players get two columns, centred: the three-step
            grid left the pair huddled on the left with an empty step
            beside them (owner: "show avatars centered"). */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={cn(
            "w-full grid items-end flex-shrink-0 pt-2",
            rankedParticipants.length === 2 ? "max-w-[260px] grid-cols-2 gap-6" : "max-w-[362px] grid-cols-3 gap-2",
          )}
        >
          {(rankedParticipants.length === 2 ? TWO_UP_ORDER : PODIUM_ORDER).map((idx) => {
            const p = rankedParticipants[idx];
            if (!p) return <div key={idx} />;
            const first = idx === 0;
            return (
              <div key={p.user_id} className="flex flex-col items-center min-w-0">
                {/* The design's faces (1157:10233..10244): every place in
                    the gold ring, first at 110px and the two beside it at
                    76, with the medal hanging off the bottom of the ring
                    rather than stacked under it. The wrapper reserves the
                    half of the medal that hangs below. */}
                <div
                  className={cn(
                    "relative",
                    first ? "mb-[40px]" : "mb-[29px]",
                    !p.isMe && "cursor-pointer active:scale-95 transition-transform",
                  )}
                  onClick={!p.isMe ? () => openProfile(p.user_id) : undefined}
                  role={!p.isMe ? "button" : undefined}
                >
                  <SafeAvatar
                    avatarUrl={p.avatar_url}
                    fallback={p.nickname || "?"}
                    className={cn(
                      "border-2 border-[#fcd34d] shadow-[0_0_0_4px_rgba(251,191,36,0.35)]",
                      first ? "w-[110px] h-[110px]" : "w-[76px] h-[76px]",
                    )}
                    fallbackClassName={cn(
                      "bg-gradient-to-br from-purple-400 to-purple-600 text-white font-bold",
                      first ? "text-3xl" : "text-xl",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 leading-none",
                      // Lower than the design's half-and-half: the emoji's
                      // ribbon rides above its disc, so a medal hung by its
                      // middle covered half the face (owner: "move down the
                      // medals a little", and again six pixels later). About
                      // a quarter of it over the ring; the wrapper's margin
                      // above reserves what hangs below, so the two move
                      // together or the medal lands on the name.
                      first ? "-bottom-[38px] text-[46px]" : "-bottom-[27px] text-[32px]",
                    )}
                  >
                    {placeMark(idx, p.rank)}
                  </span>
                </div>
                <span className="w-full text-center font-display text-[20px] font-bold leading-6 tracking-[-0.16px] text-white truncate">
                  {p.isMe ? t("game.you") : p.nickname}
                </span>
                <PotLine net={netFor(p)} />
              </div>
            );
          })}
        </motion.div>

        {/* Under the podium, everything else, in one column that scrolls. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-[468px] flex-1 min-h-0 overflow-y-auto"
          style={{ paddingBottom: footerHeight + FOOTER_HAZE_PX }}
        >
          <div className="space-y-[17px]">
            {/* The rest of this round, from fourth down — the podium has the
                three above it, and they are not told twice. One row per
                player, however many: ten seats are seven rows here. */}
            {rankedParticipants.length > PODIUM_ORDER.length && (
              <StandingsCard
                title={
                  matchInfo
                    ? t("extra.matchRoundLabel", { game: matchInfo.game, round: matchInfo.round })
                    : t("extra.resultsStandingsTitle")
                }
                pot={thisRoundPot}
              >
                {rankedParticipants.slice(PODIUM_ORDER.length).map((p, i) => (
                  <StandingRow
                    key={p.user_id}
                    idx={i + PODIUM_ORDER.length}
                    rank={p.rank}
                    name={p.isMe ? t("game.you") : p.nickname}
                    avatarUrl={p.avatar_url}
                    isMe={p.isMe}
                    detail={t("extra.resultsPoints", { n: p.score })}
                    net={netFor(p)}
                    onTap={!p.isMe ? () => openProfile(p.user_id) : undefined}
                  />
                ))}
              </StandingsCard>
            )}

            {/* Round by round, and the room's totals, behind a text button
                (owner: "if we have more than 3 players we have 4..10
                players list below first 3 places so we do not have space
                to show details on this screen, let's show it as a button").
                Nothing on a room that has played one round: that round is
                the podium. */}
            {roomRounds && roomRounds.length >= 2 && (
              <button
                type="button"
                onClick={() => setShowRounds(true)}
                className="mx-auto flex items-center gap-2 py-3 text-sm font-bold text-white/80 hover:text-white transition-colors"
              >
                <ListOrdered className="w-4 h-4" />
                {t("extra.resultsRoundByRoundCta")}
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* The sheet the text button opens: every earlier round of every
          game — its category and pot and, under it, every seat with what
          the round paid them, the winner first — and then the room's
          totals over all its games. The same tiles the screen used to
          stack under the podium, on the screen's own purple so they read
          the same. */}
      <AnimatePresence>
        {showRounds && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(64,38,102,0.45)] backdrop-blur-[6px] p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
            onClick={() => setShowRounds(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="w-full max-w-[468px] max-h-full overflow-y-auto rounded-[24px] border-2 border-white/30 bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5] p-3 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.3)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="font-display text-[18px] font-bold text-white">{t("extra.resultsRoundByRoundCta")}</p>
                <button
                  type="button"
                  onClick={() => setShowRounds(false)}
                  aria-label={t("common.close")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-[17px]">
                {roomRounds && roomRounds.length >= 2 && roomGames.map(([game, rounds]) => (
                  <motion.section
                    key={game}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={TILE}
                    aria-label={t("extra.matchRoundsTitle", { game })}
                  >
                    <p className={EYEBROW}>{t("extra.matchRoundsTitle", { game })}</p>
                    <ol className="mt-2 divide-y divide-white/15">
                      {rounds.map((round) => {
                        const undecided = isUndecidedRound(null, round.categoryName);
                        const slug = undecided
                          ? UNDECIDED_ICON_SLUG
                          : round.iconSlug ?? iconForCategoryName(round.categoryName) ?? UNDECIDED_ICON_SLUG;
                        return (
                          <li key={round.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/15">
                                <DynamicIcon slug={slug} size={20} shadow={false} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15px] font-semibold leading-5 text-white">
                                  {localizeCategory(round.categoryName) || t("extra.categoryFallback")}
                                </span>
                                <span className="block text-[12px] leading-4 text-white/60">
                                  {t("lobby.uRoundLabel", { count: round.number })}
                                </span>
                              </span>
                              {round.pot > 0 && <PotPill amount={round.pot} />}
                            </div>
                            {/* Every seat, one under the other — never wrapped
                                across the row, which is what put ten faces at
                                24px in a block nobody could read. */}
                            <ul className="mt-2 space-y-1">
                              {round.seats.map((seat, i) => {
                                const who = participants.find((p) => p.user_id === seat.user_id);
                                return (
                                  <li key={seat.user_id} className="flex h-9 items-center gap-2 rounded-xl px-2">
                                    <span className="w-7 shrink-0 text-center text-[15px] leading-none">{placeMark(i, i + 1)}</span>
                                    <SafeAvatar
                                      avatarUrl={who?.avatar_url ?? null}
                                      fallback={who?.nickname || "?"}
                                      className="h-7 w-7 shrink-0 border border-white/40"
                                      fallbackClassName="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-[10px] font-bold"
                                    />
                                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">
                                      {seat.user_id === user?.id ? t("game.you") : who?.nickname || "?"}
                                    </span>
                                    <PotLine net={seat.net} compact />
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        );
                      })}
                    </ol>
                  </motion.section>
                ))}

                {/* The whole room, all games: every seat's coins over every
                    round it has played, most first — the same rows the round
                    wears, so the two read as one thing. */}
                {roomTotals && (
                  <StandingsCard title={t("extra.resultsAllGamesTitle", { rounds: roomRounds!.length })} delay={0.5}>
                    {roomTotals.map((row, i) => {
                      const seat = participants.find((p) => p.user_id === row.user_id);
                      const me = row.user_id === user?.id;
                      return (
                        <StandingRow
                          key={row.user_id}
                          idx={i}
                          rank={i + 1}
                          name={me ? t("game.you") : seat?.nickname || "?"}
                          avatarUrl={seat?.avatar_url ?? null}
                          isMe={me}
                          net={row.net}
                          onTap={!me ? () => openProfile(row.user_id) : undefined}
                        />
                      );
                    })}
                  </StandingsCard>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Section: Next Round Preview + Buttons. The home-indicator
          inset is already the root's own padding (safe-bleed), so this
          carries plain spacing — env(safe-area-inset-bottom) here again
          would double-count the inset. */}
      <div ref={footerRef} className="absolute inset-x-0 bottom-0 z-20">
      <FooterHaze tint={RESULTS_HAZE_TINT} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative p-4 pb-5 space-y-3"
      >
        {/* Next Round Preview - show if queue has items */}
        {nextQueueItem && (
          // Tappable: it already showed "+3 >" beside the next item, which
          // reads as something you can open. A player waiting on the host
          // could see more rounds existed and had no way to see what they
          // were.
          <motion.button
            type="button"
            onClick={() => setShowQueueSheet(true)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full text-left p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 transition-colors hover:bg-white/15 active:scale-[0.99]"
          >
            <p className="text-white/50 text-xs mb-2">{t("extra.nextRoundLabel")}</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                {nextQueueItem.category_id === "__mixed__" ? (
                  <DynamicIcon slug="mystery-box" size={20} />
                ) : nextQueueItem.source_type === "random" ? (
                  <Shuffle className="w-5 h-5 text-purple-300" />
                ) : nextQueueItem.icon_slug ? (
                  <DynamicIcon slug={nextQueueItem.icon_slug} size={20} />
                ) : (
                  <Library className="w-5 h-5 text-purple-300" />
                  )}
              </div>
              <span className="flex-1 text-white font-medium truncate">
                {nextQueueItem.source_type === "random"
                  ? t("extra.randomOption")
                  : localizeCategory(nextQueueItem.category_name) || t("extra.categoryType")}
              </span>
              {/* This says how many more rounds are queued behind this one,
                  which is the reason to tap the row. At white/40 it was the
                  faintest thing on it. */}
              <span className="text-white/85 text-sm font-semibold flex items-center gap-1 flex-shrink-0">
                {queue.length > 1 && <>+{queue.length - 1} {t("extra.moreCount")}</>}
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </motion.button>
        )}

        {/* Strict host check: ensure user.id is defined and matches host_user_id */}
        {isHost && user?.id && currentRoom?.host_user_id === user.id ? (
          <>
            {/* Continue button - when queue has items */}
            {queue.length > 0 && (
              <ChunkyButton
                variant="primary"
                size="lg"
                className="w-full font-bold"
                onClick={handlePlayAgain}
                disabled={isStartingRematch}
                icon={isStartingRematch ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              >
                {isStartingRematch ? t("game.starting") : t("common.continue")}
              </ChunkyButton>
            )}

            {/* New Game only once the match is over. While rounds are still
                queued, Continue is the one way on: offering a new match
                beside it invited the host to abandon the one the table was
                in the middle of (owner's ask). */}
            {queue.length === 0 && (
            <ChunkyButton
              variant="mint"
              size="lg"
              className="w-full font-bold"
              onClick={() => setShowCategoryPicker(true)}
              disabled={isStartingRematch}
              icon={<ChevronRight className="w-5 h-5" />}
            >
              {t("extra.newGame")}
            </ChunkyButton>
            )}

            {/* Challenge a friend.
                A text button, not a third chunky one: the two above it are
                what to do next, and this is a way to pass the game on. It
                used to open a dialog that showed the score and category the
                screen behind it was already showing, and then offered this
                same share — so the share happens here directly.
                Not for vote rounds: their "questions" have no correct answer
                to challenge anyone with. */}
            {!isMostLikelyRound && (
            <button
              type="button"
              onClick={() =>
                void share({
                  score: myScore,
                  totalQuestions: currentRoom?.total_questions || challengeQuestions.length,
                  categoryName: currentRoom?.category_name,
                  categoryIconSlug: null,
                  roomId: currentRoom?.id,
                  questions: challengeQuestions,
                })
              }
              disabled={sharing}
              className="mx-auto flex items-center gap-2 py-3 text-sm font-bold text-white/80 hover:text-white disabled:opacity-60 transition-colors"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {t("extra.challengeFriend")}
            </button>
            )}

          </>
        ) : (
          <>
            {/* A player who is not the host can ask for a rematch on their
                own terms — PRO's door; anyone else meets the PRO wall on the
                tap, the same one the rooms hub shows (owner: "we need CTA
                saying that player can ask rematch (if player is PRO user)"). */}
            <ChunkyButton
              variant="mint"
              size="lg"
              className="w-full font-bold"
              onClick={() => (isVip ? setShowAskPicker(true) : setShowAskWall(true))}
              disabled={isAsking}
              icon={isAsking ? <Loader2 className="w-5 h-5 animate-spin" /> : isVip ? <ChevronRight className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            >
              {t("extra.rematchAskCta")}
            </ChunkyButton>

            {/* Non-host: nothing to do but wait, so say so like something is
                still happening. A static line in the same slot the host's
                button occupies reads as a button that has stopped working. */}
            <motion.div
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <Loader2 className="w-4 h-4 text-white/80 animate-spin" />
              <p className="text-white font-semibold">{t("extra.waitingForHostResult")}</p>
            </motion.div>
          </>
        )}
      </motion.div>
      </div>

      {/* Category Picker Modal */}
      <RoomQueueSheet
        isOpen={showQueueSheet}
        onClose={() => setShowQueueSheet(false)}
        queue={queue}
      />

      {/* The asker's picker: one pick, no queue — a request is one game. */}
      <CategoryPickerModal
        isOpen={showAskPicker}
        onClose={() => setShowAskPicker(false)}
        onSelectCategory={(c) => void handleAskPick({ source_type: "category", category_id: c.id, category_name: c.name, icon_slug: c.iconSlug ?? null })}
        onSelectRandom={() => void handleAskRandom()}
        onSelectTrivia={(tr) => void handleAskPick({ source_type: "user_trivia", user_trivia_id: tr.id, category_name: tr.title, category_id: null })}
        showQueueOption={false}
        allowParty={!currentRoom?.is_public}
        allowMyTrivias={!currentRoom?.is_public}
        roomGradient={currentRoom?.background_gradient || undefined}
        excludeTriviaId={currentRoom?.user_trivia_id}
      />

      <PlayLimitModal reason="rooms" isOpen={showAskWall} onClose={() => setShowAskWall(false)} />

      <CategoryPickerModal
        isOpen={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelectCategory={handleSelectCategory}
        onSelectRandom={handleSelectRandom}
        onSelectTrivia={handleSelectTrivia}
        onAddToQueue={handleAddToQueue}
        showQueueOption={true}
        allowParty={!currentRoom?.is_public}
        allowMyTrivias={!currentRoom?.is_public}
        roomGradient={currentRoom?.background_gradient || undefined}
        excludeTriviaId={currentRoom?.user_trivia_id}
      />

      </div>
    </div>
    </>
  );
}
