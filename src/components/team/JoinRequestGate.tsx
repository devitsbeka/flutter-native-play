import { useEffect, useState } from "react";
import { PersonAskModal } from "@/components/shared/PersonAskModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useNavigate } from "react-router-dom";
import { routeForRoom } from "@/utils/roomRoutes";
import {
  answerJoinRequest,
  blockJoinRequest,
  useHostJoinRequests,
  useRoomJoinRequests,
} from "@/hooks/useRoomJoinRequests";

/**
 * The door of a published room.
 *
 * Publishing a room lists it for everyone; it does not open it. When
 * somebody asks, this is what the host sees — over whatever they were doing
 * in the lobby, because the person asking is waiting on the answer and a
 * badge somewhere is not an answer.
 *
 * The host gets three things and no more: who it is, a way into their
 * profile (their record and what they have won — not their quizzes, which
 * would be a shop window in the middle of a yes/no), and the two buttons.
 * One request at a time, oldest first: two strangers at once is two
 * decisions, not one.
 *
 * Mounted by every lobby that can host a published room. It renders nothing
 * at all for a guest, for a private room, and for a host with an empty
 * doorstep.
 */
export function JoinRequestGate({
  roomId,
  isHost,
  hostTeam,
}: {
  roomId: string | null | undefined;
  isHost: boolean;
  /**
   * The arena only: which side the host is on. Given, the modal asks
   * "with me or against me" and the approval carries the answer; left out
   * (the classic lobby, the King's couch) there are no sides to ask about.
   */
  hostTeam?: "a" | "b";
}) {
  const { pending, respond, block } = useRoomJoinRequests(roomId, isHost);
  const next = pending[0];
  return (
    <JoinRequestModal
      next={next}
      more={pending.length - 1}
      hostTeam={hostTeam}
      onAccept={(team) => next && void respond(next.id, true, team)}
      onDecline={() => next && void respond(next.id, false)}
      onBlock={() => next && void block(next.id)}
    />
  );
}

/**
 * The same doorstep, anywhere in the app.
 *
 * A host is rarely sitting in the lobby when somebody knocks — they are on
 * the home screen, in Discover, halfway through their own game. This is
 * mounted once, app-wide: it watches every room they host, shows the same
 * modal, and a YES walks them into the room the asker just joined. A no or
 * a block leaves them exactly where they were.
 */
export function GlobalJoinRequestGate() {
  const navigate = useNavigate();
  const { pending, reload } = useHostJoinRequests();
  const next = pending[0];

  const answer = async (approve: boolean, team?: "a" | "b") => {
    if (!next) return;
    const outcome = await answerJoinRequest(next.room_id, next.user_id, approve, team);
    void reload();
    if (!approve || outcome === "gone" || !next.room_code) return;
    // Into the room — unless this is the room already on screen, whose URL
    // carries its code whatever shape that page's route takes.
    const here = `${window.location.pathname}${window.location.search}`;
    if (here.toUpperCase().includes(next.room_code.toUpperCase())) return;
    navigate(routeForRoom({ game_type_key: next.game_type_key, game_mode: next.game_mode }, next.room_code));
  };

  return (
    <JoinRequestModal
      next={next}
      more={pending.length - 1}
      hostTeam={next?.host_team ?? undefined}
      onAccept={(team) => void answer(true, team)}
      onDecline={() => void answer(false)}
      onBlock={() => {
        if (!next) return;
        void blockJoinRequest(next.id).then(() => reload());
      }}
    />
  );
}

function JoinRequestModal({
  next,
  more,
  hostTeam,
  onAccept,
  onDecline,
  onBlock,
}: {
  next: { id: string; user_id: string; nickname: string; avatar_url: string | null } | undefined;
  more: number;
  hostTeam?: "a" | "b";
  onAccept: (team?: "a" | "b") => void;
  onDecline: () => void;
  onBlock: () => void;
}) {
  const { t } = useLanguage();
  const { openProfile } = usePlayerProfile();
  const otherTeam: "a" | "b" | undefined = hostTeam ? (hostTeam === "a" ? "b" : "a") : undefined;
  // Opponent by default: a stranger asking into an arena is most often the
  // other side's missing player, and the host is one tap from the other
  // answer. Reset per request so a choice made for one asker does not
  // silently carry over to the next.
  const [team, setTeam] = useState<"a" | "b" | undefined>(otherTeam);
  useEffect(() => {
    setTeam(otherTeam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next?.id, hostTeam]);

  return (
    <PersonAskModal
      motionKey="join-gate"
      person={next}
      onOpenProfile={() => next && openProfile(next.user_id, { hideTrivias: true })}
      profileLabel={t("extra.joinRequestSeeProfile")}
      body={t("extra.joinRequestBody")}
      declineLabel={t("extra.joinRequestDecline")}
      onDecline={onDecline}
      acceptLabel={t("extra.joinRequestAccept")}
      onAccept={() => onAccept(team)}
      tertiaryLabel={t("extra.joinRequestBlock")}
      onTertiary={onBlock}
      footnote={more > 0 ? t("extra.joinRequestMore", { count: more }) : undefined}
    >
      {/* Which side they land on. Two buttons named by team, each tagged
          with what that team is to the host — "my team" or "opponent" —
          because A and B mean nothing until you know which one you are on. */}
      {hostTeam && (
        <div className="mt-4 flex items-center gap-1 p-1 rounded-2xl bg-muted">
          {(["a", "b"] as const).map((side) => {
            const mine = side === hostTeam;
            const picked = team === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => setTeam(side)}
                className={`flex-1 flex flex-col items-center rounded-xl px-2 py-2 transition-colors ${
                  picked ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <span className="text-[13px] font-bold">
                  {side === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB")}
                </span>
                <span className={`text-[11px] ${picked ? "text-primary" : ""}`}>
                  {mine ? t("extra.joinRequestMyTeam") : t("extra.joinRequestOpponent")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </PersonAskModal>
  );
}
