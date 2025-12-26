import { motion } from "framer-motion";
import { Target, CheckCircle2, Clock } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
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

  // Stats badge component
  const StatsBadge = () => (
    <div 
      className="flex items-center justify-center gap-4 p-3 rounded-2xl mb-4"
      style={{
        background: "linear-gradient(180deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)",
        border: "2px solid rgba(59,130,246,0.2)",
        boxShadow: "0 3px 0 rgba(59,130,246,0.1)",
      }}
    >
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">{completedCount}/{missions.length}</p>
        <p className="text-xs text-muted-foreground">შესრულებულია</p>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="text-center">
        <p className="text-lg font-bold text-blue-600">+{totalXP}</p>
        <p className="text-xs text-muted-foreground">XP მიღებული</p>
      </div>
    </div>
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="info"
      icon={<Target className="w-10 h-10" />}
      title="დღის მისიები 🎯"
      showSparkles
    >
      <StatsBadge />
      
      {/* Missions List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
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
                className="p-3 rounded-xl"
                style={{
                  background: mission.completed
                    ? "linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)"
                    : "linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.01) 100%)",
                  border: `2px solid ${mission.completed ? "rgba(34,197,94,0.3)" : "hsl(var(--border))"}`,
                  boxShadow: mission.completed 
                    ? "0 3px 0 rgba(34,197,94,0.2)" 
                    : "0 3px 0 hsl(var(--border))",
                }}
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
                      <span className={`text-sm font-bold ${
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
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reward */}
                  <div 
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                      mission.completed
                        ? "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300"
                        : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                    }`}
                    style={{
                      boxShadow: mission.completed 
                        ? "0 2px 0 rgba(34,197,94,0.3)" 
                        : "0 2px 0 rgba(251,191,36,0.3)",
                    }}
                  >
                    {mission.completed ? "✓" : `+${mission.reward_xp} XP`}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Reset info */}
      <p className="text-xs text-center text-muted-foreground mt-4 pt-3 border-t border-border">
        მისიები განახლდება ყოველ დღე 00:00-ზე
      </p>
    </GameModal>
  );
}
