import { motion, AnimatePresence } from "framer-motion";
import { useDidYouKnow } from "@/hooks/useDidYouKnow";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const ImageIcons: Record<string, React.ReactNode> = {
  whale: (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="28" rx="18" ry="12" fill="#60A5FA" />
      <ellipse cx="24" cy="28" rx="14" ry="9" fill="#93C5FD" />
      <circle cx="16" cy="26" r="2" fill="#1E3A5F" />
      <path d="M24 16C24 16 26 8 32 10C38 12 36 18 36 18" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="38" cy="28" rx="4" ry="3" fill="#3B82F6" />
    </svg>
  ),
  brain: (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 8C16 8 12 14 12 20C12 26 14 32 24 36C34 32 36 26 36 20C36 14 32 8 24 8Z" fill="#F472B6" />
      <path d="M24 12C20 12 18 16 18 20C18 24 20 28 24 30C28 28 30 24 30 20C30 16 28 12 24 12Z" fill="#EC4899" />
      <path d="M20 18C20 18 22 20 24 20C26 20 28 18 28 18" stroke="#BE185D" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  bee: (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="28" rx="10" ry="8" fill="#FCD34D" />
      <rect x="20" y="24" width="8" height="3" fill="#1F2937" />
      <rect x="20" y="30" width="8" height="3" fill="#1F2937" />
      <circle cx="24" cy="18" r="6" fill="#FCD34D" />
      <circle cx="22" cy="17" r="1.5" fill="#1F2937" />
      <circle cx="26" cy="17" r="1.5" fill="#1F2937" />
      <ellipse cx="16" cy="22" rx="6" ry="3" fill="#BFDBFE" opacity="0.7" transform="rotate(-30 16 22)" />
      <ellipse cx="32" cy="22" rx="6" ry="3" fill="#BFDBFE" opacity="0.7" transform="rotate(30 32 22)" />
    </svg>
  ),
  octopus: (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="20" rx="12" ry="10" fill="#A78BFA" />
      <circle cx="20" cy="18" r="2" fill="#1E1B4B" />
      <circle cx="28" cy="18" r="2" fill="#1E1B4B" />
      <path d="M12 28C10 32 8 38 10 40" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 30C16 34 14 40 16 42" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 32C24 36 24 42 26 44" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 30C32 34 34 40 32 42" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 28C38 32 40 38 38 40" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  moon: (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="14" fill="#FDE68A" />
      <circle cx="20" cy="20" r="3" fill="#FCD34D" />
      <circle cx="28" cy="26" r="2" fill="#FCD34D" />
      <circle cx="22" cy="28" r="1.5" fill="#FCD34D" />
      <circle cx="18" cy="16" r="4" fill="#FBBF24" opacity="0.3" />
    </svg>
  ),
};

export function DidYouKnowWidget() {
  const { user } = useAuth();
  const { fact, loading, voting, voteResult, hasVoted, countdown, vote } = useDidYouKnow();
  const { t } = useLanguage();

  // Remove fixed height - let content flow naturally
  const LOADING_HEIGHT = 200;

  if (loading) {
    return (
      <div 
        className="bg-card rounded-2xl p-5 border border-border/60"
        style={{
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
          minHeight: LOADING_HEIGHT,
        }}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted/60 rounded w-2/3" />
          <div className="h-16 bg-muted/40 rounded-lg" />
          <div className="flex gap-3">
            <div className="h-11 bg-muted/50 rounded-xl flex-1" />
            <div className="h-11 bg-muted/50 rounded-xl flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (!fact) {
    return (
      <div
        className="bg-card rounded-2xl p-5 border border-border/60"
        style={{
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.06) 100%)",
            }}
          >
            {ImageIcons.whale}
          </div>
          <h3 className="text-[15px] font-semibold text-foreground">
            {t("extra.didYouKnow")}
          </h3>
        </div>
        <p className="text-[14px] text-muted-foreground mt-3">
          {t("extra.factsSoon")}
        </p>
      </div>
    );
  }

  const icon = ImageIcons[fact.image_type] || ImageIcons.whale;

  return (
    <div
      className="bg-card rounded-2xl p-5 border border-border/60"
      style={{
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
          {t("extra.didYouKnowThat")}
        </h3>
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.06) 100%)",
          }}
        >
          {icon}
        </div>
      </div>

      {/* Fact text */}
      <p className="text-[14px] text-muted-foreground leading-[1.6] mb-2.5">
        {fact.fact_text}
      </p>

      {/* Source */}
      <p className="text-xs text-muted-foreground/50 mb-4 tracking-wide">
        {fact.source} ®
      </p>

      <AnimatePresence mode="wait">
        {!hasVoted ? (
          <motion.div
            key="buttons"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="flex gap-3"
          >
            {/* ვიცოდი button */}
            <motion.button
              onClick={() => vote("knew")}
              disabled={voting || !user}
              whileTap={{ y: 2 }}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap
                bg-card text-foreground border-2 border-border
                transition-all duration-150
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:bg-muted/30"
              style={{
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 3px 0 0 hsl(var(--border)), 0 4px 8px rgba(0,0,0,0.06)",
              }}
            >
              {t("extra.iKnew")}
            </motion.button>
            
            {/* არ ვიცოდი button */}
            <motion.button
              onClick={() => vote("didnt_know")}
              disabled={voting || !user}
              whileTap={{ y: 2 }}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap
                bg-card text-foreground border-2 border-border
                transition-all duration-150
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:bg-muted/30"
              style={{
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 3px 0 0 hsl(var(--border)), 0 4px 8px rgba(0,0,0,0.06)",
              }}
            >
              {t("extra.didntKnow")}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-3"
          >
            {/* Progress bar */}
            <div 
              className="h-2 bg-muted/50 rounded-full overflow-hidden flex"
              style={{
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${voteResult?.knewPercentage}%` }}
                transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
                }}
              />
            </div>

            {/* Stats row */}
            <div className="flex justify-between items-center">
              <span className={`text-xs font-medium ${voteResult?.userVote === "knew" ? "text-primary" : "text-muted-foreground/70"}`}>
                {t("extra.iKnewPercent", { percent: voteResult?.knewPercentage || 0 })}
              </span>
              <span className={`text-xs font-medium ${voteResult?.userVote === "didnt_know" ? "text-primary" : "text-muted-foreground/70"}`}>
                {t("extra.didntKnowPercent", { percent: voteResult?.didntKnowPercentage || 0 })}
              </span>
            </div>

            {/* Total votes */}
            <p className="text-[13px] font-medium text-center text-muted-foreground">
              {voteResult?.totalVotes.toLocaleString()} {t("extra.voteUnit")}
            </p>
            
            {/* Countdown indicator */}
            {countdown > 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] text-center text-muted-foreground/60"
              >
                {t("extra.newFactIn", { seconds: countdown })}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!user && !hasVoted && (
        <p className="text-[11px] text-muted-foreground/50 text-center mt-3">
          {t("extra.loginToVote")}
        </p>
      )}
    </div>
  );
}
