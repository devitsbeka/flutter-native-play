import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
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

// The signed-in player's rank when they fall outside the visible top 50
function useMyRank(scope: Scope, countryCode: string | null | undefined, myCoins: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["fun-leaderboard-my-rank", scope, countryCode, myCoins],
    queryFn: async (): Promise<number> => {
      let query = supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .gt("coins", myCoins ?? 0);
      if (scope === "local" && countryCode) {
        query = query.eq("country_code", countryCode);
      }
      const { count } = await query;
      return (count ?? 0) + 1;
    },
    enabled,
    staleTime: 60_000,
  });
}

const RANK_STYLES: Record<number, { bg: string; shadow: string }> = {
  1: { bg: "linear-gradient(180deg, #FFE066 0%, #F5B301 100%)", shadow: "0 2px 0 #C88A00" },
  2: { bg: "linear-gradient(180deg, #E8E8F0 0%, #B9BDCB 100%)", shadow: "0 2px 0 #8E93A6" },
  3: { bg: "linear-gradient(180deg, #F2B27C 0%, #C97C3A 100%)", shadow: "0 2px 0 #9A5A24" },
};

function RankBadge({ rank }: { rank: number }) {
  const special = RANK_STYLES[rank];
  return (
    <div className="relative shrink-0 w-9 h-9 flex items-center justify-center">
      {rank === 1 && (
        <span className="absolute -top-3 text-sm rotate-[-12deg] drop-shadow">👑</span>
      )}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-black ${
          special ? "text-white text-base" : "text-white/90 text-sm"
        }`}
        style={
          special
            ? { background: special.bg, boxShadow: special.shadow }
            : { background: "rgba(255,255,255,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }
        }
      >
        {rank}
      </div>
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
      <div className="w-9 h-9 rounded-full bg-white p-[2px] shrink-0 shadow-sm">
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
  const { data: myRank } = useMyRank(scope, countryCode, profile?.coins ?? 0, needsOwnRank);

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

      <div className="min-h-screen w-full max-w-[100vw] flex flex-col overflow-x-hidden bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/30">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">
              {t("extra.ratingTitle")}
            </h1>
            <HeaderActions />
          </div>
        </div>

        <div className="flex-1 w-full max-w-xl mx-auto px-4 pt-5 pb-24 md:pb-10">
          {/* Title banner */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mx-auto w-fit px-8 py-2.5 rounded-full mb-5"
            style={{
              background: "linear-gradient(180deg, #F472A0 0%, #E1447A 100%)",
              boxShadow: "0 3px 0 #B22C5C, 0 6px 16px rgba(225,68,122,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            <span className="font-display font-black text-white text-lg uppercase tracking-widest drop-shadow">
              {t("leaderboard.title")}
            </span>
          </motion.div>

          {/* Tabs */}
          <div className="flex items-end gap-1 px-2">
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

          {/* Board card */}
          <div
            className="rounded-[28px] p-3.5 space-y-2"
            style={{
              background: "linear-gradient(180deg, #8B7BE8 0%, #6C5CD9 100%)",
              boxShadow: "0 6px 0 #5243B0, 0 14px 34px rgba(108,92,217,0.4)",
            }}
          >
            {isLoading && entries.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 rounded-full bg-white/15 animate-pulse" />
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

            {/* Own rank when outside the visible top 50 */}
            {needsOwnRank && myRank && (
              <div className="pt-1.5 border-t border-white/20">
                <BoardRow
                  entry={{
                    user_id: user!.id,
                    nickname: profile?.nickname || t("leaderboard.you"),
                    avatar_url: profile?.avatar_url || null,
                    coins: profile?.coins || 0,
                    country_code: countryCode,
                    rank: myRank,
                  }}
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
