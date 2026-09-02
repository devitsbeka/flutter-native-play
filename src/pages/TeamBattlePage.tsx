import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Pencil } from "lucide-react";
import { containsBlockedText } from "@/utils/contentFilter";
import { readAppLanguage } from "@/utils/appLanguage";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { RoomIconPickerModal } from "@/components/team/RoomIconPickerModal";
import { JoinRequestGate } from "@/components/team/JoinRequestGate";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import {
  TeamBattleProvider,
  useTeamBattle,
  type TBParticipant,
  type TBTeam,
} from "@/contexts/TeamBattleContext";
import { TeamBattleMatch } from "@/components/team-battle/TeamBattleMatch";
import { useCategories } from "@/hooks/useCategories";
import { excludePartyCategories } from "@/config/partyCategories";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import {
  AnimatedCoinPill,
  CaptainInfoModal,
  type InviteEntry,
  LILAC_BG,
  LilacHeader,
  FitBox,
  EmptySeat,
  PlusSeat,
  Seat,
  SeatMenu,
  type SeatMenuAction,
  StartButton,
} from "@/components/lobby/LilacLobby";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import sceneArena from "@/assets/tb-lobby/scene-arena.webp";
import iconBattleCrate from "@/assets/play-chooser/icon-crate.png";
import crownIcon from "@/assets/crown-icon.png";
import { dealtCrests, fetchCrestPool } from "@/utils/roomCrests";
import { dealTeamNames } from "@/utils/teamNameGenerator";

/**
 * /team-battle — the Team Battle flow (docs/GAME_TYPES_DESIGN.md §2), its own
 * page the way /tv is: entry (create or join by code) → team lobby → the
 * server-driven match phases in TeamBattleMatch. Entry and match live on the
 * game screens' periwinkle; the lobby wears the room's jewel gradient like
 * RoomLobbyV2 does.
 */
export default function TeamBattlePage() {
  return (
    <TeamBattleProvider>
      <TeamBattleInner />
    </TeamBattleProvider>
  );
}

/** People picked on the create screen, riding along in router state. */
export type LoungeInvite = { id: string; nickname: string; avatarUrl: string | null };

function TeamBattleInner() {
  const { user } = useAuth();
  const { room, state, joinRoom } = useTeamBattle();
  const [params] = useSearchParams();
  const location = useLocation();
  // Captured once at mount: the ?code= replace that follows room creation
  // drops router state, so the list has to be held here.
  const handoffRef = useRef<LoungeInvite[] | null>(
    (location.state as { invite?: LoungeInvite[] } | null)?.invite ?? null,
  );
  // Settling flips the room back to "waiting" within a round-trip; the
  // result screen stays up until the player dismisses it, or it would be an
  // unreadable flash on the way back to the lobby.
  const [resultSeen, setResultSeen] = useState(false);

  useEffect(() => {
    if (state?.phase !== "done") setResultSeen(false);
  }, [state?.phase, state?.game_id]);

  // /team-battle?code=ABC123 joins straight into the lobby (shared links,
  // and the round-start watcher pulling a wandering teammate in).
  useEffect(() => {
    const code = params.get("code");
    if (code && !room && user) void joinRoom(code);
  }, [params, room, user, joinRoom]);

  const inMatch =
    room &&
    state &&
    ((room.status === "playing" && !state.settled) ||
      (state.phase === "done" && !resultSeen));

  if (inMatch) return <TeamBattleMatch onResultDismiss={() => setResultSeen(true)} />;
  if (room) return <TBLobby handoff={handoffRef} />;
  return <TBGate joining={!!params.get("code")} />;
}

/**
 * There is no entry step in the design — arriving here without a room means
 * one gets created for you (or joined, when a ?code is in the URL) and the
 * arena lobby opens. This gate is just the lilac wash while that happens,
 * with a retry if the round-trip fails.
 */
function TBGate({ joining }: { joining: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { createRoom } = useTeamBattle();
  const [failed, setFailed] = useState(false);
  const attempted = useRef(false);
  // The create screen's public/private switch, carried across the
  // navigation that makes this room. An arena reached any other way — a
  // shared link, the play chooser — is private, like every other room
  // created without an opinion.
  const handoff =
    (location.state as {
      isPublic?: boolean;
      team?: TBTeam;
      teamSize?: number;
      teamIcons?: { a: string | null; b: string | null };
      teamNames?: { a: string | null; b: string | null };
    } | null) ?? null;
  const publish = handoff?.isPublic ?? false;
  const side: TBTeam = handoff?.team === "b" ? "b" : "a";
  const teamSize = handoff?.teamSize ?? 5;
  // Crests dealt (or picked) on the create screen ride into createRoom and
  // are written with the room row itself. Not through tb_set_team_icon: that
  // dresses only the side the caller captains, and at creation the host
  // captains exactly one of the two.
  const teamIcons = handoff?.teamIcons;
  // The sides' dealt names ride the same way; an arena reached without
  // them (a shared link) is dealt a pair right here, in the app language.
  const teamNamesRef = useRef(handoff?.teamNames ?? dealTeamNames(readAppLanguage()));

  useEffect(() => {
    if (joining || !user || attempted.current) return;
    attempted.current = true;
    void createRoom(publish, side, teamSize, teamIcons, teamNamesRef.current).then((created) => {
      if (!created) setFailed(true);
      // The room's code goes into the URL so a refresh rejoins this room
      // instead of minting a new one.
      else navigate(`/team-battle?code=${created.room_code}`, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joining, user, createRoom, navigate, publish, side, teamSize]);

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden safe-bleed relative flex flex-col items-center justify-center gap-6"
      style={{ background: LILAC_BG }}
    >
      <button
        onClick={() => navigate(-1)}
        aria-label={t("common.back")}
        className="absolute left-5 top-[calc(var(--safe-top)_+_1rem)] w-10 h-10 flex items-center justify-center rounded-full bg-white/40"
      >
        <ChevronLeft className="w-5 h-5 text-[#523b76]" />
      </button>
      {/* The arena's own crate, the same one the reel and the lobby header
          wear. Without it this was a title and a spinner on an empty lilac
          field, which reads as a screen that failed rather than one that is
          working. */}
      <motion.img
        src={iconBattleCrate}
        alt=""
        className="w-[104px] h-[104px] object-contain drop-shadow-[0_8px_18px_rgba(88,50,160,0.28)]"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
      />
      <p
        className="text-[26px] text-[#523b76]"
        style={{ fontFamily: "'TASolivare', sans-serif" }}
      >
        {t("teamBattle.title")}
      </p>
      {failed ? (
        <ChunkyButton
          variant="white"
          size="lg"
          onClick={() => {
            setFailed(false);
            attempted.current = false;
            void createRoom(publish, side, teamSize, teamIcons, teamNamesRef.current).then((created) => {
              if (!created) setFailed(true);
              else navigate(`/team-battle?code=${created.room_code}`, { replace: true });
            });
          }}
        >
          {t("common.retry")}
        </ChunkyButton>
      ) : (
        <motion.div
          className="w-8 h-8 rounded-full border-[3px] border-[#8858d5]/30 border-t-[#8858d5]"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}

// Seat slots per team, straight from the frame (943:21930): four avatar
// spots and one empty podium per side. Team A wears the blue ring, Team B
// the red one, exactly as the design's borders say.
const TEAM_A_SLOTS: [number, number][] = [
  [91, 431], [30, 457], [23, 517], [82, 546],
];
const TEAM_B_SLOTS: [number, number][] = [
  [356, 431], [407, 457], [431, 514], [376, 546],
];
const PODIUM_A: [number, number] = [151, 572];
const PODIUM_B: [number, number] = [302, 572];

// The arena scene's edge fade (938:6267 overlay).
const ARENA_FADE =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 435 780' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(1.3318e-15 39 -21.75 2.3881e-15 217.5 390)'><stop stop-color='rgba(255,255,255,0)' offset='0'/><stop stop-color='rgba(245,217,255,1)' offset='1'/></radialGradient></defs></svg>\")";

// Server rule: tiles even, ≥ 2×team size, ≤ 12 — these are the valid picks.

function TBLobby({ handoff }: { handoff?: MutableRefObject<LoungeInvite[] | null> }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    room, participants, pendingInvites, isHost, myTeam, setTeam,
    setCaptain, voteCaptain, manageSeat, startMatch, startError, leaveRoom, loading, state, settle,
  } = useTeamBattle();
  const { categories } = useCategories();
  const { openProfile } = usePlayerProfile();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [captainInfo, setCaptainInfo] = useState<TBTeam | null>(null);
  // Which side's crest is being picked, if any.
  const [crestFor, setCrestFor] = useState<TBTeam | null>(null);
  // What a crestless side wears: a per-room RANDOM pair from the icon
  // library — never the stock hat-and-car again (owner's rule: random, or
  // what a captain set). Deterministic (seeded by room id over an ordered
  // pool), so every device and the public card deal the same pair.
  const [crestPool, setCrestPool] = useState<readonly string[]>([]);
  useEffect(() => {
    void fetchCrestPool().then(setCrestPool);
  }, []);
  const dealt = useMemo(
    () =>
      dealtCrests(room?.id ?? "", crestPool, {
        a: room?.team_a_icon ?? null,
        b: room?.team_b_icon ?? null,
      }),
    [room?.id, room?.team_a_icon, room?.team_b_icon, crestPool],
  );
  const [rollFace, setRollFace] = useState<{ [k in TBTeam]?: TBParticipant }>({});
  const rollTimers = useRef<{ [k in TBTeam]?: number }>({});
  const [params, setParams] = useSearchParams();

  // Keep the room's code in the URL: refresh, share, and the round-start
  // watcher all address this exact room by it.
  useEffect(() => {
    if (room && params.get("code") !== room.room_code) {
      setParams({ code: room.room_code }, { replace: true });
    }
  }, [room, params, setParams]);

  // A finished match parks the room back at "waiting" with a done state row;
  // the settle claim is idempotent, so any device landing here fires it.
  useEffect(() => {
    if (state?.phase === "done" && !state.settled) void settle();
  }, [state?.phase, state?.settled, settle]);

  const teamOf = (team: TBTeam) => participants.filter((p) => p.team === team);
  const teamA = teamOf("a");
  const teamB = teamOf("b");
  const teamsEqual =
    teamA.length > 0 && teamA.length === teamB.length && participants.every((p) => p.team);
  // A battle needs at least 2 a side (owner's rule; the cap is the room's
  // own 5-5). The host's Start waits for both benches to fill to two.
  const enoughPlayers = teamA.length >= 2 && teamB.length >= 2;
  // Nobody picks a duration any more: a battle is two rounds per seated
  // player, so everyone gets at least two spotlight turns. Server cap 20
  // (20260921210000) fits the lounge's ten seats.
  const rounds = Math.min(20, Math.max(4, 2 * (teamA.length + teamB.length)));
  // The match pool: every seat stakes 50 coins a round, AI players
  // included. Each winning human collects their 50/round share at settle;
  // a bot's share simply goes uncollected.
  const potValue = 50 * rounds * Math.max(1, teamA.length, teamB.length);

  const start = () => {
    // Party categories (Most Likely To) have no fixed answers — a board
    // tile built from them is unwinnable. Keep them out of the pool.
    const usable = excludePartyCategories(categories).filter(
      (c) => c.tier === "free" || c.tier === "standard",
    );
    void startMatch(usable.map((c) => ({ uuid: c.uuid, name: c.name })), rounds);
  };

  // The team the last-pressed + seat belonged to: peek invites carry it
  // directly, and a modal invite gets moved onto it right after it lands
  // (the modal itself cannot write a team).
  const inviteTeamRef = useRef<TBTeam | null>(null);

  // The peek's Invite button sends the real room invite — the same
  // invited-participant row the invite modal writes, whose DB trigger
  // delivers the notification. The invitee holds the tapped seat greyed
  // until they accept.
  // The arena has no name of its own. It used to be dealt one by the AI
  // namer, shown on a pill in the middle of the lobby and again as the
  // title of its card on the Public tab — so a Trivia Battle advertised
  // itself as "Search Trail", with the game it actually is in small grey
  // type underneath. It is called Trivia Battle. What the two SIDES are
  // called, and what they wear, is the part worth choosing, and that is
  // the captains' to choose (tb_set_team_icon).

  // A crest is written through the RPC, not straight onto the room: the
  // room's own update policy is host-only, and the whole point is that the
  // side's elected captain owns its colours.
  const setTeamIcon = async (team: TBTeam, iconUrl: string) => {
    if (!room) return;
    const { error } = await supabase.rpc("tb_set_team_icon", {
      p_room_id: room.id,
      p_team: team,
      p_icon: iconUrl,
    });
    if (error) toast.error(error.message);
  };

  // The side's NAME goes the same road as its crest: through the
  // captain-only RPC, never straight onto the room row.
  const setTeamName = async (team: TBTeam, name: string) => {
    if (!room || containsBlockedText(name)) return;
    const { error } = await supabase.rpc("tb_set_team_name", {
      p_room_id: room.id,
      p_team: team,
      p_name: name,
    });
    if (error) toast.error(error.message);
  };

  // What a side is CALLED: the captain's name for it, else the name the
  // randomizer dealt at creation, else the old letter as a last resort.
  const teamName = (team: TBTeam) =>
    (team === "a" ? room?.team_a_name : room?.team_b_name) ??
    (team === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB"));

  const inviteToGame = async (entry: InviteEntry) => {
    if (!room) return;
    const { data: existing } = await supabase
      .from("room_participants")
      .select("id")
      .eq("room_id", room.id)
      .eq("user_id", entry.id)
      .maybeSingle();
    if (existing) {
      setInvitedIds((prev) => new Set([...prev, entry.id]));
      return;
    }
    const { error } = await supabase.from("room_participants").insert({
      room_id: room.id,
      user_id: entry.id,
      status: "invited",
      nickname: entry.nickname,
      avatar_url: entry.avatarUrl,
      is_host: false,
      // An invitee sits with whoever invited them: the + seat's side when
      // one asked, otherwise the inviter's own team.
      ...(inviteTeamRef.current
        ? { team: inviteTeamRef.current }
        : myTeam
          ? { team: myTeam }
          : {}),
    });
    if (error) {
      console.error("[TB] invite failed", error);
      toast.error(t("extra.inviteFailed"));
      return;
    }
    setInvitedIds((prev) => new Set([...prev, entry.id]));
    toast.success(t("extra.inviteSent"));
  };

  // Friends and room members picked on the create screen: seat them as
  // invited the moment this lobby opens, and notify them.
  const { sendInvitation } = useGameInvitations();
  const inviteToGameRef = useRef(inviteToGame);
  inviteToGameRef.current = inviteToGame;
  useEffect(() => {
    const list = handoff?.current;
    if (!room || !list || list.length === 0) return;
    handoff.current = null;
    void (async () => {
      for (const person of list) {
        await inviteToGameRef.current({
          id: person.id,
          nickname: person.nickname,
          avatarUrl: person.avatarUrl,
          online: false,
        });
        await sendInvitation(person.id, room.id);
      }
    })();
  }, [room, handoff, sendInvitation]);

  // Modal invites land teamless; when the modal was launched from a + seat,
  // park every teamless invite on that seat's team — the modal sends them
  // as a batch now, not one per opening.
  const assignPendingTeam = async () => {
    // Modal invites without a + seat's side still belong with their
    // inviter — park every teamless invite on the inviter's team.
    const team = inviteTeamRef.current ?? myTeam;
    if (!team || !room) return;
    const { data } = await supabase
      .from("room_participants")
      .select("user_id")
      .eq("room_id", room.id)
      .eq("status", "invited")
      .is("team", null);
    for (const row of data ?? []) {
      await manageSeat(row.user_id, team === "a" ? "move_a" : "move_b");
    }
  };

  // Seats are ASSIGNED, never chosen: the host picked their side on the
  // create screen, so an approved join lands opposite the host the moment
  // the seat appears — nobody stands in the lobby deciding. The context
  // deals the seat on entry; these two effects catch the player who was
  // ALREADY in the lobby when the host accepted them (their row arrives
  // teamless over realtime): their own device sits them down, and the
  // host's device sweeps up anyone whose client never did.
  const iAmSeated = participants.some((p) => p.user_id === user?.id);
  const myTeamlessSeat = iAmSeated && !myTeam;
  const perSide = Math.max(2, Math.min(5, Math.floor((room?.max_players ?? 10) / 2)));
  const oppositeBench = useMemo((): TBTeam | null => {
    const hostTeam = (participants.find((p) => p.is_host)?.team as TBTeam | null) ?? null;
    if (!hostTeam) return null;
    const count = (side: TBTeam) => participants.filter((p) => p.team === side).length;
    const opp: TBTeam = hostTeam === "a" ? "b" : "a";
    if (count(opp) < perSide) return opp;
    if (count(hostTeam) < perSide) return hostTeam;
    return null;
  }, [participants, perSide]);
  // Where a teamless HOST sits: the emptier bench (A on a tie). A host can
  // arrive teamless — they left, and the re-insert predates the dealt-seat
  // fix — and a teamless host had no + seats, no invites, no Start.
  const hostBench = useMemo((): TBTeam | null => {
    const count = (side: TBTeam) => participants.filter((p) => p.team === side).length;
    const a = count("a");
    const b = count("b");
    if (a <= b && a < perSide) return "a";
    if (b < perSide) return "b";
    return a < perSide ? "a" : null;
  }, [participants, perSide]);
  const autoSeatRef = useRef(false);
  useEffect(() => {
    if (!myTeamlessSeat || room?.status !== "waiting" || autoSeatRef.current) return;
    const target = isHost ? hostBench : oppositeBench;
    if (!target) return;
    autoSeatRef.current = true;
    void setTeam(target);
  }, [myTeamlessSeat, room?.status, isHost, hostBench, oppositeBench, setTeam]);
  const sweptRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isHost || room?.status !== "waiting" || !oppositeBench) return;
    participants
      .filter((p) => !p.team && !p.is_bot && p.status !== "invited" && p.user_id !== user?.id)
      .forEach((p) => {
        if (sweptRef.current.has(p.user_id)) return;
        sweptRef.current.add(p.user_id);
        void manageSeat(p.user_id, oppositeBench === "a" ? "move_a" : "move_b");
      });
  }, [isHost, room?.status, oppositeBench, participants, user?.id, manageSeat]);

  // The crest RPC trusts only the ELECTED captain (is_captain), while the
  // chip happily shows the first human as a fallback — a pencil that always
  // failed. The host's device makes the fallback real: a captainless side
  // with humans gets its first human named via tb_set_captain (the vote can
  // re-elect any time); all-bot sides keep their slot-reel roll.
  const namedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isHost || room?.status !== "waiting") return;
    (["a", "b"] as TBTeam[]).forEach((side) => {
      const members = participants.filter((p) => p.team === side);
      if (members.length === 0 || members.some((p) => p.is_captain)) return;
      const first = members.find((p) => !p.is_bot);
      if (!first) return;
      const key = `${side}:${first.user_id}`;
      if (namedRef.current.has(key)) return;
      namedRef.current.add(key);
      void setCaptain(first.user_id);
    });
  }, [isHost, room?.status, participants, setCaptain]);

  // A + seat invites a friend onto that team: the invite page opens
  // remembering the side. It only ever shows on your own bench.
  const seatAction = (team: TBTeam) => {
    inviteTeamRef.current = team;
    setInviteOpen(true);
  };

  // Hold a seat to manage it: the host moves anyone between teams or
  // removes them (pending invites and bots included); a player can switch
  // their own team.
  const [seatMenu, setSeatMenu] = useState<{ p: TBParticipant; pending: boolean } | null>(null);
  type TBParticipant = (typeof participants)[number];

  const seatMenuActions = (p: TBParticipant): SeatMenuAction[] => {
    const actions: SeatMenuAction[] = [];
    // The host rearranges everyone BUT themselves: the side they chose on
    // the create screen is the side they play — the owner's rule — so
    // their own seat offers no move, and no drag either (below).
    if (isHost && p.user_id !== user?.id) {
      if (p.team !== "a")
        actions.push({
          label: t("lobby.moveTo", { team: t("teamBattle.teamA") }),
          onPress: () => void manageSeat(p.user_id, "move_a"),
        });
      if (p.team !== "b")
        actions.push({
          label: t("lobby.moveTo", { team: t("teamBattle.teamB") }),
          onPress: () => void manageSeat(p.user_id, "move_b"),
        });
      actions.push({
          label: t("lobby.removeSeat"),
          destructive: true,
          onPress: () => void manageSeat(p.user_id, "remove"),
        });
    }
    // No self-service side switching: seats are ASSIGNED — an invitee sits
    // with whoever invited them, a join request sits opposite the host —
    // and only the host rearranges the benches.
    return actions;
  };

  // A seat tap opens the player IN PLACE — the profile modal over the
  // lobby, not a route change. Navigating to /profile/:id from here left
  // the couch behind, and its close-reopen bug stranded players on the
  // profile screen. Pending invites are tappable too: the host gets the
  // seat menu (move or withdraw the invite), everyone else sees who was
  // invited.
  const seatTap = (p: TBParticipant, pending: boolean) => {
    if (p.is_bot) {
      if (isHost) setSeatMenu({ p, pending });
      return;
    }
    if (pending && isHost) {
      setSeatMenu({ p, pending });
      return;
    }
    openProfile(p.user_id);
  };
  const seatHold = (p: TBParticipant, pending: boolean) => {
    if (seatMenuActions(p).length > 0) setSeatMenu({ p, pending });
  };

  // Teamless pending invites still occupy a seat — the emptier side.
  const pendingA = pendingInvites.filter((p) => p.team === "a");
  const pendingB = pendingInvites.filter((p) => p.team === "b");
  pendingInvites
    .filter((p) => !p.team)
    .forEach((p) => {
      (teamA.length + pendingA.length <= teamB.length + pendingB.length ? pendingA : pendingB).push(p);
    });

  const renderTeamSeats = (
    team: TBTeam,
    slots: [number, number][],
    podium: [number, number],
  ) => {
    const entries = [
      ...teamOf(team).map((p) => ({ p, pending: false })),
      ...(team === "a" ? pendingA : pendingB).map((p) => ({ p, pending: true })),
    ];
    const ring = team === "a" ? ("blue" as const) : ("red" as const);
    // Only the seats this match is set for. The arena drew all five a side
    // whatever the room's size, so a 2v2 opened with eight empty podiums
    // and no way to tell it apart from a 5v5 nobody had joined yet.
    const all: [number, number][] = [...slots, podium].slice(0, perSide);
    return (
      <AnimatePresence>
        {all.map(([left, top], i) => {
          const entry = entries[i];
          return entry ? (
            <Seat
              key={`${team}-${entry.p.user_id}`}
              left={left}
              top={top - 305}
              avatarUrl={entry.p.avatar_url}
              nickname={entry.p.nickname}
              ring={ring}
              pending={entry.pending}
              crown={
                !entry.pending &&
                entry.p.user_id === (team === "a" ? captainA : captainB)?.user_id
              }
              onClick={() => seatTap(entry.p, entry.pending)}
              onLongPress={() => seatHold(entry.p, entry.pending)}
              // Hold-and-drag reseats — HOST ONLY. Seats are assigned (an
              // invitee sits with their inviter, a join request sits
              // opposite the host), so players don't wander benches; the
              // host can still rearrange anyone, pending invites included.
              draggable={isHost && entry.p.user_id !== user?.id}
              onDragMoved={(dx) => {
                const toOther = team === "a" ? dx > 70 : dx < -70;
                if (!toOther || !isHost || entry.p.user_id === user?.id) return;
                const target: TBTeam = team === "a" ? "b" : "a";
                void manageSeat(entry.p.user_id, target === "a" ? "move_a" : "move_b");
              }}
            />
          ) : (
            // An open seat is only ACTIONABLE on your own side: you invite
            // into your team, never onto the bench across the arena — that
            // side just shows a stroke-only circle in its colour so its
            // free places read.
            team === myTeam ? (
              <PlusSeat
                key={`plus-${team}-${i}`}
                left={left}
                top={top - 305}
                ring={ring}
                onClick={() => seatAction(team)}
              />
            ) : (
              <EmptySeat key={`empty-${team}-${i}`} left={left} top={top - 305} ring={ring} />
            )
          );
        })}
      </AnimatePresence>
    );
  };

  // The named captain (tb_set_captain), falling back to the first human so
  // the pill is never empty on a filled team.
  const captainOf = (members: typeof participants) =>
    members.find((p) => p.is_captain) ?? members.find((p) => !p.is_bot) ?? members[0];
  const captainA = captainOf(teamA);
  const captainB = captainOf(teamB);

  // A dealt crest becomes the ROOM's crest the moment somebody may write
  // it: each side's captain persists their own side's deal (the RPC is
  // captain-only), so later visitors and every surface read the same pair
  // from the row itself. An empty side keeps its dealt crest client-side
  // until someone sits there to own it.
  const dressedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user || !room || room.status !== "waiting") return;
    (["a", "b"] as const).forEach((side) => {
      const current = side === "a" ? room.team_a_icon : room.team_b_icon;
      const deal = side === "a" ? dealt.a : dealt.b;
      const captain = side === "a" ? captainA : captainB;
      if (current || !deal || captain?.user_id !== user.id) return;
      const key = `${room.id}:${side}`;
      if (dressedRef.current.has(key)) return;
      dressedRef.current.add(key);
      void supabase.rpc("tb_set_team_icon", { p_room_id: room.id, p_team: side, p_icon: deal });
    });
  }, [user, room, dealt, captainA, captainB]);

  // An all-AI team can't elect anyone — the host's device rolls the crown
  // like a slot reel: the chip flips through the bots' faces, lands on one,
  // and commits it with tb_set_captain. A sentinel (-1) marks a team already
  // rolled so a failed RPC doesn't loop; it clears once the team changes.
  useEffect(() => {
    (["a", "b"] as TBTeam[]).forEach((team) => {
      const members = participants.filter((p) => p.team === team);
      const allBots = members.length > 0 && members.every((p) => p.is_bot);
      const hasCaptain = members.some((p) => p.is_captain);
      if (!isHost || !allBots || hasCaptain) {
        if (rollTimers.current[team] === -1) rollTimers.current[team] = undefined;
        return;
      }
      if (rollTimers.current[team] !== undefined) return;
      const winner = members[Math.floor(Math.random() * members.length)];
      let tick = 0;
      const id = window.setInterval(() => {
        tick += 1;
        if (tick >= 14) {
          window.clearInterval(id);
          rollTimers.current[team] = -1;
          setRollFace((prev) => ({ ...prev, [team]: undefined }));
          void setCaptain(winner.user_id);
        } else {
          setRollFace((prev) => ({ ...prev, [team]: members[tick % members.length] }));
        }
      }, 100);
      rollTimers.current[team] = id;
    });
  }, [participants, isHost, setCaptain]);

  useEffect(() => {
    const timers = rollTimers.current;
    return () => {
      (["a", "b"] as TBTeam[]).forEach((team) => {
        const id = timers[team];
        if (id !== undefined && id !== -1) window.clearInterval(id);
      });
    };
  }, []);

  return (
    <div
      className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden safe-bleed flex flex-col"
      style={{ background: LILAC_BG }}
    >
      {/* Somebody asking into this arena, when it was published */}
      <JoinRequestGate
        roomId={room?.id}
        isHost={isHost}
        hostTeam={(participants.find((p) => p.is_host)?.team as TBTeam | null) ?? undefined}
      />

      <LilacHeader
        title={t("teamBattle.title")}
        icon={iconBattleCrate}
        onBack={() => {
          // Navigate away first so the gate never re-creates a room the
          // instant this one clears. Back is the online-game page the
          // arena was opened from — not the home screen.
          navigate("/team");
          void leaveRoom();
        }}
        onHelp={() => setHelpOpen((v) => !v)}
      />

      <div className="w-full max-w-[468px] mx-auto shrink-0 border-t border-[#523b76]/[0.08]" />

      {/* The match length, stated rather than picked: rounds follow the
          couch (two per player) so it updates live as seats fill. */}
      <div className="relative z-10 w-full max-w-[500px] mx-auto shrink-0 px-4 pt-2">
        <p className="text-center font-[Nunito] font-black text-[16px] leading-[24px] text-[#334155] tracking-[-0.16px]">
          {t("lobby.roundsN", { n: rounds })}
        </p>
        <p className="pt-[2px] font-[Nunito] font-normal leading-[20px] text-[#0c172c]/70 text-[13px] text-center tracking-[-0.16px]">
          {t("lobby.autoRounds")}
        </p>
        {/* Seats are dealt automatically, so what's worth saying here is
            what the room is short of — or, for a guest, that the host holds
            the Start. Said HERE, at the top, because the bottom of this
            page can sit below the fold on a window whose 100dvh disagrees
            with reality (split view), and a waiting line nobody can see
            reads as a frozen lobby. */}
        {!enoughPlayers ? (
          <p className="pt-[6px] font-[Nunito] font-semibold leading-[20px] text-[#523b76]/70 text-[13px] text-center tracking-[-0.16px]">
            {t("teamBattle.minTwoPerTeam")}
          </p>
        ) : !isHost ? (
          <p className="pt-[6px] font-[Nunito] font-semibold leading-[20px] text-[#523b76]/70 text-[13px] text-center tracking-[-0.16px]">
            {t("teamBattle.waitingHost")}
          </p>
        ) : null}
      </div>

      {/* Not clipped: the arena scene is drawn 139 design-units above this
          box on purpose, and overflow-hidden cut it off exactly under the
          rounds caption — a hard horizontal edge with flat lilac above it and
          the scene below, with the room-name pill straddling the join. The
          scene's own radial fade is only ~64% lilac at that line, which is
          why the seam showed. Uncovered, the faded top runs up behind the
          caption instead; the caption and the friends strip both carry z-10,
          so they stay above it, and the page root still clips the screen. */}
      <div className="flex-1 min-h-0">
      <FitBox width={500} height={525} align="start">
        {/* arena scene (938:6267) + edge fade */}
        <div className="absolute left-[32px] top-[-139px] w-[435px] h-[780px] pointer-events-none">
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={sceneArena} />
          <div className="absolute inset-0" style={{ backgroundImage: ARENA_FADE }} />
        </div>

        {/* the pot (943:21933) — the winning team's real take: 50 coins a
            round to every winning human (tb_settle, 20260921130000) */}
        <AnimatedCoinPill left={158} top={192} width={190} value={potValue} />

        {renderTeamSeats("a", TEAM_A_SLOTS, PODIUM_A)}
        {renderTeamSeats("b", TEAM_B_SLOTS, PODIUM_B)}

        {/* The two sides, each under its own crest (943:21929).
            The crest used to be a 36px sticker beside the label, the same
            one in every arena ever played. It is 60px above the name now,
            and it belongs to the side rather than to the app: the captain
            that side ELECTED picks it, which is the first thing winning a
            captain vote is actually good for. Hosting buys nothing here —
            the host dresses the side they captain and never the other one
            (tb_set_team_icon, 20260925100000). A side that has not voted
            still has a captain for this: captainOf's fallback, its
            earliest-joined human, which is who the server agrees on.

            The row sits above the captain chips at 453 rather than beside
            them, and the middle is empty on purpose — that is where the
            room's name used to be. */}
        {(["a", "b"] as const).map((team) => {
          const isA = team === "a";
          const icon = isA ? dealt.a : dealt.b;
          const mine = isA ? captainA : captainB;
          // Only the side's captain dresses its crest — the host gets no
          // say over the other team (and their own side only while they
          // wear its armband). An empty side has nobody to ask.
          const canDress = !!user && mine?.user_id === user.id;
          return (
            <div
              key={team}
              className="absolute top-[352px] w-[120px] flex flex-col items-center gap-1"
              style={isA ? { left: 26 } : { right: 26 }}
            >
              <motion.button
                whileTap={canDress ? { scale: 0.92 } : undefined}
                transition={{ type: "spring", stiffness: 520, damping: 28 }}
                onClick={canDress ? () => setCrestFor(team) : undefined}
                className="relative"
              >
                {icon ? (
                  <img
                    alt=""
                    className="size-[60px] object-contain drop-shadow-[0_4px_10px_rgba(88,50,160,0.22)]"
                    src={icon}
                  />
                ) : (
                  // The pool hasn't landed yet (or is empty): a quiet slot,
                  // never the stock pair.
                  <span className="block size-[60px] rounded-full bg-white/40 border-2 border-dashed border-[#b9a5e6]" />
                )}
                {canDress && (
                  <span className="absolute -right-1 -bottom-1 flex size-[20px] items-center justify-center rounded-full bg-white shadow-[0px_2px_4px_rgba(0,0,0,0.18)]">
                    <Pencil className="w-3 h-3 text-[#523b76]" />
                  </span>
                )}
              </motion.button>
              <p className="max-w-[150px] truncate font-[Nunito] font-black leading-[22px] text-[#0c172c] text-[18px] tracking-[-0.16px] whitespace-nowrap">
                {teamName(team)}
              </p>
            </div>
          );
        })}

        {/* captains + VS (940:7751 / 936:21185 / 940:7825). The VS is drawn
            FIRST on purpose: these are absolutely positioned siblings, so
            they paint in DOM order, and between the two chips it landed on
            top of the left captain's name. Behind them it stays decoration. */}
        <p
          className="absolute left-0 top-[469px] w-full text-[77px] leading-[43px] text-center not-italic text-[#f5d9ff]"
          style={{ fontFamily: "'Slackey', 'TASolivare', cursive", textShadow: "0px 4px 4px #c7bccc" }}
        >
          VS
        </p>
        <TBCaptainChip
          left={37}
          accent="#e7ba87"
          name={(rollFace.a ?? captainA)?.nickname}
          avatarUrl={(rollFace.a ?? captainA)?.avatar_url}
          rolling={!!rollFace.a}
          onClick={() => setCaptainInfo("a")}
        />
        <TBCaptainChip
          right={33}
          accent="#ed6149"
          name={(rollFace.b ?? captainB)?.nickname}
          avatarUrl={(rollFace.b ?? captainB)?.avatar_url}
          rolling={!!rollFace.b}
          onClick={() => setCaptainInfo("b")}
        />

        {helpOpen && (
          <div
            className="absolute left-[32px] top-[20px] w-[435px] rounded-[24px] p-5 bg-white/95 border border-[#e8e0f5] z-10 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18)]"
            onClick={() => setHelpOpen(false)}
          >
            <p className="font-bold text-[#402666] mb-1">{t("teamBattle.title")}</p>
            <p className="text-sm text-[#402666]/70 leading-relaxed">{t("lobby.tbRules")}</p>
          </div>
        )}
      </FitBox>
      </div>

      {isHost ? (
        <>
          {/* Toasts are suppressed app-wide, so a refused start must say
              why HERE — a dead button under a silent error reads as a
              broken game. */}
          {startError && !loading && (
            <p className="w-full max-w-[500px] mx-auto shrink-0 px-6 pb-1 text-center font-[Nunito] font-bold text-[13px] text-[#dc2626]">
              {t("teamBattle.startFailed")}: {startError}
            </p>
          )}
          <StartButton
            label={loading ? t("teamBattle.starting") : t("lobby.startGame")}
            onClick={start}
            disabled={!teamsEqual || !enoughPlayers || loading}
            loading={loading}
          />
        </>
      ) : null}
      {/* The guest's waiting line moved UP under the rounds caption — the
          bottom of this page can sit below the fold in split view. */}

      {room && (
        <InviteFriendsModal
          isOpen={inviteOpen}
          onClose={() => {
            setInviteOpen(false);
            inviteTeamRef.current = null;
          }}
          inviteLink={`https://mytrivia.io/team-battle?code=${room.room_code}`}
          roomId={room.id}
          roomCode={room.room_code}
          onInviteSuccess={() => void assignPendingTeam()}
        />
      )}

      <SeatMenu
        target={seatMenu ? { nickname: seatMenu.p.nickname, avatarUrl: seatMenu.p.avatar_url } : null}
        onClose={() => setSeatMenu(null)}
        actions={seatMenu ? seatMenuActions(seatMenu.p) : []}
      />


      {crestFor && (
        <RoomIconPickerModal
          isOpen
          autoName={false}
          onClose={() => setCrestFor(null)}
          currentIconUrl={(crestFor === "a" ? room?.team_a_icon : room?.team_b_icon) ?? null}
          roomName={teamName(crestFor)}
          onConfirm={(iconUrl, newName) => {
            const team = crestFor;
            const before = teamName(team);
            setCrestFor(null);
            void setTeamIcon(team, iconUrl);
            if (newName && newName !== before) void setTeamName(team, newName);
          }}
        />
      )}

      <CaptainInfoModal
        open={captainInfo !== null}
        onClose={() => setCaptainInfo(null)}
        title={
          perSide >= 3 && myTeam === captainInfo
            ? t("lobby.chooseCaptainTitle")
            : t("lobby.captainInfoTitle")
        }
        body={t("lobby.captainInfoBody")}
        pickLabel={t("lobby.votePick")}
        icon={
          captainInfo === "a"
            ? dealt.a ?? undefined
            : dealt.b ?? undefined
        }
        myVoteUserId={
          participants.find((p) => p.user_id === user?.id)?.captain_vote ?? null
        }
        members={
          captainInfo
            ? teamOf(captainInfo).map((p) => ({
                userId: p.user_id,
                nickname: p.nickname,
                avatarUrl: p.avatar_url,
                isCaptain:
                  p.user_id === (captainInfo === "a" ? captainA : captainB)?.user_id,
                // Live tally: how many human teammates back this member
                votes: teamOf(captainInfo).filter(
                  (voter) => !voter.is_bot && voter.captain_vote === p.user_id,
                ).length,
                // Only humans can wear the armband; only teammates vote —
                // and never for THEMSELVES (owner's rule), so your own
                // face carries no pick pill.
                selectable: !p.is_bot && p.user_id !== user?.id,
              }))
            : []
        }
        // Captains are VOTED only in the bigger arenas: in a 2-2 a vote
        // between two people is a staring contest, so the modal is
        // information only there (owner's rule — voting starts at 3-3).
        onChoose={
          perSide >= 3 && myTeam === captainInfo
            ? (userId) => void voteCaptain(userId)
            : undefined
        }
      />

    </div>
  );
}

// The TB captain pill (940:7751): name on the left, round avatar docked
// right. Hugs its content — a short name makes a short pill. While an
// all-AI team's crown is being rolled, each face drops through like a slot
// reel; the settled captain's avatar wears the crown.
function TBCaptainChip({
  left,
  right,
  accent,
  name,
  avatarUrl,
  rolling,
  onClick,
}: {
  left?: number;
  right?: number;
  accent: string;
  name?: string;
  avatarUrl?: string | null;
  rolling?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95, y: 3 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      className="absolute h-[50px] inline-flex items-center max-w-[180px] rounded-[16.85px] border-[1.153px] border-solid shadow-[0px_3.389px_0px_0px_#d8d0e8,0px_5.083px_13.556px_0px_rgba(0,0,0,0.1)]"
      style={{
        left,
        right,
        top: 453,
        borderColor: accent,
        background: "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))",
      }}
    >
      <motion.div
        key={name ?? "-"}
        initial={rolling ? { y: -16, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={
          rolling
            ? { duration: 0.09, ease: "easeOut" }
            : { type: "spring", stiffness: 480, damping: 22 }
        }
        className="flex items-center gap-[8px] pl-[14px] pr-[8px] min-w-0"
      >
        {/* An unclaimed armband invites the tap outright; a worn one still
            shows the little pencil so changing captain is discoverable. */}
        <p className="font-[Nunito] font-black leading-[28.974px] text-[#334155] text-[16px] tracking-[-0.1686px] whitespace-nowrap overflow-hidden text-ellipsis">
          {name ?? "—"}
        </p>
        <Pencil className="w-3 h-3 shrink-0 text-[#523b76]/45" />
        <div className="relative shrink-0 size-[33px]">
          <div className="absolute inset-0 rounded-[9999px] overflow-clip bg-[rgba(192,192,192,0.24)]">
            {avatarUrl && (
              <img alt="" className="absolute inset-0 max-w-none object-cover size-full rounded-[9999px]" src={avatarUrl} />
            )}
          </div>
          {!rolling && !!name && (
            <img
              alt=""
              src={crownIcon}
              className="pointer-events-none absolute -top-[8px] left-[8px] w-[17px] object-contain drop-shadow -rotate-12"
            />
          )}
        </div>
      </motion.div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.695px_0px_0px_white]" />
    </motion.button>
  );
}
