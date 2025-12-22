import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  type: number;
}

export function WinterBackground() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    const newSnowflakes: Snowflake[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 10,
      size: 8 + Math.random() * 16,
      opacity: 0.4 + Math.random() * 0.6,
      type: Math.floor(Math.random() * 3),
    }));
    setSnowflakes(newSnowflakes);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Cold gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #1e3a5f 0%, #3b82f6 30%, #93c5fd 60%, #dbeafe 100%)"
        }}
      />

      {/* Aurora effect */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1/3 opacity-30"
        style={{
          background: "linear-gradient(90deg, #22d3ee 0%, #a855f7 50%, #22d3ee 100%)",
          filter: "blur(40px)",
        }}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      {/* Snow ground */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/4"
        style={{
          background: "linear-gradient(180deg, transparent 0%, #f8fafc 30%, #ffffff 100%)"
        }}
      />

      {/* Falling snowflakes - SVG */}
      {snowflakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="absolute"
          style={{ 
            left: `${flake.x}%`, 
            top: -20,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
          }}
          initial={{ y: -30, opacity: 0 }}
          animate={{
            y: "110vh",
            opacity: [0, flake.opacity, flake.opacity, 0],
            x: [0, 15, -10, 5, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: flake.duration,
            delay: flake.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <SnowflakeSVG type={flake.type} />
        </motion.div>
      ))}

      {/* Twinkling stars */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute"
          style={{
            left: `${5 + (i * 6.5) % 95}%`,
            top: `${5 + (i * 2.3) % 40}%`,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 2 + (i % 3),
            delay: (i % 5) * 0.4,
            repeat: Infinity,
          }}
        >
          <StarSVG size={6 + (i % 3) * 2} />
        </motion.div>
      ))}

      {/* Snowy pine trees - SVG */}
      <div className="absolute bottom-5 left-5">
        <SnowyTreeSVG height={100} hasSnow />
      </div>
      <div className="absolute bottom-10 right-10">
        <SnowyTreeSVG height={80} hasSnow />
      </div>
      <div className="absolute bottom-8 left-1/4">
        <SnowyTreeSVG height={70} hasSnow />
      </div>

      {/* Snowman */}
      <div className="absolute bottom-3 left-1/3">
        <SnowmanSVG />
      </div>

      {/* Icicles at top */}
      <div className="absolute top-0 left-0 right-0 flex justify-around">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`icicle-${i}`}
            animate={{ opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
          >
            <IcicleSVG height={20 + (i % 4) * 10} />
          </motion.div>
        ))}
      </div>

      {/* Mountains in distance */}
      <div className="absolute bottom-8 right-5">
        <MountainSVG />
      </div>
    </div>
  );
}

function SnowflakeSVG({ type }: { type: number }) {
  if (type === 0) {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        {[0, 60, 120].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 12 12)`}>
            <line x1="12" y1="2" x2="12" y2="22" stroke="white" strokeWidth="1.5" />
            <line x1="12" y1="5" x2="8" y2="8" stroke="white" strokeWidth="1" />
            <line x1="12" y1="5" x2="16" y2="8" stroke="white" strokeWidth="1" />
            <line x1="12" y1="19" x2="8" y2="16" stroke="white" strokeWidth="1" />
            <line x1="12" y1="19" x2="16" y2="16" stroke="white" strokeWidth="1" />
          </g>
        ))}
      </svg>
    );
  }
  if (type === 1) {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="12" r="3" fill="white" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line
            key={angle}
            x1="12"
            y1="12"
            x2={12 + Math.cos((angle * Math.PI) / 180) * 10}
            y2={12 + Math.sin((angle * Math.PI) / 180) * 10}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <circle cx="12" cy="12" r="10" fill="white" opacity="0.8" />
    </svg>
  );
}

function StarSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="2" fill="white" />
      <line x1="6" y1="0" x2="6" y2="12" stroke="white" strokeWidth="0.5" opacity="0.5" />
      <line x1="0" y1="6" x2="12" y2="6" stroke="white" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

function SnowyTreeSVG({ height, hasSnow }: { height: number; hasSnow: boolean }) {
  return (
    <svg width={height * 0.6} height={height} viewBox="0 0 60 100">
      {/* Trunk */}
      <rect x="26" y="70" width="8" height="30" fill="#78350f" />
      {/* Tree layers */}
      <polygon points="30,5 10,40 50,40" fill="#166534" />
      <polygon points="30,25 8,60 52,60" fill="#15803d" />
      <polygon points="30,45 5,85 55,85" fill="#166534" />
      {/* Snow on tree */}
      {hasSnow && (
        <>
          <polygon points="30,5 20,25 40,25" fill="white" opacity="0.9" />
          <ellipse cx="15" cy="50" rx="8" ry="4" fill="white" opacity="0.8" />
          <ellipse cx="45" cy="50" rx="8" ry="4" fill="white" opacity="0.8" />
          <ellipse cx="10" cy="75" rx="10" ry="5" fill="white" opacity="0.7" />
          <ellipse cx="50" cy="75" rx="10" ry="5" fill="white" opacity="0.7" />
        </>
      )}
    </svg>
  );
}

function SnowmanSVG() {
  return (
    <svg width="36" height="48" viewBox="0 0 36 48">
      {/* Bottom ball */}
      <circle cx="18" cy="38" r="10" fill="white" />
      {/* Middle ball */}
      <circle cx="18" cy="24" r="8" fill="white" />
      {/* Head */}
      <circle cx="18" cy="12" r="6" fill="white" />
      {/* Eyes */}
      <circle cx="16" cy="10" r="1" fill="#1f2937" />
      <circle cx="20" cy="10" r="1" fill="#1f2937" />
      {/* Nose (carrot) */}
      <polygon points="18,12 18,14 24,13" fill="#f97316" />
      {/* Buttons */}
      <circle cx="18" cy="22" r="1" fill="#1f2937" />
      <circle cx="18" cy="26" r="1" fill="#1f2937" />
      {/* Arms */}
      <line x1="10" y1="24" x2="2" y2="20" stroke="#78350f" strokeWidth="2" />
      <line x1="26" y1="24" x2="34" y2="20" stroke="#78350f" strokeWidth="2" />
      {/* Hat */}
      <rect x="12" y="4" width="12" height="2" fill="#1f2937" />
      <rect x="14" y="0" width="8" height="5" fill="#1f2937" />
    </svg>
  );
}

function IcicleSVG({ height }: { height: number }) {
  return (
    <svg width="12" height={height} viewBox={`0 0 12 ${height}`}>
      <defs>
        <linearGradient id="icicleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <polygon points={`6,${height} 0,0 12,0`} fill="url(#icicleGrad)" />
    </svg>
  );
}

function MountainSVG() {
  return (
    <svg width="48" height="36" viewBox="0 0 48 36" className="opacity-50">
      {/* Main mountain */}
      <polygon points="24,0 0,36 48,36" fill="#475569" />
      {/* Snow cap */}
      <polygon points="24,0 16,12 32,12" fill="white" />
      {/* Secondary peak */}
      <polygon points="38,8 24,36 48,36" fill="#334155" opacity="0.8" />
      <polygon points="38,8 34,14 42,14" fill="white" opacity="0.9" />
    </svg>
  );
}