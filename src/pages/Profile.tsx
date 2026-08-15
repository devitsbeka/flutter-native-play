import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Settings, HelpCircle, Shield, FileText, LogOut, ChevronRight, Pencil, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { translateErrorMessage } from "@/utils/errorTranslations";

import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { getRankFromPoints } from "@/data/opponents";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProPlansSection, ProTier } from "@/components/profile/ProPlansSection";
import { AvatarReel } from "@/components/profile/AvatarReel";
import { ProBadge } from "@/components/shared/ProBadge";
import { useVipStatus } from "@/hooks/useVipStatus";
import { PageHeader } from "@/components/shared/PageHeader";
import { HeaderActions } from "@/components/shared/HeaderActions";

// Stat icons
import triviaIcon from "@/assets/icons/trivia-buzzer-8.png";
import trophyIcon from "@/assets/icons/trophy-2.png";
import percentIcon from "@/assets/icons/percentage-discount.png";
import trophyShelfIcon from "@/assets/icons/trophy-shelf.png";


export default function Profile() {
  const { user, profile, signOut, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { subscription, isVip } = useVipStatus();
  const [searchParams] = useSearchParams();
  // Many places deep-link to /profile?tab=PRO (paywalls) or ?tab=Stats —
  // honor the param instead of relying on the default happening to match.
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab")?.toLowerCase();
    if (tab === "stats") return "Stats";
    if (tab === "settings") return "Settings";
    return "PRO";
  });

  // Inline nickname editing — quick access next to the name, mirroring
  // ChangeNameModal's save path (direct profiles update + refetch)
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const startNameEdit = () => {
    setNameDraft(profile?.nickname || "");
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!user || savingName) return;
    if (!trimmed || trimmed === profile?.nickname) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nickname: trimmed })
        .eq("user_id", user.id);
      if (error) throw error;
      await fetchProfile(user.id);
      toast.success(t("settings.nameChanged"));
      setEditingName(false);
    } catch (error: any) {
      toast.error(translateErrorMessage(error.message) || t("errors.generic"));
    } finally {
      setSavingName(false);
    }
  };

  // Get current tier from subscription - only if actively VIP
  const currentTier = isVip ? (subscription?.vip_tier as ProTier | undefined) : undefined;

  // Dynamic PRO label
  const getProLabel = () => {
    if (isVip && currentTier && ['pro', 'pro_plus', 'pro_master'].includes(currentTier)) {
      return t("extra.myPro");
    }
    return t("extra.becomePro");
  };

  const rank = profile ? getRankFromPoints(profile.total_points) : null;

  // Redirect guests directly to auth page
  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
    }
  }, [user, navigate]);

  // Show nothing while redirecting or if no profile yet
  if (!user || !profile) {
    return null;
  }

  return (
    <MainLayout showPlayButton={false}>
      <div className="min-h-screen relative flex flex-col">
          {/* Full-page Video Background */}
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="fixed inset-0 w-full h-full object-cover -z-10 bg-secondary"
          >
            <source src="/videos/floating-blob.webm" type="video/webm" />
            <source src="/videos/floating-blob.mp4" type="video/mp4" />
          </video>
          {/* Gradient Overlay */}
          <div className="fixed inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/20 -z-10" />

          {/* Page Header with Back Button - Sticky */}
          <PageHeader title={t("profile.title")} rightElements={<HeaderActions />} />

          {/* Scrollable Content */}
          <div className="flex-1 relative">
            {/* Avatar card — the carousel spans the full page width (outside
                the constrained column below) so wide screens show more slots;
                it starts centered on the selected avatar and dragging only
                browses, selection stays tap-only.

                A 128px spacer pulled back 64px by a negative margin used to
                sit above this, which is 64px of nothing between a sticky
                header and the avatars — and the reel already carries its own
                160px band, so the enlarged centre avatar was never short of
                room. The gap is now the gap. */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4 relative w-full mb-4"
            >
              <div className="flex flex-col items-center">
                <AvatarReel />
                {/* Nickname in the main page's hero font, with inline
                    edit/save quick access on the right */}
                <div className="flex items-center gap-2 mt-2">
                  {editingName ? (
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      maxLength={20}
                      autoFocus
                      className="font-slackey text-gray-800 capitalize font-black text-center bg-white/80 border border-border/50 rounded-xl px-3 h-11 outline-none focus:ring-2 focus:ring-primary/40 max-w-[240px]"
                      style={{ fontSize: 24 }}
                    />
                  ) : (
                    <h2 className="font-slackey text-gray-800 capitalize font-black flex items-center gap-2" style={{ fontSize: 28 }}>
                      {/* Reads next to the name rather than on the avatar:
                          the avatar here is a carousel the player scrolls
                          through, and a crown pinned to whichever slot is
                          centred would look like a property of that avatar
                          rather than of them.

                          Before the name, not after: a long nickname is
                          truncated, and a badge trailing it was the first
                          thing pushed off the end.

                          The crown alone: no word beside it, and no disc
                          behind it. The disc is there to lift a gold crown
                          off a photograph, which is what the avatar badge
                          needs; against the page there is nothing to lift it
                          off and it just drew a circle. */}
                      <ProBadge variant="mark" size="xl" />
                      {profile.nickname}
                    </h2>
                  )}
                  <button
                    onClick={() => (editingName ? void saveName() : startNameEdit())}
                    disabled={savingName}
                    aria-label={editingName ? t("common.save") : t("settings.editName")}
                    /* No disc behind it, same reasoning as the crown on the
                       other side of the name. It keeps the 36px box: that is
                       the tap target, and it is only the paint that goes. */
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors shrink-0"
                  >
                    {savingName ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : editingName ? (
                      <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
                    ) : (
                      <Pencil className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className={cn("text-sm font-medium", rank?.color || "text-muted-foreground")}>
                  {rank?.name || t("profile.beginner")}
                </p>
              </div>
            </motion.div>

            <div className="px-6 relative max-w-[700px] md:max-w-[600px] mx-auto w-full pb-8">
            {/* Tabs - segmented switcher */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center p-1 rounded-full bg-white/70 backdrop-blur-sm border border-border/40 shadow-sm">
                {[
                  { id: "PRO", label: getProLabel() },
                  { id: "Stats", label: t("profile.statistics") },
                  { id: "Settings", label: t("menu.settings") },
                ].map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "px-5 py-2 rounded-full text-sm font-bold transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-foreground/60 hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Tab Content */}
            {activeTab === "Stats" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30">
                  <img src={triviaIcon} alt="" className="w-8 h-8" />
                  <span className="text-foreground flex-1">{t("profile.gamesPlayed")}</span>
                  <span className="font-bold text-foreground">{profile.games_played}</span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30">
                  <img src={trophyIcon} alt="" className="w-8 h-8" />
                  <span className="text-foreground flex-1">{t("profile.gamesWon")}</span>
                  <span className="font-bold text-foreground">{profile.games_won}</span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30">
                  <img src={percentIcon} alt="" className="w-8 h-8" />
                  <span className="text-foreground flex-1">{t("profile.winRate")}</span>
                  <span className="font-bold text-foreground">
                    {profile.games_played > 0
                      ? Math.round((profile.games_won / profile.games_played) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30">
                  <img src={trophyShelfIcon} alt="" className="w-8 h-8" />
                  <span className="text-foreground flex-1">{t("profile.bestStreak")}</span>
                  <span className="font-bold text-foreground">{profile.best_streak}</span>
                </div>
              </motion.div>
            )}

            {activeTab === "PRO" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <ProPlansSection />
              </motion.div>
            )}

            {activeTab === "Settings" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {[
                  { icon: Settings, label: t("menu.accountSettings"), path: "/settings" },
                  { icon: HelpCircle, label: t("menu.help"), path: "/support" },
                  { icon: Shield, label: t("menu.privacy"), path: "/privacy-policy" },
                  { icon: FileText, label: t("extra.termsOfService"), path: "/terms" },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <span className="text-foreground flex-1 font-medium">{item.label}</span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}

                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="w-full bg-destructive/5 rounded-2xl p-4 flex items-center gap-3 border border-destructive/20 hover:bg-destructive/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <LogOut className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                  </div>
                  <span className="text-destructive flex-1 font-medium">{t("menu.signOut")}</span>
                </button>
              </motion.div>
            )}
            </div>
          </div>

      </div>
    </MainLayout>
  );
}