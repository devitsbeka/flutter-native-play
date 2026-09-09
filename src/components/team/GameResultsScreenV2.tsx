import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMultiplayerV2, settleMostLikelyVotes } from "@/contexts/MultiplayerContextV2";
import { activeRoundPlayers } from "@/utils/roundPlayers";
import { playersStillOut, roundSettleTiming } from "@/utils/roundSettlement";
import { useMissions } from "@/hooks/useMissions";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useRoomCategoryQueue } from "@/hooks/useRoomCategoryQueue";
import { supabase } from "@/integrations/supabase/client";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";
import { useChallengeShare } from "@/hooks/useChallengeShare";
import { ArrowLeft, Crown, Shuffle, Library, ChevronRight, Loader2, Gift, Share2 } from "lucide-react";
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
import { isGuestAccount } from "@/utils/guestAccount";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";
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

/** The medal for the top three, the place number from fourth down. */
const placeMark = (idx: number, rank: number) =>
  idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${rank}`;

/**
 * What a seat's place was worth, under its medal: the prize less the stake,
 * signed — "+840" in amber for a place that paid, "-500" in grey for one
 * that did not, and nothing at all while the round is still settling or
 * when it settled nothing (practice, or a function that predates the
 * deltas). Read from the ledger via settle_room_round, never worked out
 * here: the client names no amounts (roomPot.test).
 */
function PotLine({ net, compact }: { net: number | undefined; compact?: boolean }) {
  if (net === undefined) return null;
  const up = net > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold text-white",
        compact ? "px-2 py-0.5 text-xs" : "mt-1.5 px-2.5 py-1 text-sm",
        up ? "bg-amber-500/90" : net < 0 ? "bg-slate-500/80" : "bg-white/15",
      )}
      style={up ? { boxShadow: "0 3px 0 rgba(180,120,0,0.4)" } : undefined}
    >
      <img src={coinIcon} alt="" className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4", net < 0 && "grayscale")} />
      {up ? `+${net}` : net}
    </span>
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
  const { addCoins } = useCurrency();
  const { settleRoomRound } = useRoomPot();
  const { trackMissionEvent } = useMissions();
  const { openProfile } = usePlayerProfile();
  const [coinsEarned, setCoinsEarned] = useState(0);
  // What the stake cost when the pot went elsewhere — said out loud rather
  // than left as a balance that quietly dropped.
  const [coinsLost, setCoinsLost] = useState(0);
  // Every seat's line in the pot — what each place won or paid — so the
  // podium can say it under the medals, not only this player's own.
  const [potLines, setPotLines] = useState<Record<string, RoomPotLine>>({});
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
   * A public room is unaffected: it settles the moment the round ends,
   * which is what "results instantly" means over there.
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

  // Sort participants by score and assign ranks
  const rankedParticipants: RankedParticipant[] = [...participants]
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

        const settlement = await settleRoomRound(currentRoom.id, currentRoom.current_game_id ?? null);
        if (settlement.unsettled && settlement.reason === "not_deployed") {
          // The migration has not reached this project yet. Pay the old
          // placement reward rather than nobody, so a round is never silently
          // worthless in the window between shipping this and applying it.
          const { earnedCoins } = calculateMultiplayerPayout({
            playerCount: participants.length,
            myRank: myRankForPayout,
            myScore,
            isWin,
          });
          if (earnedCoins > 0) await addCoins(earnedCoins, "quiz_reward");
          setCoinsEarned(earnedCoins);
        } else {
          setCoinsEarned(Math.max(0, settlement.applied));
          setCoinsLost(Math.max(0, -settlement.applied));
          setPotLines(settlement.lines);
        }

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
  }, [user, profile, myScore, myRankForPayout, isWin, isHost, currentRoom, setProfileLocal, rankedParticipants, addCoins, settleRoomRound, participants, mltAllVotersDone, isMostLikelyRound, waitingForPlayers, isPublicRoom]);

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
   * The back arrow, after a match.
   *
   * A private room is the players' own: back is the lobby, and the room
   * waits for them. A PUBLIC room is made for one play (owner: "hosts are
   * creating public rooms for one play ... make sure public rooms when
   * round or several rounds, matches will end, room will be deleted"). Its
   * match is over here; the only way it goes on is a rematch, asked with
   * New Game (or by a PRO player) while everyone is still on this screen.
   * So the host's back closes the room — cancelled and archived, which
   * every listing already hides and which sends the guests out with "Room
   * was closed" — and a guest's back gives up their seat.
   */
  const handleBackToRoom = () => {
    if (!isPublicRoom || !currentRoom) {
      continueInRoom();
      return;
    }
    if (isHost) {
      void supabase
        .from("game_rooms")
        .update({ status: "cancelled", is_archived: true })
        .eq("id", currentRoom.id);
      exitRoom();
      navigate("/team?tab=public", { replace: true });
      return;
    }
    void leaveRoomPermanently();
    navigate("/team?tab=public", { replace: true });
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
      <div className="w-full h-full flex flex-col max-w-[700px] mx-auto">
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
          className="flex justify-center mt-2 px-4 flex-shrink-0"
        >
          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/15 backdrop-blur-sm">
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
              size={24}
              className="drop-shadow-none"
            />
            <span className="text-white font-medium">{localizeCategory(currentRoom.category_name)}</span>
          </div>
        </motion.div>
      )}

      {/* Middle Section: the podium, then everyone from fourth down */}
      <div className="flex-1 min-h-0 flex flex-col items-center gap-3 px-4 pt-4 overflow-hidden">
        {/* A private round still out with somebody. The scores so far are
            right there under this line — they are real, they are just not
            everyone's yet — and the medals carry no coin pills, because
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
            "w-full grid items-end gap-2 flex-shrink-0",
            rankedParticipants.length === 2 ? "max-w-[240px] grid-cols-2" : "max-w-xs grid-cols-3",
          )}
        >
          {(rankedParticipants.length === 2 ? TWO_UP_ORDER : PODIUM_ORDER).map((idx) => {
            const p = rankedParticipants[idx];
            if (!p) return <div key={idx} />;
            const first = idx === 0;
            return (
              <div key={p.user_id} className="flex flex-col items-center min-w-0">
                <div
                  className={cn("relative", !p.isMe && "cursor-pointer active:scale-95 transition-transform")}
                  onClick={!p.isMe ? () => openProfile(p.user_id) : undefined}
                  role={!p.isMe ? "button" : undefined}
                >
                  <SafeAvatar
                    avatarUrl={p.avatar_url}
                    fallback={p.nickname || "?"}
                    className={cn(
                      "border-2",
                      first ? "w-20 h-20 border-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.35)]" : "w-14 h-14 border-white/40",
                    )}
                    fallbackClassName={cn(
                      "bg-gradient-to-br from-purple-400 to-purple-600 text-white font-bold",
                      first ? "text-xl" : "text-base",
                    )}
                  />
                </div>
                <span className={cn("mt-1.5 w-full text-center text-white font-display truncate", first ? "text-base" : "text-sm")}>
                  {p.isMe ? t("game.you") : p.nickname}
                </span>
                <span className="text-white/70 text-xs font-semibold">{p.score}</span>
                <span className={cn("leading-none mt-1", first ? "text-3xl" : "text-2xl")}>{placeMark(idx, p.rank)}</span>
                <PotLine net={netFor(p)} />
              </div>
            );
          })}
        </motion.div>

        {/* Everyone from fourth down. Not the top three again — they are on
            the podium — and nothing at all when the room has three or
            fewer, so the podium is not followed by an empty card. */}
        {rankedParticipants.length > PODIUM_ORDER.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-xs bg-white/10 backdrop-blur-sm rounded-2xl p-3 flex-1 min-h-0 overflow-y-auto"
          >
            <div className="space-y-2">
            {rankedParticipants.slice(PODIUM_ORDER.length).map((p) => (
              <div
                key={p.user_id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                  p.isMe ? "bg-white/20" : ""
                )}
              >
                {/* Avatar — tap opens the player's profile. No crown: it
                    means HOST everywhere else in the app. */}
                <div
                  className={cn("relative", !p.isMe && "cursor-pointer active:scale-95 transition-transform")}
                  onClick={!p.isMe ? () => openProfile(p.user_id) : undefined}
                  role={!p.isMe ? "button" : undefined}
                >
                  <SafeAvatar
                    avatarUrl={p.avatar_url}
                    fallback={p.nickname || "?"}
                    className="w-10 h-10 border-2 border-white/30"
                    fallbackClassName="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-sm font-bold"
                  />
                </div>

                {/* The place number. Smaller than the medals on the podium —
                    the least important part of its row. White, because
                    text inherits the dark foreground on a dark row. */}
                <span className="font-display font-bold text-white text-base min-w-[2ch] text-center">
                  {placeMark(p.rank - 1, p.rank)}
                </span>

                <span className="flex-1 text-white font-display text-base truncate">
                  {p.isMe ? t("game.you") : p.nickname}
                </span>

                <PotLine net={netFor(p)} compact />
                <span className="text-white font-display text-base">{p.score}</span>
              </div>
            ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Section: Next Round Preview + Buttons. The home-indicator
          inset is already the root's own padding (safe-bleed), so this
          carries plain spacing — env(safe-area-inset-bottom) here again
          would double-count the inset. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 pb-5 space-y-3"
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

            {/* Category picker button */}
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
