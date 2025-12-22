import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Leaf {
  id: number;
  x: number;
  delay: number;
  duration: number;
  type: "maple" | "oak" | "round";
  color: string;
  rotation: number;
  size: number;
}

const leafColors = ["#ea580c", "#dc2626", "#f59e0b", "#b91c1c", "#c2410c"];

export function AutumnBackground() {
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  useEffect(() => {
    const types: ("maple" | "oak" | "round")[] = ["maple", "oak", "round"];
    const newLeaves: Leaf[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 8,
      type: types[Math.floor(Math.random() * types.length)],
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
      rotation: Math.random() * 360,
      size: 16 + Math.random() * 12,
    }));
    setLeaves(newLeaves);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Warm gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #fed7aa 0%, #fdba74 30%, #fb923c 60%, #ea580c 100%)"
        }}
      />

      {/* Misty overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: "linear-gradient(180deg, transparent 0%, #fef3c7 50%, transparent 100%)"
        }}
      />

      {/* Falling leaves - SVG */}
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          className="absolute"
          style={{ left: `${leaf.x}%`, top: -30, width: leaf.size, height: leaf.size }}
          initial={{ y: -50, rotate: leaf.rotation, opacity: 0 }}
          animate={{
            y: "110vh",
            rotate: leaf.rotation + 720,
            opacity: [0, 1, 1, 0],
            x: [0, 40, -30, 20, -10, 0],
          }}
          transition={{
            duration: leaf.duration,
            delay: leaf.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <LeafSVG type={leaf.type} color={leaf.color} />
        </motion.div>
      ))}

      {/* Trees silhouettes - SVG */}
      <div className="absolute bottom-0 left-5">
        <TreeSVG height={140} opacity={0.6} color="#78350f" />
      </div>
      <div className="absolute bottom-0 right-10">
        <PineTreeSVG height={120} opacity={0.5} />
      </div>
      <div className="absolute bottom-10 left-1/4">
        <TreeSVG height={100} opacity={0.4} color="#92400e" />
      </div>

      {/* Pumpkins - SVG */}
      <div className="absolute bottom-5 left-1/3">
        <PumpkinSVG size={48} />
      </div>
      <div className="absolute bottom-8 right-1/4">
        <PumpkinSVG size={36} />
      </div>

      {/* Acorns and mushrooms */}
      <div className="absolute bottom-3 left-1/2">
        <AcornSVG />
      </div>
      <div className="absolute bottom-5 right-1/3">
        <MushroomSVG />
      </div>

      {/* Wind effect - subtle moving lines */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={`wind-${i}`}
          className="absolute h-px"
          style={{ 
            left: 0, 
            right: 0, 
            top: `${20 + i * 20}%`,
            height: 2,
            background: "linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), transparent)",
          }}
          animate={{ 
            x: ["-100%", "100%"],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 4 + i,
            delay: i * 0.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Cozy cabin in distance */}
      <div className="absolute bottom-20 right-5">
        <CabinSVG />
      </div>
    </div>
  );
}

function LeafSVG({ type, color }: { type: "maple" | "oak" | "round"; color: string }) {
  if (type === "maple") {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow">
        <path
          d="M12 2 L14 8 L20 6 L16 10 L22 12 L16 14 L20 18 L14 16 L12 22 L10 16 L4 18 L8 14 L2 12 L8 10 L4 6 L10 8 Z"
          fill={color}
        />
        <line x1="12" y1="12" x2="12" y2="22" stroke="#78350f" strokeWidth="1" />
      </svg>
    );
  }
  if (type === "oak") {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow">
        <path
          d="M12 2 C8 4 6 8 8 12 C6 14 8 18 12 20 C16 18 18 14 16 12 C18 8 16 4 12 2"
          fill={color}
        />
        <line x1="12" y1="12" x2="12" y2="22" stroke="#78350f" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow">
      <ellipse cx="12" cy="10" rx="8" ry="8" fill={color} />
      <line x1="12" y1="10" x2="12" y2="22" stroke="#78350f" strokeWidth="1.5" />
    </svg>
  );
}

function TreeSVG({ height, opacity, color }: { height: number; opacity: number; color: string }) {
  return (
    <svg width={height * 0.7} height={height} viewBox="0 0 70 100" style={{ opacity }}>
      {/* Trunk */}
      <rect x="30" y="60" width="10" height="40" fill="#78350f" />
      {/* Foliage */}
      <ellipse cx="35" cy="40" rx="30" ry="35" fill={color} />
      <ellipse cx="35" cy="35" rx="25" ry="28" fill={color} opacity="0.8" />
    </svg>
  );
}

function PineTreeSVG({ height, opacity }: { height: number; opacity: number }) {
  return (
    <svg width={height * 0.5} height={height} viewBox="0 0 50 100" style={{ opacity }}>
      <rect x="22" y="70" width="6" height="30" fill="#78350f" />
      <polygon points="25,5 5,70 45,70" fill="#166534" />
      <polygon points="25,20 10,60 40,60" fill="#15803d" />
    </svg>
  );
}

function PumpkinSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      {/* Pumpkin body segments */}
      <ellipse cx="12" cy="30" rx="10" ry="14" fill="#ea580c" />
      <ellipse cx="24" cy="28" rx="12" ry="16" fill="#f97316" />
      <ellipse cx="36" cy="30" rx="10" ry="14" fill="#ea580c" />
      {/* Stem */}
      <path d="M24 14 Q26 8 22 6" stroke="#166534" strokeWidth="3" fill="none" />
      {/* Highlight */}
      <ellipse cx="18" cy="24" rx="3" ry="6" fill="#fdba74" opacity="0.5" />
    </svg>
  );
}

function AcornSVG() {
  return (
    <svg width="24" height="28" viewBox="0 0 24 28">
      {/* Cap */}
      <ellipse cx="12" cy="8" rx="10" ry="6" fill="#78350f" />
      <path d="M2 8 Q2 12 12 14 Q22 12 22 8" fill="#92400e" />
      {/* Body */}
      <ellipse cx="12" cy="18" rx="8" ry="10" fill="#a16207" />
      <ellipse cx="10" cy="16" rx="2" ry="4" fill="#ca8a04" opacity="0.5" />
    </svg>
  );
}

function MushroomSVG() {
  return (
    <svg width="20" height="24" viewBox="0 0 20 24">
      {/* Stem */}
      <path d="M8 14 L7 24 L13 24 L12 14" fill="#fef3c7" />
      {/* Cap */}
      <ellipse cx="10" cy="10" rx="10" ry="8" fill="#dc2626" />
      {/* Spots */}
      <circle cx="6" cy="8" r="2" fill="white" />
      <circle cx="12" cy="6" r="1.5" fill="white" />
      <circle cx="14" cy="10" r="1" fill="white" />
    </svg>
  );
}

function CabinSVG() {
  return (
    <svg width="40" height="36" viewBox="0 0 40 36" className="opacity-50">
      {/* Roof */}
      <polygon points="20,2 2,16 38,16" fill="#78350f" />
      {/* Walls */}
      <rect x="6" y="16" width="28" height="18" fill="#92400e" />
      {/* Door */}
      <rect x="16" y="22" width="8" height="12" fill="#451a03" />
      {/* Window */}
      <rect x="28" y="20" width="6" height="6" fill="#fef08a" />
      {/* Chimney */}
      <rect x="28" y="4" width="6" height="12" fill="#78350f" />
    </svg>
  );
}