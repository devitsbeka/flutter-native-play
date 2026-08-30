import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMatchmaking } from "@/hooks/useMatchmaking";

const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";

/**
 * /play/queue?type=classic|team_battle — the global matchmaking wait screen
 * (docs/GAME_TYPES_DESIGN.md §5). Enqueues on arrival; a match navigates
 * straight into the ordinary lobby for the mode; the 2-minute expiry offers
 * the fallbacks rather than pretending (no bots dressed as strangers here —
 * that trick stays in Quick Game).
 */
export default function QueuePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const gameTypeKey = params.get("type") ?? "classic";
  const enqueuedRef = useRef(false);

  const { status, enqueue, cancel } = useMatchmaking((roomCode, matchedType) => {
    if (matchedType === "team_battle") {
      navigate(`/team-battle?code=${roomCode}`, { replace: true });
    } else {
      navigate(`/team?room=${roomCode}`, { replace: true });
    }
  });

  useEffect(() => {
    if (enqueuedRef.current) return;
    enqueuedRef.current = true;
    // v1 queues team battle as 2v2; picking a size is a later refinement.
    void enqueue(gameTypeKey, gameTypeKey === "team_battle" ? 2 : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leave = async () => {
    await cancel();
    navigate(-1);
  };

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <div className="max-w-md mx-auto px-5 pb-10">
        <div className="flex items-center gap-2 pt-4 pb-2">
          <button
            onClick={() => void leave()}
            aria-label={t("common.back")}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#402666] active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display text-xl font-bold text-[#402666] flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#7C3AED]" /> {t("matchmaking.title")}
          </h1>
        </div>

        {(status === "searching" || status === "matched") && (
          <div className="flex flex-col items-center gap-6 pt-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border-4 border-[#7C3AED]/20 border-t-[#7C3AED]"
            />
            <p className="font-bold text-[#402666]">
              {status === "matched" ? t("matchmaking.matched") : t("matchmaking.searching")}
            </p>
            <p className="text-sm text-[#402666]/50 text-center -mt-4">
              {t("matchmaking.searchingHint")}
            </p>
            {status === "searching" && (
              <button onClick={() => void leave()} className="text-sm font-bold text-[#402666]/50">
                {t("common.cancel")}
              </button>
            )}
          </div>
        )}

        {status === "expired" && (
          <div className="flex flex-col gap-4 pt-24 items-stretch">
            <p className="font-bold text-[#402666] text-center">{t("matchmaking.expiredTitle")}</p>
            <p className="text-sm text-[#402666]/50 text-center -mt-2">
              {t("matchmaking.expiredHint")}
            </p>
            <button
              onClick={() => void enqueue(gameTypeKey, gameTypeKey === "team_battle" ? 2 : undefined)}
              className="rounded-[20px] p-4 bg-[#7C3AED] text-white font-bold"
            >
              {t("matchmaking.retry")}
            </button>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="rounded-[20px] p-4 font-bold text-[#402666]"
              style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
            >
              {t("matchmaking.playFriendsInstead")}
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-4 pt-24 items-center">
            <p className="font-bold text-[#402666]">{t("matchmaking.errorTitle")}</p>
            <button onClick={() => navigate(-1)} className="text-sm font-bold text-[#7C3AED]">
              {t("common.back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
