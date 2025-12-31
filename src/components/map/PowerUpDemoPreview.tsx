import { motion, AnimatePresence } from "framer-motion";
import { Snowflake, Clock } from "lucide-react";
import { PowerUpType } from "@/hooks/useUserPowerUps";

interface PowerUpDemoPreviewProps {
  type: PowerUpType;
  animationKey: number;
}

export function PowerUpDemoPreview({ type, animationKey }: PowerUpDemoPreviewProps) {
  return (
    <div className="relative w-full h-[200px] flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${type}-${animationKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          {type === "5050" && <FiftyFiftyDemo />}
          {type === "freeze" && <FreezeDemo />}
          {type === "replace" && <ReplaceDemo />}
          {type === "time-drain" && <TimeDrainDemo />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FiftyFiftyDemo() {
  return (
    <div className="flex flex-col items-center gap-3 px-6">
      <div className="flex gap-3 w-full">
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="flex-1 p-3 text-center text-white/50 line-through drop-shadow-lg"
        >
          ლონდონი
        </motion.div>
        <motion.div
          animate={{ textShadow: ["0 0 0 rgba(251,191,36,0)", "0 0 20px rgba(251,191,36,0.8)"] }}
          transition={{ delay: 1, duration: 0.5 }}
          className="flex-1 p-3 text-center text-amber-400 font-medium drop-shadow-lg"
        >
          პარიზი ✓
        </motion.div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-amber-400 text-sm drop-shadow-lg"
      >
        2 პასუხი წაიშალა
      </motion.p>
    </div>
  );
}

function FreezeDemo() {
  return (
    <div className="flex flex-col items-center gap-4 px-6">
      <motion.div
        animate={{ filter: ["brightness(1)", "brightness(1.3) saturate(0.3)"] }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="relative flex items-center justify-center"
      >
        <span className="text-4xl drop-shadow-lg">🤖</span>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="absolute -top-1 -right-1"
        >
          <Snowflake className="w-6 h-6 text-cyan-400 drop-shadow-lg" />
        </motion.div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-cyan-400 text-sm drop-shadow-lg"
      >
        ❄️ გაყინულია 5 წმ
      </motion.p>
    </div>
  );
}

function ReplaceDemo() {
  return (
    <div className="flex flex-col items-center gap-3 px-6">
      <motion.div className="w-full p-3 text-center overflow-hidden relative">
        <motion.span
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="text-white/50 absolute left-1/2 -translate-x-1/2 drop-shadow-lg"
        >
          ბერლინი
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.3 }}
          className="text-emerald-400 font-medium drop-shadow-lg"
        >
          რომი ✓
        </motion.span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-emerald-400 text-sm drop-shadow-lg"
      >
        🔄 პასუხი შეიცვალა
      </motion.p>
    </div>
  );
}

function TimeDrainDemo() {
  return (
    <div className="flex flex-col items-center gap-4 px-6">
      <motion.div
        animate={{ textShadow: ["0 0 0 rgba(168,85,247,0)", "0 0 20px rgba(168,85,247,0.8)"] }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex items-center justify-center gap-1"
      >
        <Clock className="w-8 h-8 text-purple-400 drop-shadow-lg" />
        <motion.span
          className="text-2xl font-bold text-white font-mono relative drop-shadow-lg"
        >
          <motion.span
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.2 }}
            style={{ position: "absolute" }}
          >
            7
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.2 }}
          >
            10
          </motion.span>
        </motion.span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-purple-400 text-sm drop-shadow-lg"
      >
        ⏱️ +3 წამი
      </motion.p>
    </div>
  );
}
