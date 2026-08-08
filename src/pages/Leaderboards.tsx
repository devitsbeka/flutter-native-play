import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import bgLeader from "@/assets/bgleader.png";
import starIcon from "@/assets/thiings/star.png";
import trophyGold from "@/assets/trophy-gold.png";
import trophySilver from "@/assets/trophy-silver.png";
import trophyBronze from "@/assets/trophy-bronze.png";
import coinIcon from "@/assets/icons/icon-coin.png";
import { HeaderActions } from "@/components/shared/HeaderActions";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlag } from "@/data/opponents";
import { countryCoordinates } from "@/lib/countryCoordinates";
import { formatCompactNumber } from "@/lib/utils";

type Scope = "local" | "global";

interface BoardEntry {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  coins: number;
  country_code: string | null;
  rank: number;
}

// Top 50 players by coins (the metric that has always ranked the board),
// deleted accounts and admins excluded. Local scope narrows to one country.
function useFunLeaderboard(scope: Scope, countryCode?: string | null) {
  return useQuery({
    queryKey: ["fun-leaderboard", scope, scope === "local" ? countryCode : null],
    queryFn: async (): Promise<BoardEntry[]> => {
      let query = supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, coins, country_code")
        .neq("nickname", "[წაშლილი]")
        .order("coins", { ascending: false })
        .limit(60);
      if (scope === "local" && countryCode) {
        query = query.eq("country_code", countryCode);
      }
      const [{ data, error }, { data: adminData }] = await Promise.all([
        query,
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      if (error) throw error;
      const adminIds = new Set((adminData || []).map((r) => r.user_id));
      return (data || [])
        .filter((p) => !adminIds.has(p.user_id))
        .slice(0, 50)
        .map((p, i) => ({
          user_id: p.user_id,
          nickname: p.nickname || "Unknown",
          avatar_url: p.avatar_url,
          coins: p.coins || 0,
          country_code: p.country_code,
          rank: i + 1,
        }));
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}

// The signed-in player's rank when they fall outside the visible top 50.
// Admin accounts stay hidden from the public list, but still get their own
// pinned row: the rank they would hold among the ranked (non-admin) players.
function useMyRank(
  scope: Scope,
  countryCode: string | null | undefined,
  myCoins: number | undefined,
  myUserId: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["fun-leaderboard-my-rank", scope, countryCode, myCoins, myUserId],
    queryFn: async (): Promise<number | null> => {
      const { data: adminData } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const adminIds = (adminData || []).map((r) => r.user_id);

      let query = supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .gt("coins", myCoins ?? 0);
      if (scope === "local" && countryCode) {
        query = query.eq("country_code", countryCode);
      }
      if (adminIds.length > 0) {
        query = query.not("user_id", "in", `(${adminIds.join(",")})`);
      }
      const { count } = await query;
      return (count ?? 0) + 1;
    },
    enabled,
    staleTime: 60_000,
  });
}

function RankBadge({ rank, onLight = false }: { rank: number; onLight?: boolean }) {
  // Top three get the golden star with the number set inside it;
  // everyone else keeps a quiet translucent circle.
  if (rank <= 3) {
    return (
      <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
        <img src={starIcon} alt="" className="absolute inset-0 w-full h-full object-contain select-none" draggable={false} />
        <span
          className="relative font-black text-white text-lg"
          // The star art tilts right, putting its optical center left of the
          // geometric one — nudge the number to sit on the star's body.
          style={{ textShadow: "0 1px 2px rgba(146,64,14,0.7)", marginTop: "-1px", marginLeft: "-3px" }}
        >
          {rank}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`shrink-0 w-9 h-9 mx-[10px] rounded-full flex items-center justify-center font-black text-sm ${
        onLight ? "text-slate-500" : "text-white/90"
      }`}
      style={{
        background: onLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.18)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      {rank}
    </div>
  );
}

const TROPHY_BY_RANK: Record<number, string> = {
  1: trophyGold,
  2: trophySilver,
  3: trophyBronze,
};

function BoardRow({
  entry,
  isMe,
  onOpenProfile,
  youLabel,
}: {
  entry: BoardEntry;
  isMe: boolean;
  onOpenProfile: (userId: string) => void;
  youLabel: string;
}) {
  const flag = entry.country_code ? getCountryFlag(entry.country_code) : "";
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(entry.rank * 0.02, 0.4) }}
      onClick={() => !isMe && onOpenProfile(entry.user_id)}
      className={`w-full flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2 text-left ${
        isMe ? "" : "hover:brightness-105 active:scale-[0.99]"
      } transition-all`}
      style={
        isMe
          ? {
              background: "linear-gradient(180deg, #9061F9 0%, #6D3FE0 100%)",
              boxShadow: "0 3px 0 #4C2AA6, 0 4px 14px rgba(109,63,224,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
            }
          : {
              background: "linear-gradient(180deg, rgba(217,255,240,0.85) 0%, rgba(255,255,255,0.96) 100%)",
              boxShadow: "0 3px 0 #E2F1EB, inset 0 1px 0 rgba(255,255,255,0.35)",
            }
      }
    >
      <RankBadge rank={entry.rank} onLight={!isMe} />
      <div className="w-11 h-11 rounded-full bg-white p-[2px] shrink-0 shadow-sm">
        <div className="w-full h-full rounded-full overflow-hidden">
          <SmartAvatar
            avatarUrl={entry.avatar_url}
            fallback={entry.nickname?.charAt(0) || "?"}
            size="sm"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      {TROPHY_BY_RANK[entry.rank] && (
        <motion.img
          src={TROPHY_BY_RANK[entry.rank]}
          alt=""
          className="w-6 h-6 object-contain shrink-0 drop-shadow select-none"
          draggable={false}
          animate={{ x: [0, 3, -3, 2, 0], rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: entry.rank * 0.3 }}
        />
      )}
      <span className={`flex-1 min-w-0 truncate font-black text-[15px] ${isMe ? "text-white drop-shadow-sm" : "text-slate-700"}`}>
        {isMe ? youLabel : entry.nickname} {flag && <span className="text-sm">{flag}</span>}
      </span>
      <span className={`flex items-center gap-1.5 font-black text-[15px] shrink-0 ${isMe ? "text-white drop-shadow-sm" : "text-slate-700"}`}>
        <img src={coinIcon} alt="" className="w-5 h-5 object-contain select-none" draggable={false} />
        {formatCompactNumber(entry.coins)}
      </span>
    </motion.button>
  );
}

// The player's country, named in the app language (e.g. საქართველო, not
// "Country"); falls back to the generic tab label for unknown codes.
// Georgian names come from the app's own country data — browsers often ship
// no 'ka' locale data for Intl.DisplayNames and silently fall back to English.
function localCountryName(countryCode: string, language: string, fallback: string): string {
  if (language === "ka") {
    const name = countryCoordinates[countryCode.toLowerCase()]?.name;
    if (name) return name;
  }
  try {
    return new Intl.DisplayNames([language], { type: "region" }).of(countryCode.toUpperCase()) || fallback;
  } catch {
    return fallback;
  }
}

export default function Leaderboards() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const { openProfile } = usePlayerProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const countryCode = profile?.country_code || null;
  const [scope, setScope] = useState<Scope>(countryCode ? "local" : "global");

  // Profiles load async — once the country is known, prefer the local tab
  // as the landing view (only if the user hasn't tabbed around yet).
  const [scopeTouched, setScopeTouched] = useState(false);
  useEffect(() => {
    if (!scopeTouched && countryCode) setScope("local");
  }, [countryCode, scopeTouched]);

  const { data: entries = [], isLoading } = useFunLeaderboard(scope, countryCode);

  const myEntry = user ? entries.find((e) => e.user_id === user.id) : undefined;
  const needsOwnRank = !!user && !!profile && entries.length > 0 && !myEntry;
  const { data: myRank } = useMyRank(scope, countryCode, profile?.coins ?? 0, user?.id, needsOwnRank);

  // Pin the player's own row below the list whenever it isn't visible without
  // scrolling: ranked past the first ~10 rows, or outside the top 50 entirely.
  const pinnedEntry: BoardEntry | null =
    myEntry && myEntry.rank > 10
      ? myEntry
      : needsOwnRank && myRank
        ? {
            user_id: user!.id,
            nickname: profile?.nickname || t("leaderboard.you"),
            avatar_url: profile?.avatar_url || null,
            coins: profile?.coins || 0,
            country_code: countryCode,
            rank: myRank,
          }
        : null;

  // Guests get one sign-in nudge per session (shared key with /team)
  useEffect(() => {
    if (!user && !sessionStorage.getItem("auth_prompt_shown")) {
      sessionStorage.setItem("auth_prompt_shown", "true");
      setShowAuthModal(true);
    }
  }, [user]);

  const tabs: { id: Scope; label: string }[] = [
    ...(countryCode
      ? [{ id: "local" as Scope, label: localCountryName(countryCode, language, t("leaderboard.localTab")) }]
      : []),
    { id: "global", label: t("leaderboard.global") },
  ];

  return (
    <MainLayout showPlayButton={false}>
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        returnToPath="/leaderboards"
        message={t("extra.signInForLeaderboard")}
      />

      {/* Fixed to the viewport; only the board card's row list scrolls.
          The classic three-trophies illustration is the page background. */}
      <div className="relative h-[100dvh] md:h-screen w-full max-w-[100vw] flex flex-col overflow-hidden">
        <img
          src={bgLeader}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_30%] pointer-events-none select-none"
          draggable={false}
        />

        {/* Header */}
        <div className="relative shrink-0 z-50 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => (location.key !== "default" ? navigate(-1) : navigate("/"))}
                className="md:hidden w-10 h-10 -ml-1 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-slate-700"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">
                {t("extra.ratingTitle")}
              </h1>
            </div>
            <HeaderActions />
          </div>
        </div>

        <div className="relative flex-1 min-h-0 w-full max-w-xl mx-auto px-4 pt-5 pb-24 md:pb-8 flex flex-col">
          {/* Tabs - centered pills */}
          <div className="flex items-center justify-center gap-2 px-2">
            {tabs.map((tab) => {
              const active = scope === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setScopeTouched(true);
                    setScope(tab.id);
                  }}
                  className={`px-5 py-2.5 rounded-full font-black transition-all ${
                    active ? "text-amber-900" : "text-white/80 hover:text-white"
                  }`}
                  style={
                    active
                      ? {
                          background: "linear-gradient(180deg, #FDE047 0%, #FACC15 100%)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                        }
                      : {
                          background: "rgba(124, 111, 224, 0.55)",
                        }
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Board - fills the remaining height with no panel behind the rows;
              only the row list inside scrolls (scrollbar hidden). Rows fade out
              at the scroll edges instead of clipping hard. */}
          <div className="flex-1 min-h-0 rounded-[28px] px-3.5 flex flex-col">
            <div
              className="flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-3 py-4"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
              }}
            >
              {isLoading && entries.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-[60px] rounded-full bg-white/50 animate-pulse" />
                ))
              ) : entries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-600 font-bold">{t("extra.nobodyYet")}</p>
                  <p className="text-slate-500 text-sm mt-1">{t("leaderboard.beTheFirst")}</p>
                </div>
              ) : (
                entries.map((entry) => (
                  <BoardRow
                    key={entry.user_id}
                    entry={entry}
                    isMe={entry.user_id === user?.id}
                    onOpenProfile={openProfile}
                    youLabel={`${profile?.nickname || t("leaderboard.you")}`}
                  />
                ))
              )}
            </div>

            {/* Own rank when not visible without scrolling - pinned below the
                scrolling list so it's always in view */}
            {pinnedEntry && (
              <div className="shrink-0 pb-2">
                <BoardRow
                  entry={pinnedEntry}
                  isMe
                  onOpenProfile={openProfile}
                  youLabel={profile?.nickname || t("leaderboard.you")}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
