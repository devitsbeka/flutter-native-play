import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Pencil } from "lucide-react";
import { UniversalLobby, LobbyInviteRow, LobbyInfoRow, type LobbyPlayer, type LobbyPlayerGroup } from "@/components/lobby/UniversalLobby";
import { LOBBY_SCENES } from "@/utils/lobbyScene";
import { roomVisibilityFields } from "@/utils/roomVisibility";
import { useFriends } from "@/hooks/useFriends";
import { useNotifications } from "@/hooks/useNotifications";
import coinIconAsset from "@/assets/tb-lobby/coin.png";
import iconBattleCrate from "@/assets/play-chooser/icon-crate.png";
import { containsBlockedText } from "@/utils/contentFilter";
import { readAppLanguage } from "@/utils/appLanguage";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { RoomIconPickerModal } from "@/components/team/RoomIconPickerModal";
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
  CaptainInfoModal,
  type InviteEntry,
  LILAC_BG,
  SeatMenu,
  type SeatMenuAction,
} from "@/components/lobby/LilacLobby";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { dealtCrests, fetchCrestPool } from "@/utils/roomCrests";
import { dealTeamNames, TEAM_NAME_MAX } from "@/utils/teamNameGenerator";

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

function TBLobby({ handoff }: { handoff?: MutableRefObject<LoungeInvite[] | null> }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    room, participants, pendingInvites, isHost, myTeam, setTeam, refreshRoom,
    setCaptain, voteCaptain, manageSeat, startMatch, startError, leaveRoom, loading, state, settle,
  } = useTeamBattle();
  const { categories } = useCategories();
  const { openProfile } = usePlayerProfile();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { friends } = useFriends();
  const { unreadCount } = useNotifications();
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
  /** What the side is wearing right now, dealt or chosen — what the picker
      should open on, rather than an empty slot next to a filled bench. */
  const dealtFor = (team: TBTeam) => (team === "a" ? dealt.a : dealt.b) ?? null;
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
    // The slug rides along so the board can set its own clock: a picture
    // board runs a minute a turn, everything else ninety seconds.
    void startMatch(
      usable.map((c) => ({ uuid: c.uuid, name: c.name, slug: c.category_id })),
      rounds,
    );
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
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshRoom();
  };

  // The side's NAME goes the same road as its crest: through the
  // captain-only RPC, never straight onto the room row.
  const setTeamName = async (team: TBTeam, name: string) => {
    if (!room) return;
    if (containsBlockedText(name)) {
      // Silence here read as "the rename didn't work". Say why.
      toast.error(t("extra.textNotAllowed"));
      return;
    }
    const { error } = await supabase.rpc("tb_set_team_name", {
      p_room_id: room.id,
      p_team: team,
      p_name: name.slice(0, TEAM_NAME_MAX),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshRoom();
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
    if (!p.is_bot && p.status !== "invited") {
      actions.push({ label: t("extra.viewProfile"), onPress: () => openProfile(p.user_id) });
    }
    // The host rearranges everyone BUT themselves: the side they chose on
    // the create screen is the side they play — the owner's rule — so
    // their own seat offers no move, and no drag either (below).
    if (isHost && p.user_id !== user?.id) {
      if (p.team !== "a")
        actions.push({
          label: t("lobby.moveTo", { team: teamName("a") }),
          onPress: () => void manageSeat(p.user_id, "move_a"),
        });
      if (p.team !== "b")
        actions.push({
          label: t("lobby.moveTo", { team: teamName("b") }),
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

  // A row tap opens the player IN PLACE — the profile modal over the
  // lobby, not a route change. Navigating to /profile/:id from here left
  // the couch behind, and its close-reopen bug stranded players on the
  // profile screen. The host gets the seat menu for everyone but
  // themselves (a list row has one gesture, so the menu carries the
  // profile too); pending invites are tappable the same way, so the host
  // can move or withdraw an invite and everyone else sees who was asked.
  const seatTap = (p: TBParticipant, pending: boolean) => {
    if (isHost && p.user_id !== user?.id) {
      setSeatMenu({ p, pending });
      return;
    }
    if (!p.is_bot && !pending) openProfile(p.user_id);
  };

  // Teamless pending invites still occupy a seat — the emptier side.
  const pendingA = pendingInvites.filter((p) => p.team === "a");
  const pendingB = pendingInvites.filter((p) => p.team === "b");
  pendingInvites
    .filter((p) => !p.team)
    .forEach((p) => {
      (teamA.length + pendingA.length <= teamB.length + pendingB.length ? pendingA : pendingB).push(p);
    });

  // One bench of the universal lobby: the side's seated players, then its
  // pending invites, faded. Only the seats this match is set for — the
  // arena used to draw all five a side whatever the room's size.
  const benchRows = (team: TBTeam, captain: TBParticipant | undefined): LobbyPlayer[] => {
    const entries = [
      ...teamOf(team).map((p) => ({ p, pending: false })),
      ...(team === "a" ? pendingA : pendingB).map((p) => ({ p, pending: true })),
    ];
    return entries.slice(0, perSide).map(({ p, pending }) => ({
      id: p.user_id,
      name: p.nickname,
      avatarUrl: p.avatar_url,
      // The crown marks the side's captain here, not the room's host: in
      // the arena the captain is the role that matters on a bench.
      isHost: !pending && p.user_id === captain?.user_id,
      isYou: p.user_id === user?.id,
      pending,
      onPress: () => seatTap(p, pending),
    }));
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

  const inviteFaces = [...friends]
    .filter((f) => f.status === "accepted")
    .sort((a, b) => Number(!!b.isOnline) - Number(!!a.isOnline))
    .slice(0, 3)
    .map((f) => ({ url: f.avatarUrl, online: !!f.isOnline }));

  // The host can still publish or withdraw the arena from the lobby; the
  // row's own update policy is host-only, and the write goes through the
  // same guard every game_rooms visibility write does.
  const setVisibility = async (value: string) => {
    if (!room || !isHost) return;
    const { error } = await supabase
      .from("game_rooms")
      .update({ ...(await roomVisibilityFields(value === "public")) })
      .eq("id", room.id);
    if (error) toast.error(error.message);
  };

  // The bench's heading: its crest (the captain dresses it), its name, how
  // full it is, and the captain chip that opens the vote sheet. While an
  // all-AI side's crown is being rolled the chip flips through the bots'
  // faces like a slot reel.
  const benchTitle = (team: TBTeam) => {
    const isA = team === "a";
    const icon = isA ? dealt.a : dealt.b;
    const mine = isA ? captainA : captainB;
    const face = (isA ? rollFace.a : rollFace.b) ?? mine;
    // Only the side's captain dresses its crest — the host gets no say
    // over the other team (and their own side only while they wear its
    // armband). An empty side has nobody to ask.
    const canDress = !!user && mine?.user_id === user.id;
    const accent = isA ? "#e7ba87" : "#ed6149";
    return (
      <div className={isA ? "flex flex-col" : "mt-[18px] flex flex-col"}>
        {!isA && (
          <p
            className="mb-[10px] text-center font-hero text-[26px] leading-[30px] text-[#d8b2e8]"
            style={{ textShadow: "0px 2px 2px rgba(199,188,204,0.6)" }}
          >
            VS
          </p>
        )}
        <div className="flex items-center gap-3 pl-[2px] pr-[4px]">
          <motion.button
            type="button"
            whileTap={canDress ? { scale: 0.92 } : undefined}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            onClick={canDress ? () => setCrestFor(team) : undefined}
            className="relative shrink-0"
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
          <div className="min-w-0 flex-1">
            <p className="truncate font-[Nunito] font-black leading-[22px] text-[#0c172c] text-[18px] tracking-[-0.16px]">
              {teamName(team)}
            </p>
            <p className="font-[Nunito] text-[12px] leading-4 text-[#402666]/60">
              {teamOf(team).length}/{perSide}
            </p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setCaptainInfo(team)}
            className="flex h-[40px] max-w-[46%] items-center gap-2 rounded-full border border-[rgba(156,100,181,0.5)] bg-white/60 py-[3px] pl-3 pr-[3px]"
          >
            <span className="min-w-0 text-left">
              <span className="block font-[Nunito] text-[10px] leading-3 text-[#402666]/60">{t("lobby.captainLabel")}</span>
              <span className="block max-w-[96px] truncate font-[Nunito] text-[13px] font-bold leading-4 text-[#402666]">
                {face?.nickname ?? t("lobby.chooseCaptain")}
              </span>
            </span>
            <span
              className="block h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#e9d8ff]"
              style={{ boxShadow: `0 0 0 2px ${accent}` }}
            >
              {face?.avatar_url && <img alt="" src={face.avatar_url} className="h-full w-full object-cover" />}
            </span>
          </motion.button>
        </div>
      </div>
    );
  };

  // An open seat is only ACTIONABLE on your own side: you invite into your
  // team, never onto the bench across the arena.
  const benchFooter = (team: TBTeam) => {
    const taken = teamOf(team).length + (team === "a" ? pendingA : pendingB).length;
    if (team !== myTeam || taken >= perSide) return null;
    return (
      <LobbyInviteRow
        className="mb-[6px] mt-[6px]"
        faces={inviteFaces}
        label={t("lobby.uInvite")}
        onPress={() => seatAction(team)}
      />
    );
  };

  const benches: LobbyPlayerGroup[] = (["a", "b"] as TBTeam[]).map((team) => ({
    key: team,
    title: benchTitle(team),
    players: benchRows(team, team === "a" ? captainA : captainB),
    footer: benchFooter(team),
  }));

  return (
    <UniversalLobby
      sceneArt={LOBBY_SCENES.battle}
      // The arena has no name of its own (see above): it is called
      // Trivia Battle, and the two SIDES carry the identity.
      roomName={t("teamBattle.title")}
      // The arena's own sign. The battle's room has no face to change —
      // what the sides wear is the part worth choosing, and that is on the
      // benches — so this one is fixed and carries no pencil.
      icon={iconBattleCrate}
      onBack={() => {
        // Navigate away first so the gate never re-creates a room the
        // instant this one clears. Back is the online-game page the
        // arena was opened from — not the home screen.
        navigate("/team");
        void leaveRoom();
      }}
      unreadCount={unreadCount}
      labels={{
        rules: t("lobby.uGameRules"),
        players: t("lobby.uPlayersTab"),
        invite: t("lobby.uInvite"),
        you: t("lobby.uYou"),
        rounds: (count) => t("lobby.uRoundsShort", { count }),
      }}
      rules={[
        {
          key: "visibility",
          label: t("lobby.uVisibility"),
          options: [
            { value: "public", label: t("extra.roomPublic") },
            { value: "private", label: t("extra.roomPrivate") },
          ],
          value: room?.is_public ? "public" : "private",
          onChange: isHost ? (value) => void setVisibility(value) : undefined,
        },
      ]}
      rulesExtra={
        <>
          {/* The size the host set on the create screen; the match length,
              stated rather than picked (two rounds a player, live as seats
              fill); and the pot — the winning team's real take, 50 coins a
              round to every winning human (tb_settle). */}
          <LobbyInfoRow label={t("lobby.uTeamSize")}>
            {perSide} v {perSide}
          </LobbyInfoRow>
          <LobbyInfoRow label={t("lobby.roundsN", { n: rounds })} hint={t("lobby.autoRounds")} />
          <LobbyInfoRow label={t("lobby.winnerTakes")}>
            <img alt="" src={coinIconAsset} className="h-6 w-6 object-contain" />
            {potValue}
          </LobbyInfoRow>
          <p className="px-[6px] pt-[2px] font-[Nunito] text-[13px] leading-[18px] text-[#402666]/70">
            {t("lobby.tbRules")}
          </p>
        </>
      }
      players={benches}
      playersHint={!enoughPlayers ? t("teamBattle.minTwoPerTeam") : null}
      // Two a side to start, up to the size the host set (2-2 … 5-5).
      // Each bench's own invite line already stands down when that side
      // is full, so the arena's count is for the rules tab and the tally.
      capacity={{
        min: 4,
        max: perSide * 2,
        taken: participants.length + pendingInvites.length,
        fullLabel: t("extra.mpRoomFull"),
      }}
      inviteFaces={inviteFaces}
      initialTab="players"
      start={
        isHost
          ? {
              label: loading ? t("teamBattle.starting") : t("lobby.startGame"),
              onPress: start,
              disabled: !teamsEqual || !enoughPlayers || loading,
              loading,
            }
          : {
              label: t("lobby.startGame"),
              onPress: () => undefined,
              disabled: true,
              caption: t("teamBattle.waitingHost"),
            }
      }
      footerExtra={
        // Toasts are suppressed app-wide, so a refused start must say why
        // HERE — a dead button under a silent error reads as a broken game.
        isHost && startError && !loading ? (
          <p className="pb-2 text-center font-[Nunito] font-bold text-[13px] text-[#dc2626]">
            {t("teamBattle.startFailed")}: {startError}
          </p>
        ) : null
      }
    >
      {/* Somebody asking into this arena, when it was published */}
      {/* The doorstep is app-wide now (GlobalJoinRequestGate in App), and
          it reads the host's own side for the "with me" picker itself. */}

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
          currentIconUrl={(crestFor === "a" ? room?.team_a_icon : room?.team_b_icon) ?? dealtFor(crestFor)}
          roomName={teamName(crestFor)}
          nameMaxLength={TEAM_NAME_MAX}
          onConfirm={(iconUrl, newName) => {
            const team = crestFor;
            const before = teamName(team);
            setCrestFor(null);
            // Either half of this sheet may be the reason it was opened: a
            // side with no crest of its own on the row (the deal is still
            // client-side) hands back a null icon, and the rename is the
            // whole edit.
            if (iconUrl) void setTeamIcon(team, iconUrl);
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
    </UniversalLobby>
  );
}
