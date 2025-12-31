import { motion, AnimatePresence } from "framer-motion";
import { Snowflake, Clock, Sparkles } from "lucide-react";
import { PowerUpType } from "@/hooks/useUserPowerUps";

interface PowerUpDemoPreviewProps {
  type: PowerUpType;
  animationKey: number;
}

const DEMO_ANSWERS = [
  { label: "ა", text: "პარიზი" },
  { label: "ბ", text: "ლონდონი" },
  { label: "გ", text: "ბერლინი" },
  { label: "დ", text: "მადრიდი" },
];

export function PowerUpDemoPreview({ type, animationKey }: PowerUpDemoPreviewProps) {
  return (
    <div className="relative w-full h-[280px] flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${type}-${animationKey}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
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
    <div className="flex flex-col gap-2 px-4">
      {DEMO_ANSWERS.map((answer, index) => {
        const isRemoved = index === 1 || index === 3;
        return (
          <motion.div
            key={answer.label}
            initial={{ opacity: 1, scale: 1, x: 0 }}
            animate={
              isRemoved
                ? {
                    opacity: [1, 1, 0.3],
                    scale: [1, 1, 0.95],
                    x: [0, 0, 10],
                  }
                : {
                    boxShadow: [
                      "0 0 0 0 rgba(251, 191, 36, 0)",
                      "0 0 0 0 rgba(251, 191, 36, 0)",
                      "0 0 20px 4px rgba(251, 191, 36, 0.4)",
                    ],
                  }
            }
            transition={{ duration: 2, delay: 0.5, times: [0, 0.3, 1] }}
            className={`relative flex items-center gap-3 p-3 rounded-xl border ${
              isRemoved
                ? "bg-white/5 border-white/10"
                : "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30"
            }`}
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white font-bold text-sm">
              {answer.label}
            </span>
            <span className="text-white font-medium">{answer.text}</span>
            {isRemoved && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3, delay: 1.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-[80%] h-0.5 bg-red-500/60 rounded-full" />
              </motion.div>
            )}
          </motion.div>
        );
      })}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="text-center text-amber-400 font-medium mt-2 text-sm"
      >
        ✨ ორი არასწორი პასუხი წაიშალა!
      </motion.p>
    </div>
  );
}

function FreezeDemo() {
  return (
    <div className="flex flex-col items-center gap-4 px-4">
      {/* Opponent avatar with freeze effect */}
      <div className="relative">
        <motion.div
          animate={{
            filter: [
              "brightness(1) saturate(1)",
              "brightness(1) saturate(1)",
              "brightness(1.2) saturate(0.5)",
            ],
          }}
          transition={{ duration: 2, delay: 0.5, times: [0, 0.3, 1] }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl"
        >
          🤖
        </motion.div>
        
        {/* Ice crystals */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
          className="absolute -inset-4"
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 1], scale: [0, 1.2, 1] }}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
              className="absolute"
              style={{
                left: `${50 + 45 * Math.cos((i * Math.PI) / 4)}%`,
                top: `${50 + 45 * Math.sin((i * Math.PI) / 4)}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <Snowflake className="w-4 h-4 text-cyan-400" />
            </motion.div>
          ))}
        </motion.div>

        {/* Frost overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.8 }}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/40 to-blue-500/40 backdrop-blur-[1px]"
        />
      </div>

      {/* Frozen timer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30"
      >
        <Snowflake className="w-4 h-4 text-cyan-400" />
        <span className="text-cyan-400 font-mono font-bold">5:00</span>
        <span className="text-cyan-300 text-sm">გაყინული</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="text-center text-cyan-400 font-medium text-sm"
      >
        ❄️ მოწინააღმდეგე გაყინულია 5 წამით!
      </motion.p>
    </div>
  );
}

function ReplaceDemo() {
  return (
    <div className="flex flex-col gap-2 px-4">
      {DEMO_ANSWERS.map((answer, index) => {
        const isReplaced = index === 2;
        return (
          <motion.div
            key={answer.label}
            className="relative flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10 overflow-hidden"
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white font-bold text-sm">
              {answer.label}
            </span>
            
            {isReplaced ? (
              <div className="relative flex-1">
                {/* Old answer fading out */}
                <motion.span
                  initial={{ opacity: 1 }}
                  animate={{ opacity: [1, 1, 0] }}
                  transition={{ duration: 1.5, delay: 0.5, times: [0, 0.3, 1] }}
                  className="text-white font-medium absolute"
                >
                  {answer.text}
                </motion.span>
                {/* New answer fading in */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0, 1] }}
                  transition={{ duration: 1.5, delay: 0.5, times: [0, 0.5, 1] }}
                  className="text-emerald-400 font-medium"
                >
                  რომი
                </motion.span>
                
                {/* Magic sparkles */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </motion.div>
              </div>
            ) : (
              <span className="text-white font-medium">{answer.text}</span>
            )}

            {isReplaced && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ 
                  scaleX: [0, 1, 1, 0],
                  opacity: [0, 1, 1, 0]
                }}
                transition={{ duration: 1.5, delay: 0.5, times: [0, 0.2, 0.8, 1] }}
                className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-emerald-500/30 to-emerald-500/20 origin-left"
              />
            )}
          </motion.div>
        );
      })}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
        className="text-center text-emerald-400 font-medium mt-2 text-sm"
      >
        🔄 არასწორი პასუხი შეიცვალა!
      </motion.p>
    </div>
  );
}

function TimeDrainDemo() {
  return (
    <div className="flex flex-col items-center gap-6 px-4">
      {/* Timer display */}
      <div className="relative">
        <motion.div
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(168, 85, 247, 0)",
              "0 0 0 0 rgba(168, 85, 247, 0)",
              "0 0 30px 8px rgba(168, 85, 247, 0.4)",
            ],
          }}
          transition={{ duration: 2, delay: 0.5, times: [0, 0.3, 1] }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center border-4 border-purple-400/50"
        >
          <div className="flex items-center gap-1">
            <Clock className="w-5 h-5 text-white/80" />
            <motion.span
              className="text-3xl font-bold text-white font-mono"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
            >
              <motion.span
                initial={{ opacity: 1 }}
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.3, delay: 1 }}
                style={{ position: "absolute" }}
              >
                07
              </motion.span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1] }}
                transition={{ duration: 0.3, delay: 1 }}
              >
                10
              </motion.span>
            </motion.span>
          </div>
        </motion.div>

        {/* +3 floating animation */}
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            y: [0, -20, -40, -60],
            scale: [0.5, 1.2, 1, 0.8]
          }}
          transition={{ duration: 1.5, delay: 0.8, times: [0, 0.2, 0.6, 1] }}
          className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-purple-500 text-white font-bold text-lg"
        >
          +3
        </motion.div>

        {/* Swirling particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              rotate: [0, 180],
            }}
            transition={{
              duration: 1.5,
              delay: 0.8 + i * 0.1,
              repeat: Infinity,
              repeatDelay: 2,
            }}
            className="absolute w-2 h-2 rounded-full bg-violet-400"
            style={{
              left: `${50 + 60 * Math.cos((i * Math.PI) / 3)}%`,
              top: `${50 + 60 * Math.sin((i * Math.PI) / 3)}%`,
            }}
          />
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="text-center text-purple-400 font-medium text-sm"
      >
        ⏱️ დამატებულია 3 წამი!
      </motion.p>
    </div>
  );
}
