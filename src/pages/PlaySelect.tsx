import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Crown, Globe, Swords, Tv, Users, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGameTypes } from "@/hooks/useGameTypes";
import type { GameTypeDescriptor } from "@/game-types/registry";

// Same soft card treatment as PlayOptionsModal / the homepage profile widget
const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";

const ICONS: Record<GameTypeDescriptor["icon"], LucideIcon> = {
  users: Users,
  tv: Tv,
  swords: Swords,
  crown: Crown,
};

/**
 * The game type chooser behind "Play with friends"
 * (docs/GAME_TYPES_DESIGN.md §1): one card per game type from the registry.
 * Live types launch; dark-launched ones render as locked teasers.
 */
export default function PlaySelect() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const gameTypes = useGameTypes();
  // A matchmade type expands into the private/global choice instead of
  // launching outright (docs/GAME_TYPES_DESIGN.md §1).
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <div className="max-w-md mx-auto px-5 pb-10">
        <div className="flex items-center gap-2 pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            aria-label={t("common.back")}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#402666] active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        <h1 className="font-display text-2xl font-bold text-[#402666]">
          {t("gameTypes.title")}
        </h1>
        <p className="text-sm text-[#402666]/60 mt-1 mb-6">{t("gameTypes.subtitle")}</p>

        <div className="flex flex-col gap-4">
          {gameTypes.map((gt, i) => {
            const Icon = ICONS[gt.icon];
            const comingSoon = gt.status !== "live";
            const players =
              gt.maxPlayers === 1
                ? t("gameTypes.playersSolo")
                : t("gameTypes.players", { min: gt.minPlayers, max: gt.maxPlayers });
            return (
              <motion.div
                key={gt.key}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 24, delay: 0.05 + i * 0.06 }}
                whileTap={comingSoon ? undefined : { scale: 0.97 }}
                onClick={() => {
                  if (comingSoon) return;
                  if (gt.supportsMatchmaking) {
                    setExpanded(expanded === gt.key ? null : gt.key);
                  } else {
                    gt.launch?.(navigate);
                  }
                }}
                onKeyDown={(e) => {
                  // A div with role=button doesn't synthesize click from the
                  // keyboard the way a real <button> did.
                  if (comingSoon || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  if (gt.supportsMatchmaking) {
                    setExpanded(expanded === gt.key ? null : gt.key);
                  } else {
                    gt.launch?.(navigate);
                  }
                }}
                role="button"
                tabIndex={comingSoon ? -1 : 0}
                aria-disabled={comingSoon}
                className="rounded-[24px] p-5 text-left relative cursor-pointer"
                style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center"
                    style={{
                      background: gt.tileBg,
                      boxShadow: gt.tileShadow,
                      filter: comingSoon ? "grayscale(0.55) opacity(0.8)" : undefined,
                    }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-[17px] ${comingSoon ? "text-[#402666]/60" : "text-[#402666]"}`}>
                        {t(gt.titleKey)}
                      </p>
                      {gt.badge && !comingSoon && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7C3AED] text-white uppercase">
                          {t(gt.badge === "new" ? "gameTypes.badgeNew" : "gameTypes.badgeBeta")}
                        </span>
                      )}
                      {comingSoon && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#402666]/10 text-[#402666]/60 uppercase">
                          {t("gameTypes.comingSoon")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#402666]/60 mt-1">{t(gt.descKey)}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-[#402666]/50 font-medium">
                      <span>{players}</span>
                      <span aria-hidden>·</span>
                      <span>{t("gameTypes.minutes", { min: gt.approxMinutes })}</span>
                    </div>
                  </div>
                </div>
                {expanded === gt.key && !comingSoon && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => gt.launch?.(navigate)}
                        className="rounded-xl px-3 py-3 bg-[#7C3AED] text-white text-sm font-bold flex items-center justify-center gap-1.5"
                      >
                        <Users className="w-4 h-4" /> {t("matchmaking.friendsOption")}
                      </button>
                      <button
                        onClick={() => navigate(`/play/queue?type=${gt.key}`)}
                        className="rounded-xl px-3 py-3 bg-white/80 text-[#402666] text-sm font-bold flex items-center justify-center gap-1.5"
                        style={{ boxShadow: "0 1px 4px rgba(102,51,153,0.12)" }}
                      >
                        <Globe className="w-4 h-4" /> {t("matchmaking.globalOption")}
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
