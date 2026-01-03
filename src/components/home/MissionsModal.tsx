import { motion } from "framer-motion";
import { Target, Trophy, Star, CheckCircle2, Clock } from "lucide-react";
import missionCrystalIcon from "@/assets/icons/icon-mission-crystal.png";
import { useMissions } from "@/hooks/useMissions";
import { useSound } from "@/contexts/SoundContext";
import { GameModal } from "@/components/ui/game-modal";
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

// Calculate time until midnight for mission reset
const getTimeUntilMidnight = (): string => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
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
  };

  // Custom header icon
  const headerIcon = (
    <img src={missionCrystalIcon} alt="" className="w-20 h-20 object-contain" />
  );

  // Footer with reset timer
  const footer = (
    <div className="flex items-center justify-center gap-2 py-2">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <p className="text-muted-foreground text-xs">
        მისიები განახლდება: <span className="font-mono font-bold">{getTimeUntilMidnight()}</span>
      </p>
    </div>
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      icon={headerIcon}
      title="დღის მისიები"
      subtitle="შეასრულე მისიები და მიიღე XP!"
      footer={footer}
      showSparkles
      className="max-h-[85vh]"
    >
      {/* Stats Badge */}
      <div 
        className="bg-gray-50 rounded-2xl p-4 mb-4"
        style={{ boxShadow: "0 3px 0 #E5E7EB, inset 0 1px 2px rgba(255, 255, 255, 0.8)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center"
              style={{ boxShadow: "0 2px 0 #A7F3D0" }}
            >
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">შესრულებული</p>
              <p className="text-base font-bold text-gray-800">
                {completedCount}/{missions.length}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">მიღებული XP</p>
            <p className="text-base font-bold text-emerald-600">+{totalXpEarned}</p>
          </div>
        </div>
      </div>

      {/* Missions List */}
      <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : missions.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">მისიები არ არის</p>
          </div>
        ) : (
          missions.map((mission, index) => {
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
                className="relative rounded-2xl p-4 transition-all"
                style={{
                  background: isComplete 
                    ? "linear-gradient(180deg, #D1FAE5 0%, #ECFDF5 100%)"
                    : "linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)",
                  boxShadow: isComplete 
                    ? "0 3px 0 #A7F3D0, inset 0 1px 2px rgba(255, 255, 255, 0.8)"
                    : "0 3px 0 #E5E7EB, inset 0 1px 2px rgba(255, 255, 255, 0.8)",
                  border: isComplete ? "2px solid #6EE7B7" : "2px solid #E5E7EB",
                  cursor: isComplete ? "pointer" : "default",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isComplete 
                        ? "linear-gradient(135deg, #10B981 0%, #34D399 100%)"
                        : "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)",
                      boxShadow: isComplete ? "0 2px 0 #059669" : "0 2px 0 #D1D5DB",
                    }}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <Star className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm ${isComplete ? "text-emerald-700" : "text-gray-800"}`}>
                      {mission.mission_title}
                    </h3>
                    {mission.mission_description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {mission.mission_description}
                      </p>
                    )}

                    {/* Progress bar */}
                    <div className="mt-2">
                      <div 
                        className="h-2 rounded-full overflow-hidden"
                        style={{ 
                          background: isComplete ? "#A7F3D0" : "#E5E7EB",
                          boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="h-full rounded-full"
                          style={{
                            background: isComplete
                              ? "linear-gradient(90deg, #10B981 0%, #34D399 100%)"
                              : "linear-gradient(90deg, #FBBF24 0%, #F59E0B 100%)",
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        {mission.current_progress}/{mission.target_value}
                      </p>
                    </div>
                  </div>

                  {/* Reward */}
                  <div className="flex-shrink-0 text-right">
                    {isComplete ? (
                      <motion.div 
                        className="flex items-center gap-1 text-emerald-600"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <div 
                        className="rounded-lg px-2 py-1"
                        style={{
                          background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                          boxShadow: "0 2px 0 #C4B5FD",
                        }}
                      >
                        <span className="text-xs font-bold text-purple-700">
                          +{mission.reward_xp} XP
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </GameModal>
  );
}

export default MissionsModal;
