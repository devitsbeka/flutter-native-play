import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import bgLeader from "@/assets/bgleader.png";
import starIcon from "@/assets/thiings/star.png";
import { HeaderActions } from "@/components/shared/HeaderActions";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlag } from "@/data/opponents";
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
// Admin accounts are excluded from the public board, so their pinned row is
// skipped entirely — otherwise it would claim a rank the list contradicts.
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
      if (myUserId && adminIds.includes(myUserId)) return null;

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

function RankBadge({ rank }: { rank: number }) {
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
    <div className="shrink-0 w-9 h-9 mx-[10px] rounded-full flex items-center justify-center font-black text-white/90 text-sm"
      style={{ background: "rgba(255,255,255,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}
    >
      {rank}
    </div>
  );
}

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
      className={`w-full flex items-center gap-2.5 rounded-full pl-2 pr-4 py-1.5 text-left ${
        isMe ? "" : "hover:brightness-105 active:scale-[0.99]"
      } transition-all`}
      style={
        isMe
          ? {
              background: "linear-gradient(180deg, #9061F9 0%, #6D3FE0 100%)",
              boxShadow: "0 3px 0 #4C2AA6, 0 4px 14px rgba(109,63,224,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
            }
          : {
              background: "linear-gradient(180deg, #79D8B2 0%, #4FBE92 100%)",
              boxShadow: "0 3px 0 #339970, inset 0 1px 0 rgba(255,255,255,0.35)",
            }
      }
    >
      <RankBadge rank={entry.rank} />
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
      <span className="flex-1 min-w-0 truncate font-black text-white text-[15px] drop-shadow-sm">
        {isMe ? youLabel : entry.nickname} {flag && <span className="text-sm">{flag}</span>}
      </span>
      <span className="flex items-center gap-1 font-black text-white text-[15px] drop-shadow-sm shrink-0">
        🏆 {formatCompactNumber(entry.coins)}
      </span>
    </motion.button>
  );
}

export default function Leaderboards() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
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
    ...(countryCode ? [{ id: "local" as Scope, label: `${t("leaderboard.localTab")} ${getCountryFlag(countryCode)}` }] : []),
    { id: "global", label: `${t("leaderboard.global")} 🌍` },
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
          {/* Tabs - centered */}
          <div className="flex items-end justify-center gap-1 px-2">
            {tabs.map((tab) => {
              const active = scope === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setScopeTouched(true);
                    setScope(tab.id);
                  }}
                  className={`px-5 rounded-t-2xl font-black transition-all ${
                    active ? "py-2.5 text-amber-900" : "py-2 text-white/80 hover:text-white"
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
              className="flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-2 py-4"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
              }}
            >
              {isLoading && entries.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-full bg-white/15 animate-pulse" />
                ))
              ) : entries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-white font-bold">{t("extra.nobodyYet")}</p>
                  <p className="text-white/70 text-sm mt-1">{t("leaderboard.beTheFirst")}</p>
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
