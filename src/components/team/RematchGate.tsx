/**
 * "Rematch?" - asked in place, with the match on the card.
 *
 * A rematch ask used to be a bell entry and a ten-second toast. The player
 * it was for might be sitting on the results screen, in the lobby, on the
 * home screen; the toast said a name and vanished, and the answer lived in
 * a list they had to go and find. This is the same card the room's other
 * asks wear - the host's face, what they want, the two answers - with what
 * is being proposed under it: the room, the rounds in order, the question
 * count and the stake (owner: "ask other players if they want rematch or
 * not, show that it is a rematch, show new match categories and rules").
 *
 * Yes marks the seat ready and goes to the room; no gives the seat up - a
 * seat that stays at the table is staked when the round settles - and, for
 * a player standing in that room, walks them out of it.
 *
 * Mounted once, app-wide, beside the other gates.
 */

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PersonAskModal } from "@/components/shared/PersonAskModal";
import { JoinRequestRoomCard } from "@/components/team/JoinRequestGate";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ROOM_KIND_COLUMNS, routeForRoom } from "@/utils/roomRoutes";
import { answerRematchRequest, type RematchRequestData } from "@/utils/rematchRequests";
import coinIcon from "@/assets/tb-lobby/coin.png";

/** The proposed match: rounds in play order, questions per round, stake. */
export function RematchMatchCard({
  rounds,
  questionsPerRound,
  stake,
}: {
  rounds: { name: string; icon_slug: string | null }[];
  questionsPerRound: number | null;
  stake: number | null;
}) {
  const { t } = useLanguage();
  return (
    <div className="mt-2 rounded-2xl border border-border bg-muted/50 px-3 py-2.5 text-left">
      {rounds.length > 0 && (
        <ol className="max-h-[132px] space-y-1.5 overflow-y-auto">
          {rounds.map((round, i) => (
            <li key={`${i}-${round.name}`} className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <DynamicIcon slug={round.icon_slug ?? "mystery-box"} size={22} shadow={false} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{round.name}</span>
            </li>
          ))}
        </ol>
      )}
      <div
        className={cn(
          "flex items-center gap-2 text-xs font-semibold text-muted-foreground",
          rounds.length > 0 && "mt-2 border-t border-border pt-2",
        )}
      >
        {questionsPerRound !== null && (
          <span className="truncate">
            {t("lobby.uQuestionsPerRound")}: <span className="text-foreground">{questionsPerRound}</span>
          </span>
        )}
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-0.5 font-bold text-foreground">
          {stake ? (
            <>
              <img src={coinIcon} alt="" className="h-3.5 w-3.5 object-contain" />
              {stake.toLocaleString()}
            </>
          ) : (
            t("lobby.summaryFree")
          )}
        </span>
      </div>
    </div>
  );
}

export function GlobalRematchGate() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { openProfile } = usePlayerProfile();
  const { notifications, loading } = useNotifications();
  const [busy, setBusy] = useState(false);

  const asks = notifications.filter(
    (n) =>
      n.type === "rematch_request"
      && !n.read_at
      && !(n.data as { action_taken?: string } | null)?.action_taken,
  );
  // Only asks that arrive while somebody is looking get the card - the same
  // rule as the invite gate. Older ones wait in the bell.
  const alreadyWaiting = useRef<Set<string> | null>(null);
  if (!loading && alreadyWaiting.current === null) {
    alreadyWaiting.current = new Set(asks.map((n) => n.id));
  }
  const seen = alreadyWaiting.current;
  const fresh = seen ? asks.filter((n) => !seen.has(n.id)) : [];
  // Oldest first: the list is newest-first, so the queue is read from the end.
  const next = fresh[fresh.length - 1];
  const data = next?.data as unknown as RematchRequestData | undefined;
  const amHost = !!data && !!user && user.id === data.host_user_id;

  const answer = async (accept: boolean) => {
    if (!next || !data || !user || busy) return;
    setBusy(true);
    try {
      const { roomCode } = await answerRematchRequest(next, user.id, accept);
      const here = `${window.location.pathname}${window.location.search}`.toUpperCase();
      const inRoom = !!data.room_code && here.includes(data.room_code.toUpperCase());
      if (accept && roomCode && !inRoom) {
        const { data: typed } = await supabase
          .from("game_rooms")
          .select(ROOM_KIND_COLUMNS)
          .eq("room_code", roomCode.toUpperCase())
          .maybeSingle();
        navigate(routeForRoom(typed, roomCode));
      } else if (!accept && inRoom && !amHost) {
        // The seat is gone; so is the reason to stand in the room.
        navigate("/team", { replace: true });
      }
    } catch (e) {
      console.error("[rematch] answer failed", e);
    } finally {
      setBusy(false);
    }
  };

  const fromHost = data?.kind === "host_new_game";

  return (
    <PersonAskModal
      motionKey="rematch-gate"
      person={data ? { nickname: data.sender_nickname ?? "?", avatar_url: data.sender_avatar } : undefined}
      onOpenProfile={() => data && openProfile(data.requester_id)}
      profileLabel={t("extra.joinRequestSeeProfile")}
      body={fromHost ? t("extra.rematchGateHostBody") : t("extra.rematchGateAskBody")}
      declineLabel={amHost ? t("extra.joinRequestDecline") : t("extra.rematchGateLeave")}
      onDecline={() => void answer(false)}
      acceptLabel={amHost ? t("extra.joinRequestAccept") : t("extra.rematchGatePlay")}
      onAccept={() => void answer(true)}
      footnote={fresh.length > 1 ? t("extra.joinRequestMore", { count: fresh.length - 1 }) : undefined}
    >
      {data && (
        <>
          <JoinRequestRoomCard
            roomId={data.room_id}
            roomName={data.room_name}
            roomIcon={data.room_icon}
            categoryName={data.rounds?.[0]?.name ?? data.category_name}
            seated={0}
            maxPlayers={null}
          />
          {data.rounds && (
            <RematchMatchCard
              rounds={data.rounds}
              questionsPerRound={data.questions_per_round ?? null}
              stake={data.stake ?? null}
            />
          )}
        </>
      )}
    </PersonAskModal>
  );
}
