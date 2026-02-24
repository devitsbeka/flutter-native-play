import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Trophy, ChevronRight, Sparkles, Zap, Shield, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVipStatus } from "@/hooks/useVipStatus";
import { WeeklyChallengeModal } from "@/components/challenge/WeeklyChallengeModal";
import { useLanguage } from "@/contexts/LanguageContext";

export function ProfileRightSidebar() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isVip } = useVipStatus();
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  const PRO_BENEFITS = [
    { icon: Zap, text: t("extra.proBenefit2xXp") },
    { icon: Shield, text: t("extra.proBenefitNoAdsShort") },
    { icon: Star, text: t("extra.proBenefitVipBadge") },
    { icon: Sparkles, text: t("extra.proBenefitExclusiveAvatars") },
  ];

  return (
    <>
      <WeeklyChallengeModal open={showChallengeModal} onOpenChange={setShowChallengeModal} />
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-full border-l border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* PRO Benefits Widget */}
        {!isVip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)/0.1) 0%, hsl(var(--primary)/0.05) 100%)",
              border: "1px solid hsl(var(--primary)/0.2)",
            }}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)`, animation: 'shimmer 3s infinite', backgroundSize: '200% 200%' }} />
            </div>

            <div className="relative p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #9333EA 0%, #A855F7 100%)", boxShadow: "0 4px 12px rgba(147, 51, 234, 0.3)" }}>
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{t("extra.becomeProSidebar")}</p>
                  <p className="text-xs text-muted-foreground">{t("extra.unlockAllFeaturesShort")}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {PRO_BENEFITS.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(147, 51, 234, 0.15)" }}>
                      <benefit.icon className="w-3 h-3" style={{ color: "#9333EA" }} />
                    </div>
                    <span className="text-sm text-muted-foreground">{benefit.text}</span>
                  </div>
                ))}
              </div>

              <motion.button
                onClick={() => navigate("/vip")}
                className="w-full py-2.5 rounded-xl font-semibold text-white text-sm"
                style={{ background: "linear-gradient(135deg, #9333EA 0%, #A855F7 100%)", boxShadow: "0 4px 12px rgba(147, 51, 234, 0.3)" }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t("extra.activatePro")}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Weekly Challenge Widget */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">{t("extra.weeklyChallenge")}</span>
          </div>

          <button onClick={() => setShowChallengeModal(true)} className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors text-left">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground text-sm">{t("extra.play10Games")}</p>
                <p className="text-xs text-muted-foreground">{t("extra.completed", { done: "3", total: "10" })}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "30%" }} />
            </div>
          </button>
        </motion.div>

        {/* Quick Stats Widget */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">{t("extra.quickStatsTitle")}</span>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("extra.playedTodayLabel")}</span>
              <span className="font-semibold text-foreground">{t("extra.gamesUnit", { count: "3" })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("extra.wonTodayLabel")}</span>
              <span className="font-semibold text-foreground">{t("extra.gamesUnit", { count: "2" })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("extra.currentStreakLabel")}</span>
              <span className="font-semibold text-foreground">{t("extra.streakUnit", { count: "5" })}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 200%; }
          100% { background-position: -200% -200%; }
        }
      `}</style>
    </aside>
    </>
  );
}
