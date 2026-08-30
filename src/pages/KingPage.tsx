import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Copy, Crown, Share2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { getGradientById } from "@/config/roomGradients";
import { useCategories } from "@/hooks/useCategories";
import { excludePartyCategories } from "@/config/partyCategories";
import kingIcon from "@/assets/play-modes/trivia-king.png";
import {
  VersusKingProvider,
  useVersusKing,
} from "@/contexts/VersusKingContext";
import { VersusKingMatch } from "@/components/versus-king/VersusKingMatch";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";

/**
 * /king — Versus King (docs/GAME_TYPES_DESIGN.md §3): a room of friends
 * against the King. Entry (create or join by code) → lobby → the
 * server-driven match phases in VersusKingMatch. Same page shape as
 * /team-battle.
 */
export default function KingPage() {
  return (
    <VersusKingProvider>
      <VersusKingInner />
    </VersusKingProvider>
  );
}

function VersusKingInner() {
  const { user } = useAuth();
  const { room, state, joinRoom } = useVersusKing();
  const [params] = useSearchParams();
  // Settling flips the room back to "waiting" within a round-trip; the
  // result screen stays up until the player dismisses it.
  const [resultSeen, setResultSeen] = useState(false);

  useEffect(() => {
    if (state?.phase !== "done") setResultSeen(false);
  }, [state?.phase, state?.game_id]);

  // /king?code=ABC123 joins straight into the lobby (shared invite links,
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

  if (inMatch) return <VersusKingMatch onResultDismiss={() => setResultSeen(true)} />;
  if (room) return <VKLobby />;
  return <VKEntry />;
}

function VKEntry() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { createRoom, joinRoom, loading } = useVersusKing();
  const [code, setCode] = useState("");

  return (
    <div className="h-[100dvh] w-full overflow-hidden safe-bleed bg-[#7E7ADB] relative">
      <Crown
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] text-white/[0.05] pointer-events-none"
        aria-hidden
      />
      <div className="w-full h-full flex flex-col max-w-[520px] mx-auto relative px-6">
        <div className="flex items-center pt-[calc(var(--safe-top)_+_0.75rem)]">
          <button
            onClick={() => navigate(-1)}
            aria-label={t("common.back")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-8 pb-16">
          <div className="text-center">
            <motion.img
              src={kingIcon}
              alt=""
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 mx-auto mb-3 object-contain"
              draggable={false}
            />
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-black text-white"
              style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
            >
              {t("kingTeam.title")}
            </motion.h1>
            <p className="text-white/70 text-sm mt-3 max-w-[300px] mx-auto">
              {t("kingTeam.entryHint")}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <ChunkyButton
              variant="white"
              size="xl"
              className="w-full"
              icon={<Crown className="w-5 h-5" />}
              disabled={loading}
              onClick={() => void createRoom()}
            >
              {t("kingTeam.createRoom")}
            </ChunkyButton>

            <div className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm p-2 pl-4 border border-white/[0.12]">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("kingTeam.codePlaceholder")}
                maxLength={6}
                className="flex-1 min-w-0 bg-transparent outline-none font-mono text-lg tracking-[0.3em] text-white placeholder:text-white/40"
              />
              <ChunkyButton
                variant="mint"
                size="md"
                disabled={code.length < 6 || loading}
                onClick={() => void joinRoom(code)}
              >
                {t("kingTeam.joinRoom")}
              </ChunkyButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VKLobby() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    room, participants, isHost, startMatch, leaveRoom, loading, state, settle,
  } = useVersusKing();
  const { categories } = useCategories();
  const gradient = getGradientById(room?.background_gradient ?? undefined);

  // A finished match parks the room back at "waiting" with a done state row;
  // the settle claim is idempotent, so any device landing here fires it.
  useEffect(() => {
    if (state?.phase === "done" && !state.settled) void settle();
  }, [state?.phase, state?.settled, settle]);

  // The app's Invite Friends screen: pick from the friend list (lands them
  // in this room as an invited seat + a notification) or share/copy a link.
  const [showInvite, setShowInvite] = useState(false);

  const players = participants.filter((p) => !p.is_bot);
  // An invite that has not been answered is a reserved seat, not a player:
  // the server only counts joined/ready/playing at start, so the button
  // must not light up on pending invites alone.
  const arrived = players.filter((p) => p.status !== "invited" && p.status !== "disconnected");
  const canStart = arrived.length >= 2;

  const copyCode = () => {
    void navigator.clipboard?.writeText(room?.room_code ?? "");
    toast.success(t("kingTeam.codeCopied"));
  };


  const start = () => {
    // Random categories: the party categories have no fixed answers and the
    // team should not meet a paywalled bank mid-match.
    const usable = excludePartyCategories(categories).filter(
      (c) => c.tier === "free" || c.tier === "standard",
    );
    void startMatch(usable.map((c) => ({ uuid: c.uuid, name: c.name })));
  };

  return (
    <div
      className="h-[100dvh] w-full flex flex-col overflow-hidden safe-bleed"
      style={{ background: gradient?.gradient ?? "#7E7ADB" }}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col max-w-[520px] mx-auto">
        <div className="flex items-center justify-between px-5 pt-[calc(var(--safe-top)_+_0.75rem)] pb-3">
          <h1
            className="text-2xl font-black text-white flex items-center gap-2"
            style={{ fontFamily: "'TASolivare', sans-serif" }}
          >
            <Crown className="w-5 h-5" /> {t("kingTeam.title")}
          </h1>
          <button onClick={() => void leaveRoom()} className="text-white/60 text-xs font-bold">
            {t("kingTeam.leave")}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              onClick={copyCode}
              className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/[0.12] p-4 flex items-center justify-between"
            >
              <div className="text-left">
                <p className="text-[11px] text-white/60 font-semibold uppercase tracking-wide">
                  {t("kingTeam.shareCode")}
                </p>
                <p className="font-mono text-2xl font-bold tracking-[0.3em] text-white">
                  {room?.room_code}
                </p>
              </div>
              <Copy className="w-5 h-5 text-white/60 ml-3" />
            </button>
            <button
              onClick={() => setShowInvite(true)}
              aria-label={t("kingTeam.invite")}
              className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/[0.12] px-5 flex flex-col items-center justify-center gap-1"
            >
              <Share2 className="w-5 h-5 text-white" />
              <span className="text-[11px] text-white/70 font-semibold">{t("kingTeam.invite")}</span>
            </button>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/[0.12] p-4">
            <div className="flex items-center gap-3 mb-3">
              <img src={kingIcon} alt="" className="w-12 h-12 object-contain" draggable={false} />
              <p className="text-white/80 text-sm">{t("kingTeam.lobbyHint")}</p>
            </div>
            <div className="flex flex-col gap-2">
              {players.map((p) => {
                const pending = p.status === "invited";
                return (
                  <div
                    key={p.user_id}
                    className="flex items-center gap-2 rounded-xl px-1 py-0.5"
                    style={{ opacity: pending ? 0.55 : 1 }}
                  >
                    <SmartAvatar avatarUrl={p.avatar_url} fallback={p.nickname} size="xs" />
                    <span className="text-sm text-white truncate">
                      {p.nickname}
                      {p.user_id === user?.id ? ` (${t("kingTeam.you")})` : ""}
                    </span>
                    {p.is_host && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                    {pending && (
                      <span className="ml-auto text-[10px] font-bold text-white/60 uppercase">
                        {t("kingTeam.invitedPending")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-white/50 text-xs mt-3">
              {t("kingTeam.playerCount", { n: arrived.length, max: 10 })}
            </p>
          </div>

          {!canStart && (
            <p className="text-center text-xs text-white/60">{t("kingTeam.needTwoPlayers")}</p>
          )}
          {!isHost && (
            <p className="text-center text-sm text-white/60">{t("kingTeam.waitingHost")}</p>
          )}
        </div>

        {isHost && (
          <div className="px-5 pt-4 pb-[calc(1.25rem_+_var(--safe-bottom))] bg-gradient-to-t from-black/50 via-black/20 to-transparent">
            <ChunkyButton
              variant="white"
              size="xl"
              className="w-full"
              disabled={!canStart || loading}
              onClick={start}
            >
              {loading ? t("kingTeam.starting") : t("kingTeam.start")}
            </ChunkyButton>
          </div>
        )}
      </div>

      <InviteFriendsModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        roomId={room?.id}
        roomCode={room?.room_code}
      />
    </div>
  );
}
