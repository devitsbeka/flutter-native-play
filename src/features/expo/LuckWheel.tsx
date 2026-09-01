import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Sparkles } from "lucide-react";
import { CoinIcon } from "./CoinIcon";

/**
 * "Test Your Luck": the prize wheel that appears after some levels.
 *
 * Six wedges — hints and coins — and one spin. The wedge under the golden
 * pointer at the top when the wheel stops is the prize. The result is chosen
 * before the wheel moves and the wheel is animated to land on it, which is
 * what every prize wheel does and the only way the animation and the prize
 * are guaranteed to agree.
 */

import { describePrize, type Prize } from "./prizes";

export type { Prize };

interface Wedge {
  color: string;
  prize: Prize;
}

const WEDGES: Wedge[] = [
  { color: "#2F6FE0", prize: { kind: "hints", amount: 1 } },
  { color: "#E8479B", prize: { kind: "hints", amount: 3 } },
  { color: "#E63946", prize: { kind: "coins", amount: 25 } },
  { color: "#F4C542", prize: { kind: "hints", amount: 1 } },
  { color: "#4CB944", prize: { kind: "coins", amount: 50 } },
  { color: "#7B3FBF", prize: { kind: "coins", amount: 10 } },
];

// Cheap prizes come up more than rich ones.
const WEIGHTS = [22, 8, 20, 22, 8, 20];

function pickWedge(random: () => number): number {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < WEIGHTS.length; i++) {
    roll -= WEIGHTS[i];
    if (roll < 0) return i;
  }
  return WEIGHTS.length - 1;
}

function WedgeIcon({ prize }: { prize: Prize }) {
  if (prize.kind === "hints") {
    return prize.amount > 1 ? (
      <Sparkles className="h-9 w-9 text-white" strokeWidth={2.4} fill="white" />
    ) : (
      <Lightbulb className="h-10 w-10 text-white" strokeWidth={2.4} fill="white" />
    );
  }
  if (prize.amount >= 50) {
    return (
      <div className="relative h-11 w-11">
        <CoinIcon size={30} className="absolute left-0 top-3" />
        <CoinIcon size={30} className="absolute left-3 top-0" />
      </div>
    );
  }
  if (prize.amount >= 25) {
    return (
      <div className="relative h-11 w-11">
        <CoinIcon size={30} className="absolute left-1 top-3" />
        <CoinIcon size={30} className="absolute left-3 top-0" />
      </div>
    );
  }
  return <CoinIcon size={40} />;
}

interface Props {
  size: number;
  onDone: (prize: Prize) => void;
  random?: () => number;
}

export function LuckWheel({ size, onDone, random = Math.random }: Props) {
  const [rotation, setRotation] = useState(0);
  const [state, setState] = useState<"idle" | "spinning" | "landed">("idle");
  const [prize, setPrize] = useState<Prize | null>(null);

  const wedge = 360 / WEDGES.length;
  const conic = `conic-gradient(${WEDGES.map(
    (w, i) => `${w.color} ${i * wedge}deg ${(i + 1) * wedge}deg`,
  ).join(", ")})`;

  const spin = () => {
    if (state !== "idle") return;
    const k = pickWedge(random);
    const jitter = (random() - 0.5) * (wedge * 0.6);
    // The pointer is at the top. Wedge k sits at k*60..(k+1)*60 clockwise
    // from the top, so turning the wheel by 360-(centre of k) brings it under
    // the pointer; the extra turns are for show.
    const target = 360 * 5 + (360 - (k * wedge + wedge / 2)) + jitter;
    setPrize(WEDGES[k].prize);
    setState("spinning");
    setRotation(target);
  };

  const radius = size / 2;
  const iconRadius = radius * 0.64;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Rim */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "#1F3F8F",
            boxShadow: "0 0 0 4px rgba(255,255,255,0.9), 0 0 40px rgba(255,255,255,0.35), 0 12px 40px rgba(0,0,0,0.45)",
          }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ inset: size * 0.045, background: conic, boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.85)" }}
          animate={{ rotate: rotation }}
          transition={{ duration: state === "spinning" ? 4.2 : 0, ease: [0.12, 0.8, 0.12, 1] }}
          onAnimationComplete={() => {
            if (state === "spinning") setState("landed");
          }}
        >
          {WEDGES.map((w, i) => {
            const angle = ((i * wedge + wedge / 2 - 90) * Math.PI) / 180;
            const inner = size / 2 - size * 0.045;
            const x = inner + iconRadius * Math.cos(angle);
            const y = inner + iconRadius * Math.sin(angle);
            return (
              <div
                key={i}
                className="absolute flex items-center justify-center"
                style={{ left: x - 24, top: y - 24, width: 48, height: 48 }}
              >
                <WedgeIcon prize={w.prize} />
              </div>
            );
          })}
        </motion.div>

        {/* Hub and pointer */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: size * 0.16, height: size * 0.16 }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: -size * 0.11,
              width: 0,
              height: 0,
              borderLeft: `${size * 0.045}px solid transparent`,
              borderRight: `${size * 0.045}px solid transparent`,
              borderBottom: `${size * 0.13}px solid #F4C542`,
              filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.35))",
            }}
          />
          <CoinIcon size={size * 0.16} className="absolute inset-0 shadow-lg" />
        </div>
      </div>

      <div className="mt-8 h-16 flex items-center justify-center">
        {state === "landed" && prize ? (
          <motion.button
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => onDone(prize)}
            className="rounded-[18px] px-10 py-3.5 text-[26px] font-bold text-white"
            style={{
              background: "linear-gradient(180deg,#5BD35B 0%,#2FA33A 100%)",
              boxShadow: "0 5px 0 #1E7A2A, 0 10px 24px rgba(0,0,0,0.35)",
              fontFamily: "var(--font-body)",
            }}
          >
            Collect {describePrize(prize)}
          </motion.button>
        ) : (
          <button
            onClick={spin}
            disabled={state !== "idle"}
            className="rounded-[18px] px-12 py-3.5 text-[30px] font-bold text-white disabled:opacity-60"
            style={{
              background: "linear-gradient(180deg,#5BD35B 0%,#2FA33A 100%)",
              boxShadow: "0 5px 0 #1E7A2A, 0 10px 24px rgba(0,0,0,0.35)",
              fontFamily: "var(--font-body)",
            }}
          >
            {state === "spinning" ? "Spinning…" : "Spin Now"}
          </button>
        )}
      </div>
    </div>
  );
}
