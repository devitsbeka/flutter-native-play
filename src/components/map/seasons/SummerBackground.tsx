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

      {/* Sun with rays - SVG */}
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
        <svg width="96" height="96" viewBox="0 0 96 96">
          {/* Sun rays */}
          {[...Array(12)].map((_, i) => (
            <motion.rect
              key={i}
              x="46"
              y="4"
              width="4"
              height="16"
              rx="2"
              fill="#fcd34d"
              transform={`rotate(${i * 30} 48 48)`}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
            />
          ))}
          {/* Sun body */}
          <circle cx="48" cy="48" r="24" fill="url(#sunGradient)" />
          <defs>
            <radialGradient id="sunGradient" cx="40%" cy="40%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#f97316" />
            </radialGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Beach/sand gradient at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/4"
        style={{
          background: "linear-gradient(180deg, transparent 0%, #fef3c7 50%, #fde68a 100%)"
        }}
      />

      {/* Ocean waves - SVG */}
      <div className="absolute bottom-1/4 left-0 right-0 h-32 overflow-hidden">
        <motion.svg
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <defs>
            <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <path
            d="M0 10 Q25 5, 50 10 T100 10 V20 H0 Z"
            fill="url(#oceanGradient)"
          />
        </motion.svg>
        {/* Foam line */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ background: "linear-gradient(180deg, white 0%, transparent 100%)" }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* SVG Palm trees */}
      <div className="absolute bottom-[26%] left-5">
        <PalmTreeSVG height={120} />
      </div>
      <div className="absolute bottom-[26%] right-8">
        <PalmTreeSVG height={100} />
      </div>

      {/* Beach umbrella */}
      <div className="absolute bottom-10 left-1/4">
        <UmbrellaSVG />
      </div>

      {/* Seashell */}
      <div className="absolute bottom-8 right-1/3">
        <SeashellSVG />
      </div>

      {/* Seagulls - SVG birds */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={`seagull-${i}`}
          className="absolute"
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
          <svg width="24" height="12" viewBox="0 0 24 12">
            <path
              d="M0 6 Q6 0, 12 6 Q18 0, 24 6"
              stroke="#374151"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </motion.div>
      ))}

      {/* Floating clouds - SVG */}
      {[1, 2].map((i) => (
        <motion.div
          key={`cloud-${i}`}
          className="absolute"
          style={{ left: `${i * 40}%`, top: `${10 + i * 5}%` }}
          animate={{ x: [0, 30, 0] }}
          transition={{ duration: 10 + i * 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <CloudSVG opacity={0.8} />
        </motion.div>
      ))}
    </div>
  );
}

function PalmTreeSVG({ height }: { height: number }) {
  return (
    <svg width={height * 0.6} height={height} viewBox="0 0 60 100" className="opacity-80">
      {/* Trunk */}
      <path
        d="M28 95 Q30 50, 32 30"
        stroke="#92400e"
        strokeWidth="6"
        fill="none"
      />
      <path
        d="M28 95 Q30 50, 32 30"
        stroke="#a16207"
        strokeWidth="3"
        fill="none"
      />
      {/* Leaves */}
      {[-60, -30, 0, 30, 60].map((angle, i) => (
        <path
          key={i}
          d="M30 30 Q45 20, 55 25"
          stroke="#22c55e"
          strokeWidth="4"
          fill="none"
          transform={`rotate(${angle} 30 30)`}
        />
      ))}
      {/* Coconuts */}
      <circle cx="30" cy="32" r="4" fill="#854d0e" />
      <circle cx="35" cy="35" r="3" fill="#713f12" />
    </svg>
  );
}

function UmbrellaSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="opacity-70">
      {/* Pole */}
      <line x1="24" y1="20" x2="24" y2="46" stroke="#713f12" strokeWidth="2" />
      {/* Umbrella top */}
      <path
        d="M4 22 A20 20 0 0 1 44 22"
        fill="url(#umbrellaGradient)"
      />
      {/* Stripes */}
      <path d="M12 22 A20 20 0 0 1 24 8" fill="#ef4444" />
      <path d="M24 8 A20 20 0 0 1 36 22" fill="#fbbf24" />
      <defs>
        <linearGradient id="umbrellaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SeashellSVG() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="opacity-60">
      <path
        d="M12 2 C6 2 2 10 2 16 C2 20 6 22 12 22 C18 22 22 20 22 16 C22 10 18 2 12 2"
        fill="#fecdd3"
        stroke="#f9a8d4"
        strokeWidth="1"
      />
      {/* Ridges */}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M12 4 Q${8 + i * 2} 12, ${6 + i * 3} 20`}
          stroke="#f9a8d4"
          strokeWidth="0.5"
          fill="none"
        />
      ))}
    </svg>
  );
}

function CloudSVG({ opacity }: { opacity: number }) {
  return (
    <svg width="80" height="40" viewBox="0 0 80 40" style={{ opacity }}>
      <ellipse cx="25" cy="25" rx="20" ry="15" fill="white" />
      <ellipse cx="45" cy="20" rx="25" ry="18" fill="white" />
      <ellipse cx="65" cy="25" rx="15" ry="12" fill="white" />
    </svg>
  );
}