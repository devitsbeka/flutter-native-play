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
          className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-center text-white/50 line-through"
        >
          ლონდონი
        </motion.div>
        <motion.div
          animate={{ boxShadow: ["0 0 0 rgba(251,191,36,0)", "0 0 15px rgba(251,191,36,0.4)"] }}
          transition={{ delay: 1, duration: 0.5 }}
          className="flex-1 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-center text-white font-medium"
        >
          პარიზი ✓
        </motion.div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-amber-400 text-sm"
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
        className="relative w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center"
      >
        <span className="text-2xl">🤖</span>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="absolute -top-1 -right-1"
        >
          <Snowflake className="w-5 h-5 text-cyan-400" />
        </motion.div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-cyan-400 text-sm"
      >
        ❄️ გაყინულია 5 წმ
      </motion.p>
    </div>
  );
}

function ReplaceDemo() {
  return (
    <div className="flex flex-col items-center gap-3 px-6">
      <motion.div className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-center overflow-hidden">
        <motion.span
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="text-white/50 absolute"
        >
          ბერლინი
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.3 }}
          className="text-emerald-400 font-medium"
        >
          რომი ✓
        </motion.span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-emerald-400 text-sm"
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
        animate={{ boxShadow: ["0 0 0 rgba(168,85,247,0)", "0 0 20px rgba(168,85,247,0.5)"] }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="w-16 h-16 rounded-full bg-purple-600/30 flex items-center justify-center border-2 border-purple-400/50"
      >
        <Clock className="w-6 h-6 text-purple-300 mr-1" />
        <motion.span
          className="text-xl font-bold text-white font-mono"
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
        className="text-purple-400 text-sm"
      >
        ⏱️ +3 წამი
      </motion.p>
    </div>
  );
}
