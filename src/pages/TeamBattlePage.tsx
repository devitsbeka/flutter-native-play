import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Pencil } from "lucide-react";
import { containsBlockedText } from "@/utils/contentFilter";
import { readAppLanguage } from "@/utils/appLanguage";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
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
import { useGameInvitations } from "@/hooks/useGameInvitations";
import {
  AnimatedCoinPill,
  CaptainInfoModal,
  FriendPeek,
  type InviteEntry,
  LILAC_BG,
  LilacHeader,
  FitBox,
  PlusSeat,
  Seat,
  SeatMenu,
  type SeatMenuAction,
  StartButton,
} from "@/components/lobby/LilacLobby";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import sceneArena from "@/assets/tb-lobby/scene-arena.webp";
import crownIcon from "@/assets/crown-icon.png";
import teamPenguins from "@/assets/tb-lobby/team-penguins.png";
import teamFormula from "@/assets/tb-lobby/team-formula.png";

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
  const { t } = useLanguage();
  const { user } = useAuth();
  const { createRoom } = useTeamBattle();
  const [failed, setFailed] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (joining || !user || attempted.current) return;
    attempted.current = true;
    void createRoom().then((created) => {
      if (!created) setFailed(true);
      // The room's code goes into the URL so a refresh rejoins this room
      // instead of minting a new one.
      else navigate(`/team-battle?code=${created.room_code}`, { replace: true });
    });
  }, [joining, user, createRoom, navigate]);

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
            void createRoom().then((created) => {
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
    setCaptain, voteCaptain, manageSeat, startMatch, leaveRoom, loading, state, settle,
  } = useTeamBattle();
  const { categories } = useCategories();
  const { openProfile } = usePlayerProfile();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [peek, setPeek] = useState<InviteEntry | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [captainInfo, setCaptainInfo] = useState<TBTeam | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameAttempted = useRef(false);
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
  // Nobody picks a duration any more: a battle is two rounds per seated
  // player, so everyone gets at least two spotlight turns. Server cap 20
  // (20260921210000) fits the lounge's ten seats.
  const rounds = Math.min(20, Math.max(4, 2 * (teamA.length + teamB.length)));
  // The match pool: every seat stakes 50 coins a round, AI players
  // included. Each winning human collects their 50/round share at settle;
  // a bot's share simply goes uncollected.
  const potValue = 50 * rounds * Math.max(1, teamA.length, teamB.length);

  const start = () => {
    const usable = categories.filter((c) => c.tier === "free" || c.tier === "standard");
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
  // A team needs a name — same AI namer the King lounge and the classic
  // create screen use. The host's device asks once for an unnamed room;
  // everyone picks it up off the tb-room realtime channel.
  useEffect(() => {
    if (!room || room.room_name || nameAttempted.current) return;
    if (!isHost) return;
    nameAttempted.current = true;
    const roomId = room.id;
    void supabase.functions
      .invoke("generate-room-name", { body: { language: readAppLanguage() } })
      .then(async ({ data }) => {
        const name = ((data?.name as string) || "")
          .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA00}-\u{1FAFF}]/gu, "")
          .trim();
        if (!name) return;
        await supabase.from("game_rooms").update({ room_name: name }).eq("id", roomId);
      });
  }, [room, isHost]);

  const saveTeamName = async () => {
    const name = nameDraft.trim();
    if (!room || !name) return;
    if (containsBlockedText(name)) {
      toast.error(t("extra.textNotAllowed"));
      return;
    }
    setRenameOpen(false);
    const { error } = await supabase.from("game_rooms").update({ room_name: name }).eq("id", room.id);
    if (error) toast.error(error.message);
  };

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
      ...(inviteTeamRef.current ? { team: inviteTeamRef.current } : {}),
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
    const team = inviteTeamRef.current;
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

  // A + seat invites a friend onto that team — no AI players here, these
  // lounges are for people. The invite modal opens with the team remembered
  // so an accepted friend lands on the right side.
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
    if (isHost) {
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
      if (p.user_id !== user?.id)
        actions.push({
          label: t("lobby.removeSeat"),
          destructive: true,
          onPress: () => void manageSeat(p.user_id, "remove"),
        });
    } else if (p.user_id === user?.id) {
      actions.push({
        label: t("lobby.switchTeam"),
        onPress: () => void setTeam(p.team === "a" ? "b" : "a"),
      });
    }
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
    const all: [number, number][] = [...slots, podium];
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
              // Hold-and-drag reseats: the host drags anyone (pending
              // invites and bots too), a player drags themselves. A pull
              // far enough toward the other side of the arena moves them —
              // the seat snaps back and the roster update reseats for real.
              draggable={isHost || (!entry.pending && entry.p.user_id === user?.id)}
              onDragMoved={(dx) => {
                const toOther = team === "a" ? dx > 70 : dx < -70;
                if (!toOther) return;
                const target: TBTeam = team === "a" ? "b" : "a";
                if (!entry.pending && entry.p.user_id === user?.id) {
                  void setTeam(target);
                } else if (isHost) {
                  void manageSeat(entry.p.user_id, target === "a" ? "move_a" : "move_b");
                }
              }}
            />
          ) : (
            <PlusSeat key={`plus-${team}-${i}`} left={left} top={top - 305} onClick={() => seatAction(team)} />
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
      className="h-[100dvh] w-full overflow-hidden safe-bleed flex flex-col"
      style={{ background: LILAC_BG }}
    >
      <LilacHeader
        title={t("teamBattle.title")}
        onBack={() => {
          // Navigate away first so the gate never re-creates a room the
          // instant this one clears.
          navigate("/");
          void leaveRoom();
        }}
        onHelp={() => setHelpOpen((v) => !v)}
      />

      {/* the same friends reel the home page uses — identical sizes/fonts */}
      <div className="relative z-10 w-full shrink-0 px-4" style={{ transform: "translateZ(0)" }}>
        <FriendsStoriesBar
          onAddFriendClick={() => setInviteOpen(true)}
          onFriendClick={(f) =>
            setPeek({ id: f.friendId, nickname: f.nickname, avatarUrl: f.avatarUrl, online: !!f.isOnline })
          }
        />
      </div>

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
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
      <FitBox width={500} height={525} align="start">
        {/* arena scene (938:6267) + edge fade */}
        <div className="absolute left-[32px] top-[-139px] w-[435px] h-[780px] pointer-events-none">
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={sceneArena} />
          <div className="absolute inset-0" style={{ backgroundImage: ARENA_FADE }} />
        </div>

        {/* the team's name — AI-dealt on first open, host taps to rename */}
        <div className="absolute left-[32px] top-[6px] w-[435px] flex justify-center z-10">
          <motion.button
            whileTap={{ scale: 0.95, y: 2 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            onClick={
              isHost
                ? () => {
                    setNameDraft(room?.room_name ?? "");
                    setRenameOpen(true);
                  }
                : undefined
            }
            className="inline-flex items-center gap-2 max-w-[330px] h-[40px] px-4 rounded-[16px] bg-white/70 border border-[#e8e0f5] shadow-[0px_2.5px_0px_0px_#d8d0e8]"
          >
            <span
              className="text-[18px] leading-none text-[#523b76] whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ fontFamily: "'TASolivare', sans-serif" }}
            >
              {room?.room_name || t("lobby.teamName")}
            </span>
            {isHost && <Pencil className="w-3.5 h-3.5 shrink-0 text-[#523b76]/50" />}
          </motion.button>
        </div>

        {/* the pot (943:21933) — the winning team's real take: 50 coins a
            round to every winning human (tb_settle, 20260921130000) */}
        <AnimatedCoinPill left={158} top={192} width={190} value={potValue} />

        {renderTeamSeats("a", TEAM_A_SLOTS, PODIUM_A)}
        {renderTeamSeats("b", TEAM_B_SLOTS, PODIUM_B)}

        {/* team names row (943:21929), with the host's labeled AI-player buttons */}
        <div className="absolute left-[26px] top-[408px] w-[441px] flex items-center justify-between">
          <div className="flex gap-[10px] items-center">
            <img alt="" className="size-[36px] -scale-y-100 rotate-180 object-contain" src={teamPenguins} />
            <p className="font-[Nunito] font-black leading-[24px] text-[#0c172c] text-[18px] tracking-[-0.16px] whitespace-nowrap">
              {t("teamBattle.teamA")}
            </p>
          </div>
          <div className="flex gap-[10px] items-center">
            <p className="font-[Nunito] font-extrabold leading-[24px] text-[#0c172c] text-[18px] text-right tracking-[-0.16px] whitespace-nowrap">
              {t("teamBattle.teamB")}
            </p>
            <img alt="" className="size-[36px] -scale-y-100 rotate-180 object-contain" src={teamFormula} />
          </div>
        </div>

        {/* captains + VS (940:7751 / 936:21185 / 940:7825) */}
        <TBCaptainChip
          left={37}
          accent="#e7ba87"
          name={(rollFace.a ?? captainA)?.nickname}
          avatarUrl={(rollFace.a ?? captainA)?.avatar_url}
          rolling={!!rollFace.a}
          onClick={() => setCaptainInfo("a")}
        />
        <p
          className="absolute left-0 top-[469px] w-full text-[77px] leading-[43px] text-center not-italic text-[#f5d9ff]"
          style={{ fontFamily: "'Slackey', 'TASolivare', cursive", textShadow: "0px 4px 4px #c7bccc" }}
        >
          VS
        </p>
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
        <StartButton
          label={loading ? t("teamBattle.starting") : t("lobby.startGame")}
          onClick={start}
          disabled={!teamsEqual || loading}
        />
      ) : (
        <p className="w-full max-w-[500px] mx-auto shrink-0 px-[24px] pt-[14px] pb-[20px] text-center font-[Nunito] font-semibold text-[15px] text-[#523b76]/70">
          {t("teamBattle.waitingHost")}
        </p>
      )}

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

      {/* host renames the team — small white sheet over the lilac wash */}
      {renameOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center px-8 backdrop-blur-[10px] bg-[rgba(245,217,255,0.6)]"
          onClick={() => setRenameOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="w-full max-w-[320px] rounded-[24px] bg-white/95 border border-[#e8e0f5] p-5 flex flex-col gap-3 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[19px] text-[#523b76] text-center" style={{ fontFamily: "'TASolivare', sans-serif" }}>
              {t("lobby.teamName")}
            </p>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={40}
              autoFocus
              className="w-full h-[46px] rounded-[16px] border border-[#e8e0f5] bg-[#f8f5ff] px-4 font-[Nunito] font-semibold text-[15px] text-[#402666] outline-none focus:border-[#b99ce2]"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => void saveTeamName()}
              disabled={!nameDraft.trim()}
              className="w-full h-[46px] rounded-[16px] bg-[#8858d5] text-white font-[Nunito] font-bold text-[15px] disabled:opacity-50"
            >
              {t("common.save")}
            </motion.button>
            <button
              onClick={() => setRenameOpen(false)}
              className="font-[Nunito] text-sm font-semibold text-[#523b76]/50"
            >
              {t("common.cancel")}
            </button>
          </motion.div>
        </div>
      )}

      <CaptainInfoModal
        open={captainInfo !== null}
        onClose={() => setCaptainInfo(null)}
        title={t("lobby.captainInfoTitle")}
        body={t("lobby.captainInfoBody")}
        chooseLabel={myTeam === captainInfo ? t("lobby.chooseCaptain") : undefined}
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
                // Only humans can wear the armband; only teammates vote
                selectable: !p.is_bot,
              }))
            : []
        }
        onChoose={myTeam === captainInfo ? (userId) => void voteCaptain(userId) : undefined}
      />

      <FriendPeek
        friend={peek}
        onClose={() => setPeek(null)}
        actionLabel={t("lobby.inviteToGame")}
        invitedLabel={t("lobby.invitedState")}
        invited={
          !!peek &&
          (invitedIds.has(peek.id) || participants.some((p) => p.user_id === peek.id))
        }
        onAction={() => peek && void inviteToGame(peek)}
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
