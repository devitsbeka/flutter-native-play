import { motion, AnimatePresence } from "framer-motion";
import { X, Target, CheckCircle2, Clock } from "lucide-react";
import { useMissions } from "@/hooks/useMissions";

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MissionsModal({ isOpen, onClose }: MissionsModalProps) {
  const { missions, loading } = useMissions();
  
  const completedCount = missions.filter((m) => m.completed).length;
  const totalXP = missions
    .filter((m) => m.completed)
    .reduce((sum, m) => sum + m.reward_xp, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 bg-background rounded-3xl p-6 w-full max-w-sm overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
                style={{ background: "linear-gradient(135deg, hsl(200 80% 50%), hsl(220 80% 50%))" }}
              >
                <Target className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-display font-bold text-foreground">
                დღის მისიები 🎯
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {completedCount}/{missions.length} შესრულებულია • +{totalXP} XP მიღებული
              </p>
            </div>

            {/* Missions List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">იტვირთება...</div>
              ) : missions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  შედი ანგარიშზე მისიების სანახავად
                </div>
              ) : (
                missions.map((mission, i) => {
                  const progress = (mission.current_progress / mission.target_value) * 100;
                  return (
                    <motion.div
                      key={mission.id}
                      className={`p-4 rounded-xl border ${
                        mission.completed
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          : "bg-muted/30 border-border"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {mission.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className={`text-sm font-semibold ${
                              mission.completed ? "text-green-700 dark:text-green-400" : "text-foreground"
                            }`}>
                              {mission.mission_title}
                            </span>
                          </div>
                          {mission.mission_description && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {mission.mission_description}
                            </p>
                          )}
                          
                          {/* Progress bar */}
                          {!mission.completed && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">პროგრესი</span>
                                <span className="font-medium text-foreground">
                                  {mission.current_progress}/{mission.target_value}
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full bg-primary"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Reward */}
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          mission.completed
                            ? "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300"
                            : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                        }`}>
                          {mission.completed ? "✓" : `+${mission.reward_xp} XP`}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Reset info */}
            <p className="text-xs text-center text-muted-foreground mt-4">
              მისიები განახლდება ყოველ დღე 00:00-ზე
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
