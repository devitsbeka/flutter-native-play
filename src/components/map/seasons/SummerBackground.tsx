import { motion } from "framer-motion";

export function SummerBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #0ea5e9 0%, #38bdf8 30%, #7dd3fc 60%, #bae6fd 100%)"
        }}
      />

      {/* Sun */}
      <motion.div
        className="absolute top-10 right-10"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: 360,
        }}
        transition={{ 
          scale: { duration: 3, repeat: Infinity },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 shadow-2xl shadow-yellow-500/50" />
        {/* Sun rays */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-8 bg-yellow-300 rounded-full"
            style={{
              left: "50%",
              top: "50%",
              transformOrigin: "center 60px",
              transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </motion.div>

      {/* Beach/sand gradient at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/4"
        style={{
          background: "linear-gradient(180deg, transparent 0%, #fef3c7 50%, #fde68a 100%)"
        }}
      />

      {/* Ocean waves */}
      <div className="absolute bottom-1/4 left-0 right-0 h-32 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #0ea5e9 0%, #22d3ee 100%)",
            borderRadius: "100% 100% 0 0",
          }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Palm trees */}
      <div className="absolute bottom-1/4 left-5 text-6xl">🌴</div>
      <div className="absolute bottom-1/4 right-8 text-5xl">🌴</div>

      {/* Beach items */}
      <div className="absolute bottom-10 left-1/4 text-3xl">🏖️</div>
      <div className="absolute bottom-8 right-1/3 text-2xl">🐚</div>

      {/* Seagulls */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={`seagull-${i}`}
          className="absolute text-xl"
          style={{ left: `${10 + i * 20}%`, top: `${15 + i * 5}%` }}
          animate={{
            x: [0, 100, 200],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 10 + i * 3,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear",
          }}
        >
          🐦
        </motion.div>
      ))}

      {/* Floating clouds */}
      {[1, 2].map((i) => (
        <motion.div
          key={`cloud-${i}`}
          className="absolute text-6xl opacity-80"
          style={{ left: `${i * 40}%`, top: `${10 + i * 5}%` }}
          animate={{ x: [0, 30, 0] }}
          transition={{ duration: 10 + i * 5, repeat: Infinity, ease: "easeInOut" }}
        >
          ☁️
        </motion.div>
      ))}
    </div>
  );
}
