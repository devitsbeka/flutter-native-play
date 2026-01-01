import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Trophy, Star, CheckCircle2, Gift } from "lucide-react";
import { useMissions } from "@/hooks/useMissions";
import { useSound } from "@/contexts/SoundContext";
import confetti from "canvas-confetti";

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const celebrateClaim = () => {
  confetti({
    particleCount: 60,
    spread: 50,
    origin: { y: 0.7 },
    colors: ["#10B981", "#34D399", "#6EE7B7", "#FFD700"],
    zIndex: 9999,
  });
};

export function MissionsModal({ isOpen, onClose }: MissionsModalProps) {
  const { missions, loading } = useMissions();
  const { playSound } = useSound();

  const completedCount = missions.filter((m) => m.completed).length;
  const totalXpEarned = missions
    .filter((m) => m.completed)
    .reduce((sum, m) => sum + m.reward_xp, 0);

  const handleClaimMission = async (missionId: string) => {
    playSound("reward");
    celebrateClaim();
    // The mission is already marked complete, XP is awarded in the hook
    // This visual feedback shows the user claimed it
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col mb-20">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 px-6 pt-6 pb-8 flex-shrink-0">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/30 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Title */}
                <div className="text-center pr-8">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">დღის მისიები</h2>
                  </div>
                  <p className="text-white/80 text-sm">შეასრულე მისიები და მიიღე XP!</p>
                </div>
              </div>

              {/* Stats Badge */}
              <div className="px-6 -mt-4 flex-shrink-0">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">შესრულებული</p>
                        <p className="text-lg font-bold text-slate-800">
                          {completedCount}/{missions.length}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">მიღებული XP</p>
                      <p className="text-lg font-bold text-emerald-500">+{totalXpEarned}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Missions List */}
              <div className="px-6 py-4 overflow-y-auto flex-1">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : missions.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">მისიები არ არის</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {missions.map((mission, index) => {
                      const progress = Math.min(
                        (mission.current_progress / mission.target_value) * 100,
                        100
                      );
                      const isComplete = mission.completed;

                      return (
                        <motion.div
                          key={mission.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => isComplete && handleClaimMission(mission.mission_id)}
                          className={`
                            relative rounded-2xl border p-4 transition-all
                            ${isComplete 
                              ? "bg-emerald-500/10 border-emerald-500/30 cursor-pointer hover:bg-emerald-500/20 active:scale-[0.98]" 
                              : "bg-card/50 border-border/50"
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isComplete ? "bg-emerald-500" : "bg-muted/50"
                              }`}
                            >
                              {isComplete ? (
                                <CheckCircle2 className="w-5 h-5 text-white" />
                              ) : (
                                <Star className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold text-sm ${isComplete ? "text-emerald-600" : "text-foreground"}`}>
                                {mission.mission_title}
                              </h3>
                              {mission.mission_description && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {mission.mission_description}
                                </p>
                              )}

                              {/* Progress bar */}
                              <div className="mt-2">
                                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className={`h-full rounded-full ${
                                      isComplete
                                        ? "bg-emerald-500"
                                        : "bg-gradient-to-r from-amber-400 to-orange-500"
                                    }`}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {mission.current_progress}/{mission.target_value}
                                </p>
                              </div>
                            </div>

                            {/* Reward */}
                            <div className="flex-shrink-0 text-right">
                              {isComplete ? (
                                <div className="flex items-center gap-1 text-emerald-500">
                                  <Gift className="w-4 h-4" />
                                  <span className="text-xs font-bold">აიღე!</span>
                                </div>
                              ) : (
                                <div className="bg-primary/10 rounded-lg px-2 py-1">
                                  <span className="text-xs font-bold text-primary">
                                    +{mission.reward_xp} XP
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-white">
                <p className="text-center text-slate-500 text-xs">
                  მისიები განახლდება ყოველ დღე 00:00-ზე
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MissionsModal;