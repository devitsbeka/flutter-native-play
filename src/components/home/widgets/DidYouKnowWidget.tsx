import { motion, AnimatePresence } from "framer-motion";
import { useDidYouKnow } from "@/hooks/useDidYouKnow";
import { useAuth } from "@/contexts/AuthContext";

const ImageIcons: Record<string, React.ReactNode> = {
  whale: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="28" rx="18" ry="12" fill="#60A5FA" />
      <ellipse cx="24" cy="28" rx="14" ry="9" fill="#93C5FD" />
      <circle cx="16" cy="26" r="2" fill="#1E3A5F" />
      <path d="M24 16C24 16 26 8 32 10C38 12 36 18 36 18" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="38" cy="28" rx="4" ry="3" fill="#3B82F6" />
    </svg>
  ),
  brain: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 8C16 8 12 14 12 20C12 26 14 32 24 36C34 32 36 26 36 20C36 14 32 8 24 8Z" fill="#F472B6" />
      <path d="M24 12C20 12 18 16 18 20C18 24 20 28 24 30C28 28 30 24 30 20C30 16 28 12 24 12Z" fill="#EC4899" />
      <path d="M20 18C20 18 22 20 24 20C26 20 28 18 28 18" stroke="#BE185D" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  bee: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="14" fill="#FDE68A" />
      <circle cx="20" cy="20" r="3" fill="#FCD34D" />
      <circle cx="28" cy="26" r="2" fill="#FCD34D" />
      <circle cx="22" cy="28" r="1.5" fill="#FCD34D" />
      <circle cx="18" cy="16" r="4" fill="#FBBF24" opacity="0.3" />
    </svg>
  ),
};

// 3D chunky button component for voting
function ChunkyVoteButton({ 
  children, 
  onClick, 
  disabled,
  variant = "default"
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  disabled?: boolean;
  variant?: "default" | "primary";
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ y: 2 }}
      className={`
        flex-1 py-2.5 px-3 rounded-xl font-bold text-sm
        transition-all duration-150 relative
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === "primary" 
          ? "bg-primary text-primary-foreground" 
          : "bg-card text-foreground border-2 border-border"
        }
      `}
      style={{
        boxShadow: variant === "primary"
          ? "inset 0 2px 0 0 rgba(255,255,255,0.2), 0 4px 0 0 hsl(var(--primary) / 0.6), 0 5px 10px -3px rgba(0,0,0,0.2)"
          : "inset 0 2px 0 0 rgba(255,255,255,0.1), 0 4px 0 0 hsl(var(--border)), 0 5px 10px -3px rgba(0,0,0,0.1)",
      }}
    >
      {children}
    </motion.button>
  );
}

export function DidYouKnowWidget() {
  const { user } = useAuth();
  const { fact, loading, voting, voteResult, hasVoted, countdown, vote } = useDidYouKnow();

  if (loading) {
    return (
      <div 
        className="bg-card rounded-2xl p-5 border-2 border-border"
        style={{
          boxShadow: "inset 0 2px 0 0 rgba(255,255,255,0.1), 0 4px 0 0 hsl(var(--border)), 0 6px 15px -3px rgba(0,0,0,0.15)",
        }}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-14 bg-muted rounded" />
          <div className="flex gap-3">
            <div className="h-10 bg-muted rounded-xl flex-1" />
            <div className="h-10 bg-muted rounded-xl flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (!fact) return null;

  const icon = ImageIcons[fact.image_type] || ImageIcons.whale;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 border-2 border-border"
      style={{
        boxShadow: "inset 0 2px 0 0 rgba(255,255,255,0.1), 0 4px 0 0 hsl(var(--border)), 0 6px 15px -3px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-foreground">
          იცოდით თუ არა რომ:
        </h3>
        <div className="w-10 h-10">{icon}</div>
      </div>

      {/* Fact text */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
        {fact.fact_text}
      </p>

      {/* Source */}
      <p className="text-xs text-muted-foreground/70 mb-4">
        {fact.source} ®
      </p>

      <AnimatePresence mode="wait">
        {!hasVoted ? (
          <motion.div
            key="buttons"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex gap-3"
          >
            <ChunkyVoteButton
              onClick={() => vote("knew")}
              disabled={voting || !user}
            >
              ვიცოდი
            </ChunkyVoteButton>
            <ChunkyVoteButton
              onClick={() => vote("didnt_know")}
              disabled={voting || !user}
            >
              არ ვიცოდი
            </ChunkyVoteButton>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* Progress bar */}
            <div 
              className="h-3 bg-muted rounded-full overflow-hidden flex border border-border"
              style={{
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${voteResult?.knewPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full"
                style={{
                  background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)",
                }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${voteResult?.didntKnowPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                className="bg-muted-foreground/30 h-full"
              />
            </div>

            {/* Stats */}
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span className={voteResult?.userVote === "knew" ? "font-bold text-primary" : ""}>
                ვიცოდი: {voteResult?.knewPercentage}%
              </span>
              <span className={voteResult?.userVote === "didnt_know" ? "font-bold text-primary" : ""}>
                არ ვიცოდი: {voteResult?.didntKnowPercentage}%
              </span>
            </div>

            <p className="text-sm font-semibold text-center text-foreground">
              {voteResult?.totalVotes.toLocaleString()} ხმა
            </p>
            
            {/* Countdown indicator */}
            {countdown > 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-center text-muted-foreground"
              >
                ახალი ფაქტი {countdown} წამში...
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!user && !hasVoted && (
        <p className="text-xs text-muted-foreground/60 text-center mt-2">
          შედით ანგარიშზე ხმის მისაცემად
        </p>
      )}
    </motion.div>
  );
}
